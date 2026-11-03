-- Package draft saving: revision counter, last editor, status-change audit log, atomic draft-save function.
-- Already applied via Supabase SQL Editor on 2026-11-02 (Part 1 then Part 2, 11 rollback tests passed); this file is the repo record.

-- ===== Part 1: columns, audit log, relaxed option guard =====

alter table public.theme_package_versions
  add column revision   integer not null default 1,
  add column updated_by uuid references public.profiles(id) on delete set null;

-- version_id and actor_id deliberately have no foreign keys: the log is append-only,
-- so cascades / set-null from other tables must never try to modify it.
create table public.theme_package_version_events (
  id             uuid primary key default gen_random_uuid(),
  version_id     uuid not null,
  package_id     uuid not null references public.theme_packages(id) on delete restrict,
  version_number integer,
  action         text not null check (action in
                 ('draft_created','submitted','changes_requested','approved','returned_to_draft','superseded')),
  from_status    text,
  to_status      text,
  actor_id       uuid,
  note           text,
  revision       integer,
  created_at     timestamptz not null default now()
);
create index theme_package_version_events_version
  on public.theme_package_version_events (version_id, created_at);

create function public.tpve_append_only() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'version events are append-only';
end $$;
create trigger tpve_append_only before update or delete on public.theme_package_version_events
  for each row execute function public.tpve_append_only();

create function public.tpv_audit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_action text; v_actor uuid;
begin
  if tg_op = 'INSERT' then
    insert into public.theme_package_version_events
      (version_id, package_id, version_number, action, to_status, actor_id, revision)
    values (new.id, new.package_id, new.version_number, 'draft_created', new.status, new.created_by, new.revision);
    return null;
  end if;

  if new.status is distinct from old.status then
    v_action := case new.status
      when 'in_review'     then 'submitted'
      when 'needs_changes' then 'changes_requested'
      when 'approved'      then 'approved'
      when 'superseded'    then 'superseded'
      else 'returned_to_draft' end;
    v_actor := case new.status
      when 'superseded'    then null
      when 'needs_changes' then new.reviewed_by
      when 'approved'      then new.reviewed_by
      else new.updated_by end;
    if v_actor is null and v_action in ('submitted', 'returned_to_draft') then
      raise exception 'status changes must record who made them' using errcode = '42501';
    end if;
    insert into public.theme_package_version_events
      (version_id, package_id, version_number, action, from_status, to_status, actor_id, note, revision)
    values (new.id, new.package_id, new.version_number, v_action, old.status, new.status, v_actor,
            case when v_action in ('changes_requested', 'approved') then new.review_note end,
            new.revision);
  end if;
  return null;
end $$;
create trigger tpv_audit after insert or update on public.theme_package_versions
  for each row execute function public.tpv_audit();

-- Only re-check fulfillability when an option's item/service actually changes, so an unrelated
-- edit (reorder, default swap) is not blocked by an item archived after the option was added.
-- Approval re-validates every option anyway (tpv_validate with publishing = true).
create or replace function public.tpo_guard() returns trigger
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
  if tg_op = 'INSERT'
     or (tg_op = 'UPDATE' and (new.catalog_item_id is distinct from old.catalog_item_id
                               or new.service_id is distinct from old.service_id)) then
    perform public.tp_check_option_fulfillable(new.catalog_item_id, new.service_id);
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

alter table public.theme_package_version_events enable row level security;
revoke all on table public.theme_package_version_events from anon, authenticated;
revoke all on function public.tpv_audit()          from public, anon, authenticated;
revoke all on function public.tpve_append_only()   from public, anon, authenticated;

-- ===== Part 2: atomic draft save =====

create function public.theme_package_save_draft(
  p_version_id uuid, p_actor uuid, p_expected_revision integer, p_meta jsonb, p_components jsonb
) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v public.theme_package_versions;
  c jsonb; o jsonb;
  c_ord integer; o_ord integer;
  v_comp_id uuid; v_keep_c uuid[]; v_keep_o uuid[];
  v_defaults integer; v_rev integer;
begin
  if p_actor is null or not (public.tp_is_admin(p_actor)
       or public.specialist_can(p_actor, 'packages.manage', 'allow')) then
    raise exception 'not permitted to edit package drafts' using errcode = '42501';
  end if;

  select * into v from public.theme_package_versions where id = p_version_id for update;
  if not found then raise exception 'package version not found'; end if;
  if v.status not in ('draft', 'needs_changes') then
    raise exception 'version is % and cannot be edited', v.status;
  end if;
  if p_expected_revision is distinct from v.revision then
    raise exception 'this draft was changed by someone else; reload it and try again' using errcode = 'RT409';
  end if;

  if p_meta is not null then
    if jsonb_typeof(p_meta) <> 'object' then raise exception 'meta must be an object'; end if;
    if exists (select 1 from jsonb_object_keys(p_meta) k
               where k not in ('title','subtitle','description','cover_image_url',
                               'magazine_url','min_guests','max_guests','price_note')) then
      raise exception 'meta contains an unknown field';
    end if;
    if p_meta ? 'title' and btrim(coalesce(p_meta->>'title', '')) = '' then
      raise exception 'title is required';
    end if;
    if (p_meta ? 'min_guests' and jsonb_typeof(p_meta->'min_guests') not in ('number', 'null'))
       or (p_meta ? 'max_guests' and jsonb_typeof(p_meta->'max_guests') not in ('number', 'null')) then
      raise exception 'guest limits must be numbers';
    end if;
  end if;

  if p_components is not null then
    if jsonb_typeof(p_components) <> 'array' then raise exception 'components must be an array'; end if;
    if jsonb_array_length(p_components) > 30 then
      raise exception 'a package can have at most 30 components';
    end if;

    for c in select e from jsonb_array_elements(p_components) e loop
      if jsonb_typeof(c) <> 'object' then raise exception 'each component must be an object'; end if;
      if btrim(coalesce(c->>'slot_label', '')) = '' or length(c->>'slot_label') > 80 then
        raise exception 'each component needs a label of 1 to 80 characters';
      end if;
      if coalesce(c->>'requirement', 'required') not in ('required', 'optional_on', 'optional_off') then
        raise exception 'invalid component requirement';
      end if;
      if coalesce((c->>'quantity')::integer, 1) not between 1 and 99 then
        raise exception 'component quantity must be between 1 and 99';
      end if;
      if length(coalesce(c->>'notes', '')) > 500 then
        raise exception 'component notes are too long (500 characters max)';
      end if;
      if c ? 'options' then
        if jsonb_typeof(c->'options') <> 'array' then raise exception 'options must be an array'; end if;
        if jsonb_array_length(c->'options') > 10 then
          raise exception 'a component can have at most 10 options';
        end if;
        if exists (select 1 from jsonb_array_elements(c->'options') x
                   where jsonb_typeof(x) <> 'object' or x->>'catalog_item_id' is null) then
          raise exception 'each option needs a catalog item';
        end if;
        select count(*) into v_defaults from jsonb_array_elements(c->'options') x
         where coalesce((x->>'is_default')::boolean, false);
        if v_defaults > 1 then raise exception 'a component can have only one default option'; end if;
      end if;
    end loop;

    if (select count(*) from jsonb_array_elements(p_components) e where e->>'id' is not null)
       <> (select count(distinct e->>'id') from jsonb_array_elements(p_components) e where e->>'id' is not null) then
      raise exception 'duplicate component ids';
    end if;
    if exists (select 1 from jsonb_array_elements(p_components) e
               where e->>'id' is not null
                 and not exists (select 1 from public.theme_package_components pc
                                  where pc.id = (e->>'id')::uuid and pc.version_id = p_version_id)) then
      raise exception 'a component does not belong to this version';
    end if;

    select coalesce(array_agg((e->>'id')::uuid), '{}') into v_keep_c
      from jsonb_array_elements(p_components) e where e->>'id' is not null;
    delete from public.theme_package_components
     where version_id = p_version_id and id <> all(v_keep_c);

    for c, c_ord in select e, ord::integer from jsonb_array_elements(p_components) with ordinality t(e, ord) loop
      if c->>'id' is not null then
        v_comp_id := (c->>'id')::uuid;
        update public.theme_package_components
           set slot_label  = btrim(c->>'slot_label'),
               sort_order  = c_ord,
               requirement = coalesce(c->>'requirement', 'required'),
               quantity    = coalesce((c->>'quantity')::integer, 1),
               notes       = nullif(btrim(coalesce(c->>'notes', '')), '')
         where id = v_comp_id and version_id = p_version_id;
      else
        insert into public.theme_package_components
          (version_id, slot_label, sort_order, requirement, quantity, notes)
        values (p_version_id, btrim(c->>'slot_label'), c_ord,
                coalesce(c->>'requirement', 'required'),
                coalesce((c->>'quantity')::integer, 1),
                nullif(btrim(coalesce(c->>'notes', '')), ''))
        returning id into v_comp_id;
      end if;

      -- options key absent = leave this component's options alone
      if c ? 'options' then
        if exists (select 1 from jsonb_array_elements(c->'options') x
                   where x->>'id' is not null
                     and not exists (select 1 from public.theme_package_component_options po
                                      where po.id = (x->>'id')::uuid and po.component_id = v_comp_id)) then
          raise exception 'an option does not belong to its component';
        end if;
        if (select count(*) from jsonb_array_elements(c->'options') x where x->>'id' is not null)
           <> (select count(distinct x->>'id') from jsonb_array_elements(c->'options') x where x->>'id' is not null) then
          raise exception 'duplicate option ids';
        end if;

        select coalesce(array_agg((x->>'id')::uuid), '{}') into v_keep_o
          from jsonb_array_elements(c->'options') x where x->>'id' is not null;
        delete from public.theme_package_component_options
         where component_id = v_comp_id and id <> all(v_keep_o);

        -- pass 1 writes non-defaults, pass 2 writes the default, so the one-default index never trips
        for pass in 1..2 loop
          for o, o_ord in select x, ord::integer from jsonb_array_elements(c->'options') with ordinality t(x, ord) loop
            continue when coalesce((o->>'is_default')::boolean, false) <> (pass = 2);
            if o->>'id' is not null then
              update public.theme_package_component_options
                 set catalog_item_id = (o->>'catalog_item_id')::uuid,
                     service_id      = (o->>'service_id')::uuid,
                     is_default      = (pass = 2),
                     sort_order      = o_ord
               where id = (o->>'id')::uuid and component_id = v_comp_id
                 and (catalog_item_id, service_id, is_default, sort_order)
                     is distinct from ((o->>'catalog_item_id')::uuid, (o->>'service_id')::uuid, (pass = 2), o_ord);
            else
              insert into public.theme_package_component_options
                (component_id, catalog_item_id, service_id, is_default, sort_order)
              values (v_comp_id, (o->>'catalog_item_id')::uuid, (o->>'service_id')::uuid, (pass = 2), o_ord);
            end if;
          end loop;
        end loop;
      end if;
    end loop;
  end if;

  update public.theme_package_versions set
    title           = case when p_meta ? 'title' then btrim(p_meta->>'title') else title end,
    subtitle        = case when p_meta ? 'subtitle' then nullif(btrim(coalesce(p_meta->>'subtitle', '')), '') else subtitle end,
    description     = case when p_meta ? 'description' then nullif(btrim(coalesce(p_meta->>'description', '')), '') else description end,
    cover_image_url = case when p_meta ? 'cover_image_url' then nullif(btrim(coalesce(p_meta->>'cover_image_url', '')), '') else cover_image_url end,
    magazine_url    = case when p_meta ? 'magazine_url' then nullif(btrim(coalesce(p_meta->>'magazine_url', '')), '') else magazine_url end,
    price_note      = case when p_meta ? 'price_note' then nullif(btrim(coalesce(p_meta->>'price_note', '')), '') else price_note end,
    min_guests      = case when p_meta ? 'min_guests' then (p_meta->>'min_guests')::integer else min_guests end,
    max_guests      = case when p_meta ? 'max_guests' then (p_meta->>'max_guests')::integer else max_guests end,
    revision        = revision + 1,
    updated_by      = p_actor
  where id = p_version_id
  returning revision into v_rev;

  return v_rev;
end $$;

revoke all on function public.theme_package_save_draft(uuid, uuid, integer, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.theme_package_save_draft(uuid, uuid, integer, jsonb, jsonb) to service_role;
