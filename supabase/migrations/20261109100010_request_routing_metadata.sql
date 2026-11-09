-- Part 1: request_categories, theme_packages.category_id + curator_id, eligible coordinators
begin;

-- 1. Category lookup (centralized taxonomy, linked to specialist types)
create table public.request_categories (
  id                 uuid primary key default gen_random_uuid(),
  key                text not null unique check (key ~ '^[a-z][a-z0-9_]*$'),
  label              text not null check (length(label) between 1 and 60),
  specialist_type_id uuid references public.specialist_types(id) on delete restrict,
  active             boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create trigger request_categories_touch
  before update on public.request_categories
  for each row execute function public.tp_touch_updated_at();

alter table public.request_categories enable row level security;
revoke all on table public.request_categories from anon, authenticated;
grant select, insert, update, delete on table public.request_categories to service_role;

insert into public.request_categories (key, label, specialist_type_id)
select 'birthday', 'Birthday', t.id
from public.specialist_types t
where t.key = 'birthday_specialist'
on conflict (key) do nothing;

-- 2. Routing columns on packages
alter table public.theme_packages
  add column category_id uuid references public.request_categories(id) on delete restrict,
  add column curator_id  uuid references public.profiles(id) on delete set null;

create index theme_packages_category_id_idx on public.theme_packages (category_id) where category_id is not null;
create index theme_packages_curator_id_idx  on public.theme_packages (curator_id)  where curator_id  is not null;

-- 3. Curator must be an eligible coordinator; category must be active (checked when set or changed)
create or replace function public.theme_packages_routing_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.curator_id is not null
     and (tg_op = 'INSERT' or new.curator_id is distinct from old.curator_id)
     and not public.specialist_can(new.curator_id, 'events.requests.manage', 'allow') then
    raise exception 'curator must be an eligible coordinator' using errcode = '42501';
  end if;

  if new.category_id is not null
     and (tg_op = 'INSERT' or new.category_id is distinct from old.category_id)
     and not exists (select 1 from public.request_categories c
                     where c.id = new.category_id and c.active) then
    raise exception 'category must be active' using errcode = '22023';
  end if;

  return new;
end $$;

revoke all on function public.theme_packages_routing_guard() from public, anon, authenticated;

create trigger theme_packages_routing_guard
  before insert or update of curator_id, category_id on public.theme_packages
  for each row execute function public.theme_packages_routing_guard();

-- 4. Enumerate eligible coordinators (reuses specialist_can as the single rule)
create or replace function public.request_eligible_coordinators()
returns table (coordinator_id uuid, is_admin boolean, specialist_type_keys text[])
language sql
stable
security definer
set search_path = ''
as $$
  with candidates as (
    select p.id as uid
    from public.profiles p
    where p.role = 'admin'
    union
    select a.user_id
    from public.user_specialist_assignments a
    where a.status = 'active'
      and a.starts_at <= now()
      and (a.expires_at is null or a.expires_at > now())
  )
  select c.uid,
         public.tp_is_admin(c.uid),
         coalesce((
           select array_agg(distinct t.key order by t.key)
           from public.user_specialist_assignments a
           join public.specialist_types t on t.id = a.specialist_type_id
           where a.user_id = c.uid
             and a.status = 'active'
             and t.active
             and a.starts_at <= now()
             and (a.expires_at is null or a.expires_at > now())
         ), '{}'::text[])
  from candidates c
  where public.specialist_can(c.uid, 'events.requests.manage', 'allow');
$$;

revoke all on function public.request_eligible_coordinators() from public, anon, authenticated;
grant execute on function public.request_eligible_coordinators() to service_role;

commit;
