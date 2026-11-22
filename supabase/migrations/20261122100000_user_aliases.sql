-- 20261122100000_user_aliases.sql
create table if not exists public.alias_reserved_words (
  word text primary key,
  constraint alias_reserved_words_lower check (word = lower(word))
);

insert into public.alias_reserved_words (word) values
  ('admin'),('administrator'),('rtny'),('rocticketny'),('support'),('help'),('staff'),
  ('team'),('official'),('system'),('root'),('moderator'),('mod'),('null'),('undefined'),
  ('me'),('you'),('all'),('everyone'),('anonymous'),('deleted'),('api'),('events'),
  ('packages'),('partners'),('partner'),('groups'),('crews'),('dashboard'),('promoter'),
  ('promoters'),('organizer'),('organizers'),('login'),('logout'),('signup'),('auth'),
  ('settings'),('profile'),('search'),('tickets'),('orders'),('checkout'),('plan'),
  ('requests'),('specialist'),('specialists'),('vendors'),('businesses'),('magazine')
on conflict (word) do nothing;

create table if not exists public.user_aliases (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  alias text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  constraint user_aliases_format check (alias ~ '^[a-z0-9_]{3,30}$')
);

create unique index if not exists user_aliases_alias_lower_key
  on public.user_aliases (lower(alias));

create or replace function public.user_aliases_guard()
returns trigger language plpgsql
set search_path = public, pg_temp
as $$
begin
  if exists (select 1 from public.alias_reserved_words w where w.word = lower(new.alias)) then
    raise exception 'That alias is reserved.';
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists user_aliases_guard_trg on public.user_aliases;
create trigger user_aliases_guard_trg
  before insert or update of alias on public.user_aliases
  for each row execute function public.user_aliases_guard();

alter table public.user_aliases enable row level security;
alter table public.alias_reserved_words enable row level security;
revoke all on public.user_aliases from anon, authenticated;
revoke all on public.alias_reserved_words from anon, authenticated;
revoke execute on function public.user_aliases_guard() from public, anon, authenticated;

create or replace function public.suggest_alias(p_user_id uuid)
returns text language plpgsql stable
set search_path = public, pg_temp
as $$
declare
  v_first text; v_last text; v_base text; v_candidate text; v_n int := 1;
begin
  select lower(regexp_replace(coalesce(first_name, ''), '[^a-zA-Z0-9]', '', 'g')),
         lower(regexp_replace(coalesce(last_name, ''), '[^a-zA-Z0-9]', '', 'g'))
    into v_first, v_last
  from public.profiles where id = p_user_id;
  if not found then
    raise exception 'User not found.';
  end if;
  v_base := left(v_first, 20) || left(v_last, 1);
  if length(v_base) < 3 then
    v_base := 'user_' || substr(replace(p_user_id::text, '-', ''), 1, 6);
  end if;
  v_candidate := v_base;
  loop
    exit when not exists (select 1 from public.user_aliases a where lower(a.alias) = v_candidate)
          and not exists (select 1 from public.alias_reserved_words w where w.word = v_candidate);
    v_n := v_n + 1;
    v_candidate := v_base || v_n::text;
    if v_n > 1000 then
      raise exception 'Could not find a free alias.';
    end if;
  end loop;
  return v_candidate;
end $$;

create or replace function public.ensure_alias(p_user_id uuid)
returns text language plpgsql
set search_path = public, pg_temp
as $$
declare v_alias text;
begin
  perform pg_advisory_xact_lock(727001);
  select alias into v_alias from public.user_aliases where user_id = p_user_id;
  if found then
    return v_alias;
  end if;
  v_alias := public.suggest_alias(p_user_id);
  insert into public.user_aliases (user_id, alias) values (p_user_id, v_alias);
  return v_alias;
end $$;

create or replace function public.is_special_user(p_user_id uuid)
returns boolean language sql stable
set search_path = public, pg_temp
as $$
  select exists (
           select 1 from public.profiles p
           where p.id = p_user_id
             and (p.role in ('admin', 'promoter', 'organizer') or coalesce(p.is_organizer, false)))
      or exists (select 1 from public.partners pt where pt.owner_id = p_user_id)
      or exists (
           select 1 from public.user_specialist_assignments a
           where a.user_id = p_user_id and a.status = 'active'
             and (a.starts_at is null or a.starts_at <= now())
             and (a.expires_at is null or a.expires_at > now()));
$$;

create or replace function public.user_specialist_alias_trg()
returns trigger language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'active' then
    perform public.ensure_alias(new.user_id);
  end if;
  return new;
end $$;

drop trigger if exists user_specialist_alias on public.user_specialist_assignments;
create trigger user_specialist_alias
  after insert or update of status on public.user_specialist_assignments
  for each row execute function public.user_specialist_alias_trg();

revoke execute on function public.suggest_alias(uuid), public.ensure_alias(uuid),
  public.is_special_user(uuid), public.user_specialist_alias_trg()
  from public, anon, authenticated;
grant execute on function public.suggest_alias(uuid), public.ensure_alias(uuid),
  public.is_special_user(uuid) to service_role;
