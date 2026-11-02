-- Package validation, immutable-version guards, create-draft function, RLS lockdown.
-- Already applied via Supabase SQL Editor on 2026-11-02; this file is the repo record.

create function public.tp_check_option_fulfillable(p_item uuid, p_service uuid) returns void
language plpgsql stable set search_path = '' as $$
begin
  if not exists (select 1 from public.catalog_items where id = p_item and status = 'active') then
    raise exception 'catalog item is not active';
  end if;
  if p_service is not null then
    if not exists (select 1 from public.catalog_item_services
                   where catalog_item_id = p_item and service_id = p_service and status = 'approved') then
      raise exception 'service is not an admin-approved fulfilment of this catalog item';
    end if;
    if not exists (select 1 from public.vendor_services where id = p_service and status = 'active') then
      raise exception 'service is not active';
    end if;
  end if;
end $$;

create function public.tpv_validate(p_version_id uuid, p_publishing boolean) returns void
language plpgsql stable set search_path = '' as $$
declare r record;
begin
  if not exists (select 1 from public.theme_package_components where version_id = p_version_id) then
    raise exception 'a package version needs at least one component';
  end if;
  if exists (
    select 1 from public.theme_package_components c
    where c.version_id = p_version_id
      and not exists (select 1 from public.theme_package_component_options o
                      where o.component_id = c.id and o.is_default)
  ) then
    raise exception 'every component needs exactly one default option';
  end if;
  if p_publishing then
    for r in
      select o.catalog_item_id, o.service_id
      from public.theme_package_component_options o
      join public.theme_package_components c on c.id = o.component_id
      where c.version_id = p_version_id
    loop
      perform public.tp_check_option_fulfillable(r.catalog_item_id, r.service_id);
    end loop;
  end if;
end $$;

create function public.tpv_guard() returns trigger
language plpgsql set search_path = '' as $$
declare v_pkg_status text;
begin
  if tg_op = 'INSERT' then
    select status into v_pkg_status from public.theme_packages where id = new.package_id;
    if v_pkg_status is distinct from 'active' then
      raise exception 'package is not active; cannot add versions';
    end if;
    if new.status <> 'draft' then
      raise exception 'new versions must start as draft';
    end if;
    new.version_number := coalesce((select max(version_number) from public.theme_package_versions
                                    where package_id = new.package_id), 0) + 1;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.status in ('approved','superseded') then
      raise exception 'approved versions cannot be deleted';
    end if;
    return old;
  end if;

  if new.package_id is distinct from old.package_id or new.version_number is distinct from old.version_number then
    raise exception 'package and version number cannot change';
  end if;

  if old.status in ('approved','superseded') then
    if new.status = old.status then
      if (to_jsonb(new) - 'updated_at') is distinct from (to_jsonb(old) - 'updated_at') then
        raise exception 'approved versions are immutable; create a new draft version instead';
      end if;
    elsif old.status = 'approved' and new.status = 'superseded' then
      if (to_jsonb(new) - 'status' - 'updated_at' - 'superseded_at')
         is distinct from (to_jsonb(old) - 'status' - 'updated_at' - 'superseded_at') then
        raise exception 'approved versions are immutable';
      end if;
      new.superseded_at := coalesce(new.superseded_at, now());
    else
      raise exception 'invalid status change from %', old.status;
    end if;
    return new;
  end if;

  if new.status is distinct from old.status then
    if not ((old.status, new.status) in (
         ('draft','in_review'), ('draft','approved'),
         ('in_review','approved'), ('in_review','needs_changes'), ('in_review','draft'),
         ('needs_changes','in_review'), ('needs_changes','draft'))) then
      raise exception 'invalid status change from % to %', old.status, new.status;
    end if;

    if new.status = 'in_review' then
      perform public.tpv_validate(new.id, false);
      new.submitted_at := now();
    elsif new.status = 'needs_changes' then
      if new.reviewed_by is null or not public.tp_is_admin(new.reviewed_by) then
        raise exception 'only an admin can request changes' using errcode = '42501';
      end if;
      if coalesce(btrim(new.review_note), '') = '' then
        raise exception 'a review note is required when requesting changes';
      end if;
      new.reviewed_at := now();
    elsif new.status = 'approved' then
      if new.reviewed_by is null or not public.tp_is_admin(new.reviewed_by) then
        raise exception 'only an admin can approve a package version' using errcode = '42501';
      end if;
      select status into v_pkg_status from public.theme_packages where id = new.package_id;
      if v_pkg_status is distinct from 'active' then
        raise exception 'package is not active';
      end if;
      perform public.tpv_validate(new.id, true);
      update public.theme_package_versions
         set status = 'superseded'
       where package_id = new.package_id and status = 'approved' and id <> new.id;
      update public.theme_packages set live_version_id = new.id where id = new.package_id;
      new.reviewed_at  := now();
      new.published_at := now();
    end if;
  end if;
  return new;
end $$;
create trigger tpv_guard before insert or update or delete on public.theme_package_versions
  for each row execute function public.tpv_guard();
create trigger tpv_touch before update on public.theme_package_versions
  for each row execute function public.tp_touch_updated_at();

create function public.theme_packages_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.key is distinct from old.key then
    raise exception 'theme_packages.key is a stable identifier and cannot change';
  end if;
  if new.live_version_id is not null and not exists (
       select 1 from public.theme_package_versions
       where id = new.live_version_id and package_id = new.id) then
    raise exception 'live version must belong to this package';
  end if;
  return new;
end $$;
create trigger theme_packages_guard before update on public.theme_packages
  for each row execute function public.theme_packages_guard();

create function public.tpc_guard() returns trigger
language plpgsql set search_path = '' as $$
declare v_status text; v_vid uuid;
begin
  v_vid := case when tg_op = 'DELETE' then old.version_id else new.version_id end;
  if tg_op = 'UPDATE' and new.version_id is distinct from old.version_id then
    raise exception 'components cannot move between versions';
  end if;
  select status into v_status from public.theme_package_versions where id = v_vid;
  if v_status is not null and v_status not in ('draft','needs_changes') then
    raise exception 'version is % and cannot be edited', v_status;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
create trigger tpc_guard before insert or update or delete on public.theme_package_components
  for each row execute function public.tpc_guard();

create function public.tpo_guard() returns trigger
language plpgsql set search_path = '' as $$
declare v_status text; v_cid uuid;
begin
  v_cid := case when tg_op = 'DELETE' then old.component_id else new.component_id end;
  if tg_op = 'UPDATE' and new.component_id is distinct from old.component_id then
    raise exception 'options cannot move between components';
  end if;
  select v.status into v_status
    from public.theme_package_components c
    join public.theme_package_versions v on v.id = c.version_id
   where c.id = v_cid;
  if v_status is not null and v_status not in ('draft','needs_changes') then
    raise exception 'version is % and cannot be edited', v_status;
  end if;
  if tg_op <> 'DELETE' then
    perform public.tp_check_option_fulfillable(new.catalog_item_id, new.service_id);
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
create trigger tpo_guard before insert or update or delete on public.theme_package_component_options
  for each row execute function public.tpo_guard();

create function public.theme_package_create_draft(p_package_id uuid, p_created_by uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_src public.theme_package_versions; v_new uuid; v_comp uuid; c record;
begin
  if p_created_by is null or not (public.tp_is_admin(p_created_by)
       or public.specialist_can(p_created_by, 'packages.manage', 'allow')) then
    raise exception 'not permitted to create package drafts' using errcode = '42501';
  end if;
  select v.* into v_src
    from public.theme_packages p
    join public.theme_package_versions v on v.id = p.live_version_id
   where p.id = p_package_id and p.status = 'active';
  if not found then raise exception 'package has no live version or is not active'; end if;

  insert into public.theme_package_versions
    (package_id, title, subtitle, description, cover_image_url, magazine_url,
     min_guests, max_guests, price_note, created_by)
  values
    (p_package_id, v_src.title, v_src.subtitle, v_src.description, v_src.cover_image_url,
     v_src.magazine_url, v_src.min_guests, v_src.max_guests, v_src.price_note, p_created_by)
  returning id into v_new;

  for c in select * from public.theme_package_components where version_id = v_src.id order by sort_order, created_at loop
    insert into public.theme_package_components (version_id, slot_label, sort_order, requirement, quantity, notes)
    values (v_new, c.slot_label, c.sort_order, c.requirement, c.quantity, c.notes)
    returning id into v_comp;
    insert into public.theme_package_component_options (component_id, catalog_item_id, service_id, is_default, sort_order)
    select v_comp, o.catalog_item_id, o.service_id, o.is_default, o.sort_order
      from public.theme_package_component_options o where o.component_id = c.id;
  end loop;
  return v_new;
end $$;

alter table public.catalog_items                    enable row level security;
alter table public.catalog_item_themes              enable row level security;
alter table public.catalog_item_services            enable row level security;
alter table public.theme_packages                   enable row level security;
alter table public.theme_package_versions           enable row level security;
alter table public.theme_package_components         enable row level security;
alter table public.theme_package_component_options  enable row level security;

revoke all on table public.catalog_items                   from anon, authenticated;
revoke all on table public.catalog_item_themes             from anon, authenticated;
revoke all on table public.catalog_item_services           from anon, authenticated;
revoke all on table public.theme_packages                  from anon, authenticated;
revoke all on table public.theme_package_versions          from anon, authenticated;
revoke all on table public.theme_package_components        from anon, authenticated;
revoke all on table public.theme_package_component_options from anon, authenticated;

revoke all on function public.tp_is_admin(uuid)                       from public, anon, authenticated;
revoke all on function public.tp_check_option_fulfillable(uuid, uuid) from public, anon, authenticated;
revoke all on function public.tpv_validate(uuid, boolean)             from public, anon, authenticated;
revoke all on function public.theme_package_create_draft(uuid, uuid)  from public, anon, authenticated;
grant execute on function public.tp_is_admin(uuid)                    to service_role;
grant execute on function public.theme_package_create_draft(uuid, uuid) to service_role;
