-- Part 5: request_activity, unowned_since, invariants, single-writer + log-coverage triggers
begin;

-- 1. Append-only activity log (no FKs: history survives deletions)
create table public.request_activity (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null,
  actor_id    uuid not null,
  action      text not null check (action in ('claimed','assigned','reassigned','released',
                                              'unassigned','status_changed','reopened','note_added')),
  from_status text check (from_status is null or from_status in ('pending','in_progress','date_confirmed',
                'deposit_requested','deposit_received','completed','declined','cancelled')),
  to_status   text check (to_status is null or to_status in ('pending','in_progress','date_confirmed',
                'deposit_requested','deposit_received','completed','declined','cancelled')),
  from_owner  uuid,
  to_owner    uuid,
  reason      text check (reason is null or length(reason) between 1 and 500),
  note        text check (note is null or length(note) between 1 and 2000),
  txid        bigint not null default txid_current(),
  created_at  timestamptz not null default now(),
  constraint request_activity_reason_required
    check (action not in ('reassigned','released','unassigned','reopened') or reason is not null),
  constraint request_activity_note_required
    check (action <> 'note_added' or note is not null)
);
create index request_activity_request_idx on public.request_activity (request_id, created_at desc);
create index request_activity_txid_idx    on public.request_activity (txid, request_id);

create or replace function public.request_activity_append_only()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'request_activity is append-only' using errcode = '42501';
end $$;

create trigger request_activity_no_update_delete
  before update or delete on public.request_activity
  for each row execute function public.request_activity_append_only();
create trigger request_activity_no_truncate
  before truncate on public.request_activity
  for each statement execute function public.request_activity_append_only();

alter table public.request_activity enable row level security;
revoke all on table public.request_activity from public, anon, authenticated;
grant select on table public.request_activity to service_role;  -- writes happen only inside lifecycle functions

-- 2. unowned_since + invariants (backfill BEFORE the guard triggers exist)
alter table public.plan_requests add column unowned_since timestamptz default now();
update public.plan_requests set unowned_since = created_at where coordinator_id is null;

alter table public.plan_requests
  add constraint plan_requests_unowned_since_check
    check ((coordinator_id is null) = (unowned_since is not null)),
  add constraint plan_requests_pending_unowned_check
    check (status <> 'pending' or coordinator_id is null);

create index plan_requests_unowned_idx on public.plan_requests (unowned_since)
  where coordinator_id is null and status not in ('completed','declined','cancelled');

-- 3. Single writer: only lifecycle functions (role postgres + marker) may change these columns.
--    Invoker trigger function on purpose: current_user must reflect the executing role.
create or replace function public.plan_requests_lifecycle_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status is distinct from old.status
     or new.coordinator_id is distinct from old.coordinator_id
     or new.unowned_since is distinct from old.unowned_since then
    if current_user <> 'postgres'
       or coalesce(current_setting('rtny.lifecycle', true), '') <> 'on' then
      raise exception 'lifecycle fields can only be changed by lifecycle functions' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

create trigger plan_requests_lifecycle_guard
  before update on public.plan_requests
  for each row execute function public.plan_requests_lifecycle_guard();

-- 4. Log coverage: a protected-column change without an activity row from the same transaction fails the commit
create or replace function public.plan_requests_activity_coverage()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.request_activity a
                  where a.request_id = new.id and a.txid = txid_current()) then
    raise exception 'lifecycle change was not logged' using errcode = '42501';
  end if;
  return null;
end $$;

revoke all on function public.plan_requests_activity_coverage() from public, anon, authenticated;

create constraint trigger plan_requests_activity_coverage
  after update of status, coordinator_id, unowned_since on public.plan_requests
  deferrable initially deferred
  for each row
  when (old.status is distinct from new.status
        or old.coordinator_id is distinct from new.coordinator_id
        or old.unowned_since is distinct from new.unowned_since)
  execute function public.plan_requests_activity_coverage();

commit;


-- Part 5b
begin;
revoke all on table public.request_activity from service_role;
grant select on table public.request_activity to service_role;
commit;
