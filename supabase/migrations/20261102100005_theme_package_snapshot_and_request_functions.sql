-- Server-side snapshot builder and package request creation (service_role only).
-- Already applied via Supabase SQL Editor on 2026-11-02; this file is the repo record.

create function public.theme_package_build_snapshot(
  p_version_id uuid, p_selection jsonb, p_guest_count integer, p_event_date date
) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v public.theme_package_versions; pkg public.theme_packages;
  comp record; o public.theme_package_component_options;
  ci public.catalog_items; svc public.vendor_services;
  sel jsonb; comps jsonb; v_included boolean; v_opt uuid;
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

    if svc.price is not null then
      subtotal := subtotal + svc.price * comp.quantity;
    elsif o.service_id is not null then
      unpriced := unpriced + 1;
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
      'guest_fit',         (p_guest_count is null
                            or ((svc.min_guests is null or p_guest_count >= svc.min_guests)
                            and (svc.max_guests is null or p_guest_count <= svc.max_guests)))
    );
  end loop;

  return jsonb_build_object(
    'snapshot_version',   1,
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
    'captured_at',        now()
  );
end $$;

create function public.theme_package_create_request(
  p_user_id uuid, p_version_id uuid, p_selection jsonb, p_event_date date,
  p_guest_count integer, p_budget_range text, p_notes text, p_contact_email text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_snap jsonb; v_req uuid;
begin
  if p_user_id is null or not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'unknown user' using errcode = '42501';
  end if;

  v_snap := public.theme_package_build_snapshot(p_version_id, p_selection, p_guest_count, p_event_date);

  insert into public.plan_requests
    (user_id, event_type, event_date, budget_range, guest_count, has_venue,
     selected_service_ids, selected_package_id, needs, notes, contact_email, status,
     request_source, package_snapshot, fulfillment_mode)
  values
    (p_user_id, v_snap->>'occasion', p_event_date, p_budget_range, p_guest_count::text,
     exists (select 1 from jsonb_array_elements(v_snap->'items') i where i->>'item_type' = 'venue'),
     (select coalesce(array_agg(distinct (i->>'service_id')::uuid) filter (where i->>'service_id' is not null), '{}')
        from jsonb_array_elements(v_snap->'items') i),
     p_version_id, '{}'::jsonb, p_notes, p_contact_email, 'pending',
     'theme_package', v_snap, 'hybrid')
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

revoke all on function public.theme_package_build_snapshot(uuid, jsonb, integer, date) from public, anon, authenticated;
revoke all on function public.theme_package_create_request(uuid, uuid, jsonb, date, integer, text, text, text) from public, anon, authenticated;
grant execute on function public.theme_package_build_snapshot(uuid, jsonb, integer, date) to service_role;
grant execute on function public.theme_package_create_request(uuid, uuid, jsonb, date, integer, text, text, text) to service_role;
