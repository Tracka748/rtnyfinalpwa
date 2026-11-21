-- Part 1C-b: 24-hour "waiting for an owner" reminder to admins.
-- One staff row per eligible admin per unowned period, keyed by the period start
-- (unowned_since as integer epoch microseconds). The outbox re-checks the request just before
-- sending. The cron job is NOT created here (outbox_reminder_cron_setup.sql, run by hand).
begin;

-- Assumptions this migration relies on (fail loudly instead of enqueuing wrong rows).
do $$
begin
  if not exists (select 1 from pg_constraint c
                 where c.conrelid = 'public.request_notifications'::regclass and c.contype = 'c'
                   and pg_get_constraintdef(c.oid) ~ '''unclaimed_reminder''') then
    raise exception 'request_notifications kind check does not allow unclaimed_reminder';
  end if;
  -- extract(epoch) must be exact numeric (PostgreSQL 14+) so the key keeps every microsecond.
  if (extract(epoch from timestamptz '2026-01-01 00:00:00.123456+00') * 1000000)::bigint
     <> 1767225600123456 then
    raise exception 'epoch microsecond key is not exact on this server';
  end if;
end $$;

create or replace function public.request_enqueue_unclaimed_reminders(
  p_created_after timestamptz default '2026-11-10 13:26:43+00')
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_rows int; v_requests int;
begin
  with due as (
    select r.id, r.unowned_since
    from public.plan_requests r
    where r.coordinator_id is null
      and r.unowned_since is not null
      and r.unowned_since <= now() - interval '24 hours'
      and r.status not in ('completed','declined','cancelled')
      and r.created_at >= p_created_after
  ), admins as (
    select e.coordinator_id as id
    from public.request_eligible_coordinators() e
    where e.is_admin
  ), ins as (
    insert into public.request_notifications (request_id, audience, recipient_user_id, kind, dedupe_key)
    select d.id, 'staff', a.id, 'unclaimed_reminder',
           'reminder_24h:' || ((extract(epoch from d.unowned_since) * 1000000)::bigint)::text
    from due d cross join admins a
    on conflict on constraint request_notifications_dedupe do nothing
    returning request_id
  )
  select count(*), count(distinct request_id) into v_rows, v_requests from ins;

  return jsonb_build_object('enqueued', v_rows, 'requests', v_requests);
end $$;

revoke all on function public.request_enqueue_unclaimed_reminders(timestamptz) from public, anon, authenticated;
grant execute on function public.request_enqueue_unclaimed_reminders(timestamptz) to service_role;

commit;
