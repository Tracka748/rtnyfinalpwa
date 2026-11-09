-- Part 2: request_notifications (in-app inbox + email outbox)
begin;

create table public.request_notifications (
  id                    uuid primary key default gen_random_uuid(),
  request_id            uuid not null references public.plan_requests(id) on delete cascade,
  audience              text not null check (audience in ('staff','customer')),
  recipient_user_id     uuid not null references public.profiles(id) on delete cascade,
  kind                  text not null check (kind in ('new_request','customer_confirmation',
                                                      'status_update','assigned','unclaimed_reminder')),
  dedupe_key            text not null check (dedupe_key ~ '^[a-z0-9_:.-]{1,80}$'),
  read_at               timestamptz,
  email_status          text not null default 'pending'
                          check (email_status in ('pending','sending','sent','failed','skipped')),
  email_attempts        int not null default 0 check (email_attempts >= 0),
  email_next_attempt_at timestamptz not null default now(),
  email_locked_until    timestamptz,
  email_sent_at         timestamptz,
  email_last_error      text check (email_last_error is null or email_last_error ~ '^[a-z0-9_]{1,48}$'),
  email_provider_id     text check (email_provider_id is null or length(email_provider_id) <= 128),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint request_notifications_dedupe unique (request_id, audience, recipient_user_id, dedupe_key),
  constraint request_notifications_read_staff_only check (audience = 'staff' or read_at is null)
);

create index request_notifications_staff_inbox_idx
  on public.request_notifications (recipient_user_id, created_at desc)
  where audience = 'staff';
create index request_notifications_staff_unread_idx
  on public.request_notifications (recipient_user_id)
  where audience = 'staff' and read_at is null;
create index request_notifications_outbox_idx
  on public.request_notifications (email_next_attempt_at)
  where email_status in ('pending','sending');

alter table public.request_notifications enable row level security;
revoke all on table public.request_notifications from anon, authenticated;
grant select, insert, update, delete on table public.request_notifications to service_role;

-- Guard: eligible staff recipients, customer = requester, identity immutable
create or replace function public.request_notifications_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.audience = 'staff'
       and not public.specialist_can(new.recipient_user_id, 'events.requests.manage', 'allow') then
      raise exception 'staff recipient is not an eligible coordinator' using errcode = '42501';
    end if;
    if new.audience = 'customer'
       and not exists (select 1 from public.plan_requests r
                       where r.id = new.request_id and r.user_id = new.recipient_user_id) then
      raise exception 'customer recipient must be the requester' using errcode = '42501';
    end if;
  else
    if new.request_id        is distinct from old.request_id
       or new.audience          is distinct from old.audience
       or new.recipient_user_id is distinct from old.recipient_user_id
       or new.kind              is distinct from old.kind
       or new.dedupe_key        is distinct from old.dedupe_key
       or new.created_at        is distinct from old.created_at then
      raise exception 'notification identity is immutable' using errcode = '42501';
    end if;
    new.updated_at := now();
  end if;
  return new;
end $$;

revoke all on function public.request_notifications_guard() from public, anon, authenticated;

create trigger request_notifications_guard
  before insert or update on public.request_notifications
  for each row execute function public.request_notifications_guard();

-- Outbox: claim a batch for sending (lease-based, skip locked). Optional filter by request.
create or replace function public.request_notifications_claim_email(
  p_limit int default 20,
  p_request_id uuid default null
)
returns setof public.request_notifications
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Stale leases that already used every attempt become failed.
  update public.request_notifications
     set email_status = 'failed',
         email_last_error = 'lease_expired_max_attempts',
         email_locked_until = null
   where email_status = 'sending'
     and email_locked_until < now()
     and email_attempts >= 5;

  return query
  with picked as (
    select n.id
    from public.request_notifications n
    where (p_request_id is null or n.request_id = p_request_id)
      and n.email_attempts < 5
      and ((n.email_status = 'pending' and n.email_next_attempt_at <= now())
           or (n.email_status = 'sending' and n.email_locked_until < now()))
    order by n.email_next_attempt_at
    limit greatest(1, least(coalesce(p_limit, 20), 100))
    for update skip locked
  ),
  upd as (
    update public.request_notifications n
       set email_status = 'sending',
           email_attempts = n.email_attempts + 1,
           email_locked_until = now() + interval '10 minutes'
      from picked p
     where n.id = p.id
    returning n.*
  )
  select * from upd;
end $$;

-- Outbox: record the result of a send attempt. Returns false if the row was not in 'sending'.
create or replace function public.request_notifications_mark_email(
  p_id uuid,
  p_outcome text,
  p_error_code text default null,
  p_provider_message_id text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempts int;
begin
  if p_outcome is null or p_outcome not in ('sent','retry','failed','skipped') then
    raise exception 'invalid outcome' using errcode = '22023';
  end if;
  if p_error_code is not null and p_error_code !~ '^[a-z0-9_]{1,48}$' then
    raise exception 'invalid error code' using errcode = '22023';
  end if;
  if p_provider_message_id is not null and length(p_provider_message_id) > 128 then
    raise exception 'invalid provider id' using errcode = '22023';
  end if;

  select email_attempts into v_attempts
  from public.request_notifications
  where id = p_id and email_status = 'sending'
  for update;
  if not found then
    return false;
  end if;

  update public.request_notifications
     set email_status = case
           when p_outcome = 'retry' and v_attempts >= 5 then 'failed'
           when p_outcome = 'retry' then 'pending'
           else p_outcome end,
         email_next_attempt_at = case
           when p_outcome = 'retry' then now() + case v_attempts
             when 1 then interval '5 minutes'
             when 2 then interval '30 minutes'
             when 3 then interval '2 hours'
             else interval '6 hours' end
           else email_next_attempt_at end,
         email_sent_at = case when p_outcome = 'sent' then now() else email_sent_at end,
         email_provider_id = coalesce(p_provider_message_id, email_provider_id),
         email_last_error = case when p_outcome = 'sent' then null else p_error_code end,
         email_locked_until = null
   where id = p_id;

  return true;
end $$;

revoke all on function public.request_notifications_claim_email(int, uuid) from public, anon, authenticated;
revoke all on function public.request_notifications_mark_email(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.request_notifications_claim_email(int, uuid) to service_role;
grant execute on function public.request_notifications_mark_email(uuid, text, text, text) to service_role;

commit;
