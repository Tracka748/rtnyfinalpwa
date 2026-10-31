-- The 20261014120100_rls_hardening_part1 migration was never applied to the live database.
-- This applies only its sections B, C and D (the privileged-column guard triggers on
-- users, partners and event_drafts). Already applied live on 2026-10-31; this file records it.
-- Sections A, E, F and G of that migration are intentionally not included here.
-- Safe to re-run: functions use create or replace and triggers are dropped first.

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
