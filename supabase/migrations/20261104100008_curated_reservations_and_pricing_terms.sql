-- Curated reservations: pricing terms on package versions, reservation math, request_kind,
-- snapshot v3 and the reserve / quote request function.
-- Applied via Supabase SQL Editor in four pastes (parts 1-3 are this file; part 4 is a self-test); this file is the repo record.


alter table public.theme_package_versions add column pricing_terms jsonb;
comment on column public.theme_package_versions.pricing_terms is
  'Curated pricing terms: {mode: structured|free_text, ...}. Normalized by tp_normalize_pricing_terms; immutable with the approved version.';

alter table public.plan_requests
  add column request_kind text check (request_kind is null or request_kind in ('reserve','custom_quote'));
comment on column public.plan_requests.request_kind is
  'Theme package requests: reserve (curated package, unchanged) or custom_quote (customized). Immutable.';

-- Validates and normalizes pricing terms. Returns null for null / JSON null.
create function public.tp_normalize_pricing_terms(p jsonb) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare
  k text; n jsonb; v_mode text; v_notes jsonb := '[]'::jsonb; v_text text;
  v_base numeric; v_incl integer; v_extra numeric; v_pct numeric; v_dep numeric;
  v_days integer; v_label text;
begin
  if p is null or jsonb_typeof(p) = 'null' then return null; end if;
  if jsonb_typeof(p) <> 'object' then raise exception 'pricing terms must be an object'; end if;

  for k in select jsonb_object_keys(p) loop
    if k not in ('mode','base_price','included_guests','extra_guest_price','service_charge_pct',
                 'service_charge_label','deposit_amount','balance_due_days','free_text','notes') then
      raise exception 'pricing terms contain an unknown field';
    end if;
  end loop;

  v_mode := p->>'mode';
  if v_mode is null or v_mode not in ('structured','free_text') then
    raise exception 'pricing mode must be structured or free_text';
  end if;

  if p ? 'notes' and jsonb_typeof(p->'notes') <> 'null' then
    if jsonb_typeof(p->'notes') <> 'array' then raise exception 'pricing notes must be a list'; end if;
    if jsonb_array_length(p->'notes') > 12 then raise exception 'a package can have at most 12 pricing notes'; end if;
    for n in select e from jsonb_array_elements(p->'notes') e loop
      if jsonb_typeof(n) <> 'string' or btrim(n #>> '{}') = '' or length(n #>> '{}') > 200 then
        raise exception 'each pricing note must be 1 to 200 characters';
      end if;
      v_notes := v_notes || to_jsonb(btrim(n #>> '{}'));
    end loop;
  end if;

  if v_mode = 'free_text' then
    v_text := btrim(coalesce(p->>'free_text', ''));
    if v_text = '' or length(v_text) > 2000 then
      raise exception 'free-text pricing must be 1 to 2000 characters';
    end if;
    return jsonb_build_object('mode', 'free_text', 'free_text', v_text, 'notes', v_notes);
  end if;

  if jsonb_typeof(p->'base_price') is distinct from 'number' then raise exception 'base price must be a number'; end if;
  v_base := round((p->>'base_price')::numeric, 2);
  if v_base < 0 or v_base > 1000000 then raise exception 'base price must be between 0 and 1,000,000'; end if;

  if jsonb_typeof(p->'included_guests') is distinct from 'number'
     or (p->>'included_guests')::numeric <> trunc((p->>'included_guests')::numeric) then
    raise exception 'guests included must be a whole number';
  end if;
  v_incl := (p->>'included_guests')::integer;
  if v_incl < 1 or v_incl > 10000 then raise exception 'guests included must be between 1 and 10,000'; end if;

  if p ? 'extra_guest_price' and jsonb_typeof(p->'extra_guest_price') not in ('number', 'null') then
    raise exception 'extra guest price must be a number';
  end if;
  v_extra := coalesce(round((p->>'extra_guest_price')::numeric, 2), 0);
  if v_extra < 0 or v_extra > 100000 then raise exception 'extra guest price must be between 0 and 100,000'; end if;

  if p ? 'service_charge_pct' and jsonb_typeof(p->'service_charge_pct') not in ('number', 'null') then
    raise exception 'service charge must be a number';
  end if;
  v_pct := coalesce(round((p->>'service_charge_pct')::numeric, 2), 0);
  if v_pct < 0 or v_pct > 100 then raise exception 'service charge must be between 0 and 100 percent'; end if;

  v_label := nullif(btrim(coalesce(p->>'service_charge_label', '')), '');
  if length(coalesce(v_label, '')) > 80 then raise exception 'service charge label is too long (80 characters max)'; end if;

  if jsonb_typeof(p->'deposit_amount') is distinct from 'number' then raise exception 'deposit must be a number'; end if;
  v_dep := round((p->>'deposit_amount')::numeric, 2);
  if v_dep < 0 then raise exception 'deposit cannot be negative'; end if;
  if v_dep > v_base + round(v_base * v_pct / 100, 2) then
    raise exception 'deposit cannot be more than the package total';
  end if;

  if p ? 'balance_due_days' and jsonb_typeof(p->'balance_due_days') not in ('number', 'null') then
    raise exception 'balance due days must be a number';
  end if;
  v_days := coalesce((p->>'balance_due_days')::numeric, 0)::integer;
  if v_days < 0 or v_days > 365
     or coalesce((p->>'balance_due_days')::numeric, 0) <> trunc(coalesce((p->>'balance_due_days')::numeric, 0)) then
    raise exception 'balance due days must be a whole number from 0 to 365';
  end if;

  return jsonb_build_object(
    'mode', 'structured',
    'base_price', v_base,
    'included_guests', v_incl,
    'extra_guest_price', v_extra,
    'service_charge_pct', v_pct,
    'service_charge_label', v_label,
    'deposit_amount', v_dep,
    'balance_due_days', v_days,
    'notes', v_notes
  );
end $$;

-- Reservation numbers for normalized terms. Pure; the snapshot stores the result.
create function public.tp_reservation_math(p_terms jsonb, p_guests integer, p_event_date date) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare
  v_extra_n integer; v_extras numeric; v_sub numeric; v_svc numeric; v_total numeric; v_dep numeric;
begin
  if p_terms is null then return null; end if;
  if p_terms->>'mode' = 'free_text' then
    return jsonb_build_object('mode', 'free_text', 'terms', p_terms);
  end if;
  if p_guests is null then
    return jsonb_build_object('mode', 'structured', 'terms', p_terms, 'guest_count', null);
  end if;

  v_extra_n := greatest(p_guests - (p_terms->>'included_guests')::integer, 0);
  v_extras  := v_extra_n * (p_terms->>'extra_guest_price')::numeric;
  v_sub     := (p_terms->>'base_price')::numeric + v_extras;
  v_svc     := round(v_sub * (p_terms->>'service_charge_pct')::numeric / 100, 2);
  v_total   := v_sub + v_svc;
  v_dep     := (p_terms->>'deposit_amount')::numeric;

  return jsonb_build_object(
    'mode',             'structured',
    'terms',            p_terms,
    'guest_count',      p_guests,
    'extra_guests',     v_extra_n,
    'extras_total',     v_extras,
    'subtotal',         v_sub,
    'service_charge',   v_svc,
    'total',            v_total,
    'deposit',          v_dep,
    'balance',          v_total - v_dep,
    'balance_due_date', case when p_event_date is null then null
                             else p_event_date - (p_terms->>'balance_due_days')::integer end
  );
end $$;

-- A package version's pricing terms must be valid whenever it is submitted or published.
create or replace function public.tpv_validate(p_version_id uuid, p_publishing boolean) returns void
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
  perform public.tp_normalize_pricing_terms(
    (select pricing_terms from public.theme_package_versions where id = p_version_id));
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

-- request_kind is server-set and immutable (adds to the existing package guard).
create or replace function public.plan_requests_package_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_client boolean := coalesce(auth.role(), 'service_role') in ('anon','authenticated');
begin
  if tg_op = 'INSERT' then
    if v_client and (new.request_source <> 'plan_my_event'
                     or new.package_snapshot is not null
                     or new.selected_package_id is not null
                     or new.coordinator_id is not null
                     or new.fulfillment_mode is not null
                     or new.request_kind is not null) then
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
    if new.request_kind is distinct from old.request_kind then
      raise exception 'request_kind cannot change';
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

revoke all on function public.tp_normalize_pricing_terms(jsonb) from public, anon, authenticated;
revoke all on function public.tp_reservation_math(jsonb, integer, date) from public, anon, authenticated;
grant execute on function public.tp_normalize_pricing_terms(jsonb) to service_role;
grant execute on function public.tp_reservation_math(jsonb, integer, date) to service_role;

-- and creating a new draft from the live version carries the pricing terms over.

create or replace function public.theme_package_save_draft(
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
                               'magazine_url','min_guests','max_guests','price_note','pricing_terms')) then
      raise exception 'meta contains an unknown field';
    end if;
    if p_meta ? 'title' and btrim(coalesce(p_meta->>'title', '')) = '' then
      raise exception 'title is required';
    end if;
    if (p_meta ? 'min_guests' and jsonb_typeof(p_meta->'min_guests') not in ('number', 'null'))
       or (p_meta ? 'max_guests' and jsonb_typeof(p_meta->'max_guests') not in ('number', 'null')) then
      raise exception 'guest limits must be numbers';
    end if;
    if p_meta ? 'pricing_terms' then
      perform public.tp_normalize_pricing_terms(p_meta->'pricing_terms');
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
    pricing_terms   = case when p_meta ? 'pricing_terms' then public.tp_normalize_pricing_terms(p_meta->'pricing_terms') else pricing_terms end,
    revision        = revision + 1,
    updated_by      = p_actor
  where id = p_version_id
  returning revision into v_rev;

  return v_rev;
end $$;

revoke all on function public.theme_package_save_draft(uuid, uuid, integer, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.theme_package_save_draft(uuid, uuid, integer, jsonb, jsonb) to service_role;

create or replace function public.theme_package_create_draft(p_package_id uuid, p_created_by uuid) returns uuid
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
     min_guests, max_guests, price_note, pricing_terms, created_by)
  values
    (p_package_id, v_src.title, v_src.subtitle, v_src.description, v_src.cover_image_url,
     v_src.magazine_url, v_src.min_guests, v_src.max_guests, v_src.price_note, v_src.pricing_terms, p_created_by)
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


create or replace function public.theme_package_build_snapshot(
  p_version_id uuid, p_selection jsonb, p_guest_count integer, p_event_date date
) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v public.theme_package_versions; pkg public.theme_packages;
  comp record; o public.theme_package_component_options;
  ci public.catalog_items; svc public.vendor_services;
  sel jsonb; comps jsonb; v_included boolean; v_opt uuid;
  v_treat text; v_line numeric; v_note text; v_status text;
  items jsonb := '[]'::jsonb; excluded jsonb := '[]'::jsonb;
  subtotal numeric := 0; unpriced integer := 0;
begin
  select * into v from public.theme_package_versions where id = p_version_id;
  if not found then raise exception 'package version not found'; end if;
  select * into pkg from public.theme_packages where id = v.package_id;

  if v.status <> 'approved' or pkg.status <> 'active' or pkg.live_version_id is distinct from v.id then
    raise exception 'package version is not available for requests';
  end if;
  if p_guest_count is not null and p_guest_count < 1 then
    raise exception 'guest count must be at least 1';
  end if;
  if p_guest_count is not null and ((v.min_guests is not null and p_guest_count < v.min_guests)
                                 or (v.max_guests is not null and p_guest_count > v.max_guests)) then
    raise exception 'guest count is outside this package''s range';
  end if;
  if p_event_date is not null and p_event_date < current_date then
    raise exception 'event date is in the past';
  end if;

  comps := coalesce(p_selection->'components', '[]'::jsonb);
  if jsonb_typeof(comps) <> 'array' then
    raise exception 'selection.components must be an array';
  end if;
  if exists (select 1 from jsonb_array_elements(comps) e
             where not exists (select 1 from public.theme_package_components c
                               where c.version_id = v.id and c.id::text = e->>'component_id')) then
    raise exception 'selection references a component that is not part of this package';
  end if;

  for comp in select * from public.theme_package_components
              where version_id = v.id order by sort_order, created_at loop
    v_note := null;
    select e into sel from jsonb_array_elements(comps) e where e->>'component_id' = comp.id::text limit 1;

    if comp.requirement = 'required' and (sel->>'included') = 'false' then
      raise exception 'required component "%" cannot be removed', comp.slot_label;
    end if;

    v_included := case comp.requirement
      when 'required'     then true
      when 'optional_on'  then coalesce((sel->>'included')::boolean, true)
      else                     coalesce((sel->>'included')::boolean, false)
    end;

    if not v_included then
      excluded := excluded || jsonb_build_object('component_id', comp.id, 'slot_label', comp.slot_label);
      continue;
    end if;

    v_opt := coalesce((sel->>'option_id')::uuid,
                      (select id from public.theme_package_component_options
                        where component_id = comp.id and is_default));
    select * into o from public.theme_package_component_options where id = v_opt and component_id = comp.id;
    if not found then
      raise exception 'selected option does not belong to component "%"', comp.slot_label;
    end if;

    perform public.tp_check_option_fulfillable(o.catalog_item_id, o.service_id);
    select * into ci  from public.catalog_items   where id = o.catalog_item_id;
    select * into svc from public.vendor_services where id = o.service_id;

    if o.service_id is null then
      v_treat := 'quote'; v_line := null; v_note := 'vendor to be assigned';
    else
      if svc.pricing_model in ('bogo','perk') then
        raise exception 'promotional services cannot be package components';
      end if;
      select price_treatment into v_treat from public.catalog_item_services
       where catalog_item_id = o.catalog_item_id and service_id = o.service_id and status = 'approved';
      v_treat := coalesce(v_treat, 'quote');
      if v_treat = 'free' then
        v_line := 0; v_note := 'included at no charge';
      elsif v_treat = 'listed' and coalesce(svc.price, 0) > 0 then
        if svc.pricing_model = 'per_person' then
          if p_guest_count is null then
            v_line := null; v_note := 'per-person price needs a guest count';
          else
            v_line := svc.price * p_guest_count * comp.quantity;
          end if;
        else
          v_line := svc.price * comp.quantity;
        end if;
      else
        v_line := null; v_note := 'price on request';
      end if;
    end if;

    if v_line is null then
      unpriced := unpriced + 1; v_status := 'quote';
    else
      subtotal := subtotal + v_line;
      v_status := case when v_treat = 'free' then 'free' else 'priced' end;
    end if;

    items := items || jsonb_build_object(
      'component_id',      comp.id,
      'slot_label',        comp.slot_label,
      'option_id',         o.id,
      'catalog_item_id',   ci.id,
      'catalog_item_name', ci.name,
      'item_type',         ci.item_type,
      'service_id',        o.service_id,
      'service_title',     svc.title,
      'partner_id',        svc.partner_id,
      'vendor_id',         svc.vendor_id,
      'quantity',          comp.quantity,
      'listed_price',      svc.price,
      'pricing_model',     svc.pricing_model,
      'price_treatment',   v_treat,
      'price_status',      v_status,
      'line_total',        v_line,
      'price_note',        v_note,
      'guest_fit',         (p_guest_count is null
                            or ((svc.min_guests is null or p_guest_count >= svc.min_guests)
                            and (svc.max_guests is null or p_guest_count <= svc.max_guests)))
    );
  end loop;

  return jsonb_build_object(
    'snapshot_version',   3,
    'package_id',         pkg.id,
    'package_key',        pkg.key,
    'package_version_id', v.id,
    'version_number',     v.version_number,
    'title',              v.title,
    'occasion',           pkg.occasion,
    'guest_count',        p_guest_count,
    'event_date',         p_event_date,
    'items',              items,
    'excluded',           excluded,
    'listed_subtotal',    subtotal,
    'unpriced_items',     unpriced,
    'reservation',        public.tp_reservation_math(v.pricing_terms, p_guest_count, p_event_date),
    'captured_at',        now()
  );
end $$;

drop function public.theme_package_create_request(uuid, uuid, jsonb, date, integer, text, text, text);

create function public.theme_package_create_request(
  p_user_id uuid, p_version_id uuid, p_selection jsonb, p_event_date date,
  p_guest_count integer, p_budget_range text, p_notes text, p_contact_email text,
  p_event_type text default null, p_intent text default 'quote'
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_snap jsonb; v_req uuid; v_kind text; v_event_type text;
  comp record; v_in boolean; v_opt text;
begin
  if p_user_id is null or not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'unknown user' using errcode = '42501';
  end if;
  if p_intent is null or p_intent not in ('reserve', 'quote') then
    raise exception 'invalid request type';
  end if;

  v_snap := public.theme_package_build_snapshot(p_version_id, p_selection, p_guest_count, p_event_date);

  if p_intent = 'reserve' then
    if v_snap->'reservation' is null or jsonb_typeof(v_snap->'reservation') = 'null' then
      raise exception 'this package cannot be reserved directly; request a quote instead';
    end if;
    if p_guest_count is null or p_event_date is null then
      raise exception 'a reservation needs an event date and a guest count';
    end if;
    -- A reservation is the package exactly as curated: defaults only, no add-ons, nothing removed.
    for comp in select * from public.theme_package_components where version_id = p_version_id loop
      select exists (select 1 from jsonb_array_elements(v_snap->'items') i
                      where i->>'component_id' = comp.id::text) into v_in;
      if (comp.requirement = 'optional_off' and v_in) or (comp.requirement = 'optional_on' and not v_in) then
        raise exception 'a customized package is requested as a quote, not a reservation';
      end if;
      if v_in then
        select i->>'option_id' into v_opt from jsonb_array_elements(v_snap->'items') i
         where i->>'component_id' = comp.id::text limit 1;
        if v_opt is distinct from (select o.id::text from public.theme_package_component_options o
                                    where o.component_id = comp.id and o.is_default) then
          raise exception 'a customized package is requested as a quote, not a reservation';
        end if;
      end if;
    end loop;
    v_kind := 'reserve';
  else
    v_kind := 'custom_quote';
  end if;

  v_event_type := coalesce(nullif(btrim(p_event_type), ''), v_snap->>'occasion');
  if length(v_event_type) > 80 or v_event_type ~ '[[:cntrl:]]' then
    raise exception 'event type must be at most 80 characters with no control characters';
  end if;

  insert into public.plan_requests
    (user_id, event_type, event_date, budget_range, guest_count, has_venue,
     selected_service_ids, selected_package_id, needs, notes, contact_email, status,
     request_source, package_snapshot, fulfillment_mode, request_kind)
  values
    (p_user_id, v_event_type, p_event_date, p_budget_range, p_guest_count::text,
     exists (select 1 from jsonb_array_elements(v_snap->'items') i where i->>'item_type' = 'venue'),
     (select coalesce(array_agg(distinct (i->>'service_id')::uuid) filter (where i->>'service_id' is not null), '{}')
        from jsonb_array_elements(v_snap->'items') i),
     p_version_id, '{}'::jsonb, p_notes, p_contact_email, 'pending',
     'theme_package', v_snap, 'hybrid', v_kind)
  returning id into v_req;

  insert into public.plan_request_recipients (request_id, partner_id, vendor_id, service_ids)
  select v_req,
         (max(i->>'partner_id'))::uuid,
         (max(i->>'vendor_id'))::uuid,
         array_agg(distinct (i->>'service_id')::uuid)
    from jsonb_array_elements(v_snap->'items') i
   where i->>'service_id' is not null
   group by coalesce(i->>'partner_id', i->>'vendor_id');

  return v_req;
end $$;

revoke all on function public.theme_package_create_request(uuid, uuid, jsonb, date, integer, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.theme_package_create_request(uuid, uuid, jsonb, date, integer, text, text, text, text, text) to service_role;
