-- Specialist system: types, assignments, permissions, access functions, seeds.
-- Already applied via Supabase SQL Editor on 2026-11-02; this file is the repo record.

create table public.specialist_types (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique check (key ~ '^[a-z][a-z0-9_]*$'),
  label       text not null,
  description text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create function public.specialist_types_lock_key() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.key is distinct from old.key then
    raise exception 'specialist_types.key is a stable identifier and cannot change';
  end if;
  return new;
end $$;

create trigger specialist_types_lock_key
  before update on public.specialist_types
  for each row execute function public.specialist_types_lock_key();

create table public.user_specialist_assignments (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  specialist_type_id uuid not null references public.specialist_types(id) on delete restrict,
  status             text not null default 'active' check (status in ('active','suspended','revoked')),
  starts_at          timestamptz not null default now(),
  expires_at         timestamptz,
  assigned_by        uuid references public.profiles(id) on delete set null,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (user_id, specialist_type_id),
  check (expires_at is null or expires_at > starts_at)
);
create index user_specialist_assignments_user_idx on public.user_specialist_assignments(user_id);

create function public.specialist_assignment_guard() returns trigger
language plpgsql set search_path = '' as $$
declare v_check boolean := false;
begin
  if tg_op = 'INSERT' then
    v_check := true;
  else
    if new.user_id is distinct from old.user_id then
      raise exception 'assignment user cannot be changed' using errcode = '42501';
    end if;
    v_check := new.status = 'active' and (
         new.status is distinct from old.status
      or new.assigned_by is distinct from old.assigned_by
      or new.expires_at is distinct from old.expires_at
      or new.specialist_type_id is distinct from old.specialist_type_id);
  end if;

  if v_check and (
       new.assigned_by is null
    or not exists (select 1 from public.profiles p where p.id = new.assigned_by and p.role = 'admin')
  ) then
    raise exception 'specialist assignments must be made by an admin' using errcode = '42501';
  end if;

  new.updated_at := now();
  return new;
end $$;

create trigger specialist_assignment_guard
  before insert or update on public.user_specialist_assignments
  for each row execute function public.specialist_assignment_guard();

create table public.specialist_permissions (
  id                 uuid primary key default gen_random_uuid(),
  specialist_type_id uuid not null references public.specialist_types(id) on delete cascade,
  capability         text not null check (capability ~ '^[a-z][a-z_]*(\.[a-z][a-z_]*)+$'),
  access             text not null check (access in ('allow','deny','read_only','manage')),
  created_at         timestamptz not null default now(),
  unique (specialist_type_id, capability)
);

-- Precedence: admin > any deny > manage > allow > read_only > none
create function public.specialist_resolve_levels(p_levels text[]) returns text
language sql immutable set search_path = '' as $$
  select case
    when p_levels is null or cardinality(p_levels) = 0 then 'none'
    when 'deny'      = any(p_levels) then 'none'
    when 'manage'    = any(p_levels) then 'manage'
    when 'allow'     = any(p_levels) then 'allow'
    when 'read_only' = any(p_levels) then 'read_only'
    else 'none'
  end
$$;

create function public.specialist_access(p_user_id uuid, p_capability text) returns text
language plpgsql stable security definer set search_path = '' as $$
declare v_levels text[];
begin
  if p_user_id is null or p_capability is null then return 'none'; end if;

  if exists (select 1 from public.profiles where id = p_user_id and role = 'admin') then
    return 'manage';
  end if;

  select array_agg(sp.access) into v_levels
  from public.user_specialist_assignments a
  join public.specialist_types t
    on t.id = a.specialist_type_id and t.active
  join public.specialist_permissions sp
    on sp.specialist_type_id = t.id and sp.capability = p_capability
  where a.user_id = p_user_id
    and a.status = 'active'
    and a.starts_at <= now()
    and (a.expires_at is null or a.expires_at > now());

  return public.specialist_resolve_levels(v_levels);
exception when others then
  return 'none';
end $$;

create function public.specialist_can(p_user_id uuid, p_capability text, p_required text default 'allow') returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when p_required is null or p_required not in ('read_only','allow','manage') then false
    else
      (case public.specialist_access(p_user_id, p_capability)
         when 'manage' then 3 when 'allow' then 2 when 'read_only' then 1 else 0 end)
      >=
      (case p_required when 'manage' then 3 when 'allow' then 2 else 1 end)
  end
$$;

alter table public.specialist_types            enable row level security;
alter table public.user_specialist_assignments enable row level security;
alter table public.specialist_permissions      enable row level security;

revoke all on table public.specialist_types            from anon, authenticated;
revoke all on table public.user_specialist_assignments from anon, authenticated;
revoke all on table public.specialist_permissions      from anon, authenticated;

grant select on public.user_specialist_assignments to authenticated;
create policy assignments_select_own on public.user_specialist_assignments
  for select to authenticated using (user_id = auth.uid());

revoke all on function public.specialist_types_lock_key()                    from public, anon, authenticated;
revoke all on function public.specialist_assignment_guard()                  from public, anon, authenticated;
revoke all on function public.specialist_resolve_levels(text[])              from public, anon, authenticated;
revoke all on function public.specialist_access(uuid, text)                  from public, anon, authenticated;
revoke all on function public.specialist_can(uuid, text, text)               from public, anon, authenticated;
grant execute on function public.specialist_resolve_levels(text[])           to service_role;
grant execute on function public.specialist_access(uuid, text)               to service_role;
grant execute on function public.specialist_can(uuid, text, text)            to service_role;

insert into public.specialist_types (key, label, description) values
  ('event_planner',       'Event Planner',       'Coordinates Plan My Event requests and assembles theme packages from approved catalog items'),
  ('birthday_specialist', 'Birthday Specialist', 'Handles birthday leads, packages and partner offers')
on conflict (key) do nothing;

insert into public.specialist_permissions (specialist_type_id, capability, access)
select t.id, v.capability, v.access
from public.specialist_types t
join (values
  ('event_planner',       'packages.view',        'allow'),
  ('event_planner',       'packages.manage',      'allow'),
  ('event_planner',       'catalog.view',         'read_only'),
  ('event_planner',       'events.requests.view', 'allow'),
  ('event_planner',       'events.requests.manage','allow'),
  ('event_planner',       'partners.quotes.enter','allow'),
  ('birthday_specialist', 'packages.view',        'allow'),
  ('birthday_specialist', 'packages.manage',      'allow'),
  ('birthday_specialist', 'catalog.view',         'read_only'),
  ('birthday_specialist', 'events.requests.view', 'allow'),
  ('birthday_specialist', 'events.requests.manage','allow'),
  ('birthday_specialist', 'partners.quotes.enter','allow'),
  ('birthday_specialist', 'birthday.leads.manage','allow')
) as v(type_key, capability, access) on v.type_key = t.key
on conflict (specialist_type_id, capability) do nothing;
