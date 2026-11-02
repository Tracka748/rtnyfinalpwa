-- Catalog link price treatment (listed / free / quote), promo exclusion, snapshot v2 pricing rules.
-- Already applied via Supabase SQL Editor on 2026-11-02; this file is the repo record.

alter table public.catalog_item_services
  add column price_treatment text not null default 'quote'
    check (price_treatment in ('listed','free','quote'));

create or replace function public.catalog_item_services_guard() returns trigger
language plpgsql set search_path = '' as $$
declare v_model text; v_price numeric;
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

  select pricing_model, price into v_model, v_price from public.vendor_services where id = new.service_id;

  if v_model in ('bogo','perk') and (tg_op = 'INSERT' or new.status = 'approved') then
    raise exception 'promotional services (bogo/perk) cannot be linked to catalog items';
  end if;

  if new.status = 'approved' then
    if new.price_treatment = 'listed' and coalesce(v_price, 0) <= 0 then
      raise exception 'a listed price needs a service price above zero; use free or quote instead';
    elsif new.price_treatment = 'free' and coalesce(v_price, 0) <> 0 then
      raise exception 'free items must have a service price of zero; use listed or quote instead';
    end if;
  end if;
  return new;
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
    'snapshot_version',   2,
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
