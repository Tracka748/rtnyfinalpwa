-- Theme catalog + package tables (items, item-service links, packages, versions, components, options).
-- Already applied via Supabase SQL Editor on 2026-11-02; this file is the repo record.

create function public.tp_touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;

create function public.tp_is_admin(p_user_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select true from public.profiles where id = p_user_id and role = 'admin'), false)
$$;

create table public.catalog_items (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique check (key ~ '^[a-z][a-z0-9_]*$'),
  name        text not null,
  description text,
  item_type   text not null check (item_type in
              ('decoration','venue','entertainment','activity','food','favor','other')),
  occasions   text[] not null default '{}',
  image_url   text,
  status      text not null default 'draft' check (status in ('draft','active','archived')),
  created_by  uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create function public.catalog_items_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.key is distinct from old.key then
    raise exception 'catalog_items.key is a stable identifier and cannot change';
  end if;
  if new.status = 'active' and (tg_op = 'INSERT' or old.status is distinct from 'active') then
    if new.approved_by is null or not public.tp_is_admin(new.approved_by) then
      raise exception 'catalog items must be approved by an admin' using errcode = '42501';
    end if;
    new.approved_at := coalesce(new.approved_at, now());
  end if;
  return new;
end $$;
create trigger catalog_items_guard before insert or update on public.catalog_items
  for each row execute function public.catalog_items_guard();
create trigger catalog_items_touch before update on public.catalog_items
  for each row execute function public.tp_touch_updated_at();

create table public.catalog_item_themes (
  catalog_item_id uuid not null references public.catalog_items(id) on delete cascade,
  theme_id        uuid not null references public.themes(id) on delete cascade,
  primary key (catalog_item_id, theme_id)
);

create table public.catalog_item_services (
  id              uuid primary key default gen_random_uuid(),
  catalog_item_id uuid not null references public.catalog_items(id) on delete cascade,
  service_id      uuid not null references public.vendor_services(id) on delete cascade,
  status          text not null default 'pending' check (status in ('pending','approved','rejected')),
  proposed_by     uuid references public.profiles(id) on delete set null,
  approved_by     uuid references public.profiles(id) on delete set null,
  approved_at     timestamptz,
  created_at      timestamptz not null default now(),
  unique (catalog_item_id, service_id)
);

create function public.catalog_item_services_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and (new.catalog_item_id is distinct from old.catalog_item_id
                        or new.service_id is distinct from old.service_id) then
    raise exception 'catalog item / service link cannot be repointed';
  end if;
  if new.status = 'approved' and (tg_op = 'INSERT' or old.status is distinct from 'approved') then
    if new.approved_by is null or not public.tp_is_admin(new.approved_by) then
      raise exception 'catalog service links must be approved by an admin' using errcode = '42501';
    end if;
    new.approved_at := coalesce(new.approved_at, now());
  end if;
  return new;
end $$;
create trigger catalog_item_services_guard before insert or update on public.catalog_item_services
  for each row execute function public.catalog_item_services_guard();

create table public.theme_packages (
  id              uuid primary key default gen_random_uuid(),
  key             text not null unique check (key ~ '^[a-z][a-z0-9_]*$'),
  theme_id        uuid references public.themes(id) on delete set null,
  occasion        text not null,
  status          text not null default 'active' check (status in ('active','archived')),
  live_version_id uuid,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger theme_packages_touch before update on public.theme_packages
  for each row execute function public.tp_touch_updated_at();

create table public.theme_package_versions (
  id              uuid primary key default gen_random_uuid(),
  package_id      uuid not null references public.theme_packages(id) on delete restrict,
  version_number  integer not null,
  status          text not null default 'draft' check (status in
                  ('draft','in_review','needs_changes','approved','superseded')),
  title           text not null,
  subtitle        text,
  description     text,
  cover_image_url text,
  magazine_url    text,
  min_guests      integer,
  max_guests      integer,
  price_note      text,
  created_by      uuid references public.profiles(id) on delete set null,
  submitted_at    timestamptz,
  reviewed_by     uuid references public.profiles(id) on delete set null,
  reviewed_at     timestamptz,
  review_note     text,
  published_at    timestamptz,
  superseded_at   timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (package_id, version_number),
  check (min_guests is null or max_guests is null or min_guests <= max_guests)
);
create unique index theme_package_versions_one_open
  on public.theme_package_versions(package_id) where status in ('draft','in_review','needs_changes');
create unique index theme_package_versions_one_approved
  on public.theme_package_versions(package_id) where status = 'approved';

alter table public.theme_packages
  add constraint theme_packages_live_version_fk
  foreign key (live_version_id) references public.theme_package_versions(id) on delete set null;

create table public.theme_package_components (
  id          uuid primary key default gen_random_uuid(),
  version_id  uuid not null references public.theme_package_versions(id) on delete cascade,
  slot_label  text not null,
  sort_order  integer not null default 0,
  requirement text not null default 'required' check (requirement in ('required','optional_on','optional_off')),
  quantity    integer not null default 1 check (quantity > 0),
  notes       text,
  created_at  timestamptz not null default now()
);

create table public.theme_package_component_options (
  id              uuid primary key default gen_random_uuid(),
  component_id    uuid not null references public.theme_package_components(id) on delete cascade,
  catalog_item_id uuid not null references public.catalog_items(id) on delete restrict,
  service_id      uuid references public.vendor_services(id) on delete restrict,
  is_default      boolean not null default false,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);
create unique index theme_package_options_one_default
  on public.theme_package_component_options(component_id) where is_default;
