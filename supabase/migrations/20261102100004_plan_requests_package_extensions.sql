-- plan_requests package columns + guard, feed_cards package link + guard, recipients, append-only quotes.
-- Already applied via Supabase SQL Editor on 2026-11-02; this file is the repo record.

alter table public.plan_requests
  add column request_source text not null default 'plan_my_event'
    check (request_source in ('plan_my_event','theme_package')),
  add column package_snapshot jsonb,
  add column coordinator_id uuid references public.profiles(id) on delete set null,
  add column fulfillment_mode text
    check (fulfillment_mode is null or fulfillment_mode in ('planner_only','partner_direct','hybrid'));

alter table public.plan_requests
  add constraint plan_requests_selected_package_fk
  foreign key (selected_package_id) references public.theme_package_versions(id) on delete restrict;

alter table public.plan_requests
  add constraint plan_requests_package_source_check
  check (request_source <> 'theme_package' or (selected_package_id is not null and package_snapshot is not null));

comment on column public.plan_requests.selected_package_id is
  'For theme package requests: the exact theme_package_versions row the customer requested. Immutable once set.';

create function public.plan_requests_package_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_client boolean := coalesce(auth.role(), 'service_role') in ('anon','authenticated');
begin
  if tg_op = 'INSERT' then
    if v_client and (new.request_source <> 'plan_my_event'
                     or new.package_snapshot is not null
                     or new.selected_package_id is not null
                     or new.coordinator_id is not null
                     or new.fulfillment_mode is not null) then
      raise exception 'package fields can only be set by the server' using errcode = '42501';
    end if;
  else
    if new.request_source is distinct from old.request_source then
      raise exception 'request_source cannot change';
    end if;
    if new.selected_package_id is distinct from old.selected_package_id then
      raise exception 'the requested package version cannot change after the request is created';
    end if;
    if new.package_snapshot is distinct from old.package_snapshot then
      raise exception 'the package snapshot is immutable';
    end if;
  end if;

  if new.coordinator_id is not null
     and (tg_op = 'INSERT' or new.coordinator_id is distinct from old.coordinator_id) then
    if not (public.tp_is_admin(new.coordinator_id)
            or public.specialist_can(new.coordinator_id, 'events.requests.manage', 'allow')) then
      raise exception 'coordinator must be an admin or a specialist who can manage requests' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
create trigger plan_requests_package_guard before insert or update on public.plan_requests
  for each row execute function public.plan_requests_package_guard();

alter table public.feed_cards
  add column theme_package_id uuid references public.theme_packages(id) on delete set null;

create function public.feed_cards_package_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.theme_package_id is not null
     and (tg_op = 'INSERT'
          or new.theme_package_id is distinct from old.theme_package_id
          or (coalesce(new.active, false) and not coalesce(old.active, false))) then
    if not exists (select 1 from public.theme_packages
                   where id = new.theme_package_id and status = 'active' and live_version_id is not null) then
      raise exception 'package is not live and cannot be featured';
    end if;
  end if;
  return new;
end $$;
create trigger feed_cards_package_guard before insert or update on public.feed_cards
  for each row execute function public.feed_cards_package_guard();

create table public.plan_request_recipients (
  id           uuid primary key default gen_random_uuid(),
  request_id   uuid not null references public.plan_requests(id) on delete cascade,
  partner_id   uuid references public.partners(id) on delete restrict,
  vendor_id    uuid references public.vendors(id) on delete restrict,
  service_ids  uuid[] not null default '{}',
  status       text not null default 'sent' check (status in ('sent','viewed','quoted','declined','expired')),
  notified_at  timestamptz,
  viewed_at    timestamptz,
  responded_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (partner_id is not null or vendor_id is not null)
);
create unique index plan_request_recipients_one_per_party
  on public.plan_request_recipients (request_id, coalesce(partner_id, vendor_id));
create trigger plan_request_recipients_touch before update on public.plan_request_recipients
  for each row execute function public.tp_touch_updated_at();

create table public.plan_request_quotes (
  id                uuid primary key default gen_random_uuid(),
  recipient_id      uuid not null references public.plan_request_recipients(id) on delete restrict,
  request_id        uuid not null references public.plan_requests(id) on delete restrict,
  revision_number   integer not null,
  status            text not null check (status in ('submitted','declined','withdrawn')),
  amount_cents      integer check (amount_cents is null or amount_cents >= 0),
  currency          text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  valid_until       timestamptz,
  notes             text,
  entered_by        uuid not null references public.profiles(id) on delete restrict,
  entered_on_behalf boolean not null default false,
  created_at        timestamptz not null default now(),
  unique (recipient_id, revision_number),
  check (status <> 'submitted' or amount_cents is not null)
);

create function public.plan_request_quotes_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r public.plan_request_recipients; v_req_status text; v_owner uuid;
begin
  select * into r from public.plan_request_recipients where id = new.recipient_id;
  if not found then raise exception 'recipient not found'; end if;
  new.request_id := r.request_id;

  select status into v_req_status from public.plan_requests where id = r.request_id;
  if v_req_status in ('cancelled','booked') then
    raise exception 'request is % and no longer accepts quotes', v_req_status;
  end if;

  if new.entered_on_behalf then
    if not (public.tp_is_admin(new.entered_by)
            or public.specialist_can(new.entered_by, 'partners.quotes.enter', 'allow')) then
      raise exception 'not permitted to enter quotes on behalf of a partner' using errcode = '42501';
    end if;
  else
    select owner_id into v_owner from public.partners where id = r.partner_id;
    if v_owner is null or v_owner <> new.entered_by then
      raise exception 'only the responsible partner can submit its own quote' using errcode = '42501';
    end if;
  end if;

  new.revision_number := coalesce((select max(revision_number) from public.plan_request_quotes
                                   where recipient_id = new.recipient_id), 0) + 1;

  update public.plan_request_recipients
     set status = case new.status when 'declined' then 'declined' when 'submitted' then 'quoted' else status end,
         responded_at = now()
   where id = r.id;
  return new;
end $$;
create trigger plan_request_quotes_guard before insert on public.plan_request_quotes
  for each row execute function public.plan_request_quotes_guard();

create function public.plan_request_quotes_append_only() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'quotes are append-only; add a new revision instead';
end $$;
create trigger plan_request_quotes_append_only before update or delete on public.plan_request_quotes
  for each row execute function public.plan_request_quotes_append_only();

alter table public.plan_request_recipients enable row level security;
alter table public.plan_request_quotes     enable row level security;
revoke all on table public.plan_request_recipients from anon, authenticated;
revoke all on table public.plan_request_quotes     from anon, authenticated;
