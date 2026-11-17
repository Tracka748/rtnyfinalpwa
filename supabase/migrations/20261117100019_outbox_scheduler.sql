-- Part 1C-a: stuck-lease recovery and the pg_net kick for the outbox worker route.
-- The cron jobs and the Vault secrets are NOT created here: they are set up by hand afterwards
-- (outbox_cron_setup.sql, with the secrets created in the Supabase Dashboard). No secret values
-- appear in this file.
begin;

-- Leases that expired (or a 'sending' row with no lease) go back to pending; rows that used all
-- 5 attempts become failed, exactly as the claim's own pre-step does. A lease is claim time plus
-- 10 minutes, so an expired lease means the row has been 'sending' for more than 10 minutes.
create or replace function public.request_notifications_recover_stuck()
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_failed int; v_reset int;
begin
  update public.request_notifications
     set email_status = 'failed', email_last_error = 'lease_expired_max_attempts', email_locked_until = null
   where email_status = 'sending'
     and (email_locked_until is null or email_locked_until < now())
     and email_attempts >= 5;
  get diagnostics v_failed = row_count;

  update public.request_notifications
     set email_status = 'pending', email_next_attempt_at = now(), email_locked_until = null,
         email_last_error = 'lease_expired'
   where email_status = 'sending'
     and (email_locked_until is null or email_locked_until < now())
     and email_attempts < 5;
  get diagnostics v_reset = row_count;

  return jsonb_build_object('reset', v_reset, 'failed', v_failed);
end $$;

revoke all on function public.request_notifications_recover_stuck() from public, anon, authenticated;
grant execute on function public.request_notifications_recover_stuck() to service_role;

-- Called by pg_cron every minute. Reads the base URL and secrets from Vault at run time, so the cron
-- command holds no secret. vercel_bypass_secret is optional (only needed while the target host sits
-- behind Vercel Deployment Protection). Returns the pg_net request id, or null (with a warning that
-- names no value) when not configured. pg_net only sends after the calling transaction commits.
create or replace function public.outbox_kick()
returns bigint
language plpgsql security definer set search_path = '' as $$
declare v_base text; v_secret text; v_bypass text; v_headers jsonb;
begin
  select decrypted_secret into v_base   from vault.decrypted_secrets where name = 'app_base_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'cron_secret';
  select decrypted_secret into v_bypass from vault.decrypted_secrets where name = 'vercel_bypass_secret';
  v_base := rtrim(btrim(coalesce(v_base, '')), '/');
  if v_base !~* '^https://[a-z0-9.-]+(:[0-9]{1,5})?$' or coalesce(length(btrim(v_secret)), 0) < 32 then
    raise warning 'outbox_kick: app_base_url or cron_secret is missing or invalid';
    return null;
  end if;
  v_headers := jsonb_build_object('Content-Type', 'application/json',
                                  'Authorization', 'Bearer ' || btrim(v_secret));
  if nullif(btrim(coalesce(v_bypass, '')), '') is not null then
    v_headers := v_headers || jsonb_build_object('x-vercel-protection-bypass', btrim(v_bypass));
  end if;
  return net.http_post(
    url := v_base || '/api/v1/internal/outbox/run',
    body := '{}'::jsonb,
    headers := v_headers,
    timeout_milliseconds := 60000);
end $$;

-- Only the owner (postgres, the role pg_cron jobs run as) may call it.
revoke all on function public.outbox_kick() from public, anon, authenticated, service_role;

commit;
