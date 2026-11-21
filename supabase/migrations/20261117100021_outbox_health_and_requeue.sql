-- Part 1C-c: delivery health (counts only) and admin requeue for request_notifications.
-- No cron job and no Vault here. Counts and row ids only: no addresses, names or request content.
begin;

-- Who requeued what (counts only). Written only by the requeue functions below.
create table public.request_notification_admin_actions (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.profiles(id) on delete set null,
  action      text not null check (action in ('requeue_failed','requeue_app_url')),
  requested   int not null check (requested >= 0),
  requeued    int not null check (requeued >= 0),
  skipped     int not null check (skipped >= 0),
  created_at  timestamptz not null default now()
);
alter table public.request_notification_admin_actions enable row level security;
revoke all on table public.request_notification_admin_actions from anon, authenticated;
grant select on table public.request_notification_admin_actions to service_role;

create or replace function public.request_notifications_health()
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v jsonb; v_last_run timestamptz; v_cron boolean := true;
begin
  select jsonb_build_object(
    'pending',         count(*) filter (where email_status = 'pending'),
    'pending_due',     count(*) filter (where email_status = 'pending' and email_next_attempt_at <= now()),
    'sending',         count(*) filter (where email_status = 'sending'),
    'sending_expired', count(*) filter (where email_status = 'sending'
                                          and (email_locked_until is null or email_locked_until < now())),
    'failed_24h',      count(*) filter (where email_status = 'failed'  and updated_at >= now() - interval '24 hours'),
    'failed_7d',       count(*) filter (where email_status = 'failed'  and updated_at >= now() - interval '7 days'),
    'skipped_7d',      count(*) filter (where email_status = 'skipped' and updated_at >= now() - interval '7 days'),
    'sent_24h',        count(*) filter (where email_status = 'sent'    and email_sent_at >= now() - interval '24 hours'),
    'oldest_due_pending_s', floor(extract(epoch from now() - min(email_next_attempt_at)
                              filter (where email_status = 'pending' and email_next_attempt_at <= now())))::bigint,
    -- A lease is claim time + 10 minutes, so claim time = locked_until - 10 minutes.
    'oldest_sending_s', floor(extract(epoch from now() - min(email_locked_until - interval '10 minutes')
                              filter (where email_status = 'sending')))::bigint,
    'last_sent_at',    max(email_sent_at)
  ) into v
  from public.request_notifications;

  v := v || jsonb_build_object(
    'failed_by_error', coalesce((
      select jsonb_object_agg(code, n) from (
        select coalesce(email_last_error, 'none') as code, count(*) as n
        from public.request_notifications
        where email_status = 'failed' and updated_at >= now() - interval '7 days'
        group by 1) s), '{}'::jsonb),
    'skipped_by_error', coalesce((
      select jsonb_object_agg(code, n) from (
        select coalesce(email_last_error, 'none') as code, count(*) as n
        from public.request_notifications
        where email_status = 'skipped' and updated_at >= now() - interval '7 days'
        group by 1) s), '{}'::jsonb),
    'by_kind', coalesce((
      select jsonb_object_agg(kind, jsonb_build_object(
               'pending', pending, 'failed_7d', failed, 'skipped_7d', skipped, 'sent_24h', sent))
      from (
        select kind,
               count(*) filter (where email_status = 'pending') as pending,
               count(*) filter (where email_status = 'failed'  and updated_at >= now() - interval '7 days') as failed,
               count(*) filter (where email_status = 'skipped' and updated_at >= now() - interval '7 days') as skipped,
               count(*) filter (where email_status = 'sent'    and email_sent_at >= now() - interval '24 hours') as sent
        from public.request_notifications group by kind) k), '{}'::jsonb),
    'requeueable_ids', coalesce((
      select jsonb_agg(id order by updated_at desc) from (
        select n.id, n.updated_at
        from public.request_notifications n
        join public.plan_requests r on r.id = n.request_id
        where n.email_status = 'failed' and n.updated_at >= now() - interval '7 days'
          and r.status not in ('completed','declined','cancelled')
        order by n.updated_at desc
        limit 100) q), '[]'::jsonb),
    'requeueable_count', (
        select count(*)
        from public.request_notifications n
        join public.plan_requests r on r.id = n.request_id
        where n.email_status = 'failed' and n.updated_at >= now() - interval '7 days'
          and r.status not in ('completed','declined','cancelled')),
    'app_url_waiting', (
        select count(*)
        from public.request_notifications n
        join public.plan_requests r on r.id = n.request_id
        where n.email_status in ('pending','failed') and n.email_last_error = 'app_url_not_configured'
          and r.status not in ('completed','declined','cancelled'))
  );

  -- Last successful scheduler run. Null (and cron_readable false) when cron is not readable here.
  begin
    select max(d.end_time) into v_last_run
    from cron.job_run_details d
    join cron.job j on j.jobid = d.jobid
    where j.jobname = 'rtny-outbox-run' and d.status = 'succeeded';
  exception when insufficient_privilege or undefined_table or invalid_schema_name then
    v_cron := false;
    v_last_run := null;
  end;

  return v || jsonb_build_object('cron_readable', v_cron, 'last_run_ok_at', v_last_run, 'generated_at', now());
end $$;

-- Requeue chosen failed rows: back to pending with a fresh attempt budget. Only rows that are
-- 'failed' right now and whose request is still open; dedupe_key and identity never change.
create or replace function public.request_notifications_requeue(p_actor uuid, p_ids uuid[])
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_ids uuid[]; v_n int; v_req int;
begin
  if p_actor is null or not public.tp_is_admin(p_actor) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select coalesce(array_agg(distinct x), '{}'::uuid[]) into v_ids
  from unnest(coalesce(p_ids, '{}'::uuid[])) as x where x is not null;
  v_req := cardinality(v_ids);
  if v_req = 0 then raise exception 'no ids' using errcode = '22023'; end if;
  if v_req > 100 then raise exception 'too many ids' using errcode = '22023'; end if;

  update public.request_notifications n
     set email_status = 'pending', email_attempts = 0, email_next_attempt_at = now(),
         email_locked_until = null, email_last_error = null
    from public.plan_requests r
   where n.id = any (v_ids)
     and n.email_status = 'failed'
     and r.id = n.request_id
     and r.status not in ('completed','declined','cancelled');
  get diagnostics v_n = row_count;

  insert into public.request_notification_admin_actions (actor_id, action, requested, requeued, skipped)
  values (p_actor, 'requeue_failed', v_req, v_n, v_req - v_n);

  return jsonb_build_object('requested', v_req, 'requeued', v_n, 'skipped', v_req - v_n);
end $$;

-- After NEXT_PUBLIC_APP_URL is fixed: retry rows held by app_url_not_configured (a retry code, so
-- they are pending in backoff or failed after 5 attempts). Up to 100 per call; open requests only.
create or replace function public.request_notifications_requeue_app_url(p_actor uuid)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_n int; v_closed int; v_left int;
begin
  if p_actor is null or not public.tp_is_admin(p_actor) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  with picked as (
    select n.id
    from public.request_notifications n
    join public.plan_requests r on r.id = n.request_id
    where n.email_status in ('failed','pending')
      and n.email_last_error = 'app_url_not_configured'
      and r.status not in ('completed','declined','cancelled')
    order by n.updated_at
    limit 100
    for update of n skip locked
  )
  update public.request_notifications n
     set email_status = 'pending', email_attempts = 0, email_next_attempt_at = now(),
         email_locked_until = null, email_last_error = null
    from picked p
   where n.id = p.id
     and n.email_status in ('failed','pending')
     and n.email_last_error = 'app_url_not_configured';
  get diagnostics v_n = row_count;

  select count(*) filter (where r.status in ('completed','declined','cancelled')),
         count(*) filter (where r.status not in ('completed','declined','cancelled'))
    into v_closed, v_left
  from public.request_notifications n
  join public.plan_requests r on r.id = n.request_id
  where n.email_status in ('failed','pending') and n.email_last_error = 'app_url_not_configured';

  insert into public.request_notification_admin_actions (actor_id, action, requested, requeued, skipped)
  values (p_actor, 'requeue_app_url', v_n + v_closed, v_n, v_closed);

  return jsonb_build_object('requeued', v_n, 'skipped', v_closed, 'remaining', v_left);
end $$;

revoke all on function public.request_notifications_health() from public, anon, authenticated;
revoke all on function public.request_notifications_requeue(uuid, uuid[]) from public, anon, authenticated;
revoke all on function public.request_notifications_requeue_app_url(uuid) from public, anon, authenticated;
grant execute on function public.request_notifications_health() to service_role;
grant execute on function public.request_notifications_requeue(uuid, uuid[]) to service_role;
grant execute on function public.request_notifications_requeue_app_url(uuid) to service_role;

commit;
