-- A. RLS on the eight tables
do $$
declare t text;
begin
  foreach t in array array[
    'ad_placement_options','ad_reel_duration_options','badge_definitions',
    'partner_categories','partner_theme_tags','platform_settings','themes'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', 'public_read_' || t, t);
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (true)',
      'public_read_' || t, t);
  end loop;
end $$;

alter table public.theme_suggestions enable row level security;
drop policy if exists theme_suggestions_insert_own on public.theme_suggestions;
create policy theme_suggestions_insert_own on public.theme_suggestions
  for insert to authenticated
  with check (submitted_by_user_id = auth.uid());
drop policy if exists theme_suggestions_select_own on public.theme_suggestions;
create policy theme_suggestions_select_own on public.theme_suggestions
  for select to authenticated
  using (submitted_by_user_id = auth.uid());
drop policy if exists theme_suggestions_admin_select on public.theme_suggestions;
create policy theme_suggestions_admin_select on public.theme_suggestions
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- B. users: block self-promotion / self-tiering
create or replace function public.protect_users_privileged_columns()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.is_promoter := false;
      new.promoter_approved_at := null;
      new.promoter_approved_by := null;
    elsif new.is_promoter is distinct from old.is_promoter
       or new.member_tier is distinct from old.member_tier
       or new.promoter_approved_at is distinct from old.promoter_approved_at
       or new.promoter_approved_by is distinct from old.promoter_approved_by then
      raise exception 'privileged users columns cannot be changed by this role'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_users_privileged_columns on public.users;
create trigger protect_users_privileged_columns
  before insert or update on public.users
  for each row execute function public.protect_users_privileged_columns();

-- C. partners: owners cannot touch trust / linkage columns
create or replace function public.protect_partners_privileged_columns()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated')
     and not exists (select 1 from public.profiles p
                     where p.id = auth.uid() and p.role = 'admin') then
    if new.verified is distinct from old.verified
       or new.active is distinct from old.active
       or new.supporter_count is distinct from old.supporter_count
       or new.owner_id is distinct from old.owner_id
       or new.business_id is distinct from old.business_id
       or new.venue_id is distinct from old.venue_id
       or new.vendor_id is distinct from old.vendor_id
       or new.partner_type is distinct from old.partner_type
       or new.category_id is distinct from old.category_id
       or new.requires_photo_verified_tags is distinct from old.requires_photo_verified_tags then
      raise exception 'privileged partners columns cannot be changed by this role'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_partners_privileged_columns on public.partners;
create trigger protect_partners_privileged_columns
  before update on public.partners
  for each row execute function public.protect_partners_privileged_columns();

-- D. event_drafts: promoters cannot approve / feature / publish themselves
create or replace function public.protect_event_drafts_privileged_columns()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated')
     and not exists (select 1 from public.profiles p
                     where p.id = auth.uid() and p.role = 'admin') then
    if tg_op = 'INSERT' then
      new.featured := false;
      new.published_event_id := null;
      if new.status not in ('draft', 'pending_review') then
        new.status := 'draft';
      end if;
    else
      if new.featured is distinct from old.featured
         or new.published_event_id is distinct from old.published_event_id
         or new.promoter_id is distinct from old.promoter_id
         or (new.status is distinct from old.status
             and not (old.status = 'draft' and new.status = 'pending_review')) then
        raise exception 'privileged event_drafts columns cannot be changed by this role'
          using errcode = '42501';
      end if;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_event_drafts_privileged_columns on public.event_drafts;
create trigger protect_event_drafts_privileged_columns
  before insert or update on public.event_drafts
  for each row execute function public.protect_event_drafts_privileged_columns();

-- E. live_now_slots: users can only create unpaid, unapproved, pending slots
drop policy if exists "Promoter insert own slots" on public.live_now_slots;
drop policy if exists "Promoter insert own pending slots" on public.live_now_slots;
create policy "Promoter insert own pending slots" on public.live_now_slots
  for insert to authenticated
  with check (promoter_id = auth.uid()
              and status = 'pending'
              and paid = false
              and approved_by is null
              and approved_at is null);

-- F. group_memberships: plain active membership only
drop policy if exists memberships_user_insert_own on public.group_memberships;
create policy memberships_user_insert_own on public.group_memberships
  for insert to authenticated
  with check (user_id = auth.uid() and status = 'active' and invited_by is null);

-- G. promo_code_usage: unused by app code; writes come from the server
drop policy if exists "System can insert promo usage" on public.promo_code_usage;
