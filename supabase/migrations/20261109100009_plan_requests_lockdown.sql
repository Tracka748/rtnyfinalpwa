-- Part 0: plan_requests lockdown, lifecycle CHECK, coordinator FK RESTRICT
begin;

-- 1. Routes are the only way in (service role). Browser roles lose all access.
revoke all on table public.plan_requests from anon, authenticated;

drop policy if exists "Users can insert own plan requests" on public.plan_requests;
drop policy if exists "Users can view own plan requests" on public.plan_requests;

-- 2. New lifecycle statuses (all 13 existing rows are 'pending').
alter table public.plan_requests drop constraint if exists plan_requests_status_check;
alter table public.plan_requests
  add constraint plan_requests_status_check
  check (status in ('pending','in_progress','date_confirmed','deposit_requested',
                    'deposit_received','completed','declined','cancelled'))
  not valid;
alter table public.plan_requests validate constraint plan_requests_status_check;
alter table public.plan_requests alter column status set not null;

-- 3. No silent unassignment: deleting a profile that owns requests is blocked.
alter table public.plan_requests drop constraint if exists plan_requests_coordinator_id_fkey;
alter table public.plan_requests
  add constraint plan_requests_coordinator_id_fkey
  foreign key (coordinator_id) references public.profiles(id)
  on delete restrict
  not valid;
alter table public.plan_requests validate constraint plan_requests_coordinator_id_fkey;

commit;
