-- Part 7: activity timeline in request_inbox_detail; quote guard block list
begin;

create or replace function public.request_inbox_detail(p_actor uuid, p_request_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  r public.plan_requests;
  v_admin boolean; v_manage boolean; v_pii boolean;
  v_pkg jsonb; v_contact jsonb; v_owner_name text; v_activity jsonb;
  v_first text; v_last text; v_phone text; v_email text;
  s jsonb;
begin
  if not public.request_inbox_can_view(p_actor) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if not public.request_inbox_visible(p_actor, p_request_id) then
    return null;
  end if;
  select * into r from public.plan_requests where id = p_request_id;
  if not found then return null; end if;

  v_admin  := public.tp_is_admin(p_actor);
  v_manage := v_admin or public.specialist_can(p_actor, 'events.requests.manage', 'allow');
  v_pii    := v_admin or (r.coordinator_id is not null and r.coordinator_id = p_actor and v_manage);

  s := r.package_snapshot;
  if s is not null then
    v_pkg := jsonb_build_object(
      'title', s->>'title',
      'occasion', s->>'occasion',
      'version_number', s->'version_number',
      'listed_subtotal', s->'listed_subtotal',
      'unpriced_items', s->'unpriced_items',
      'excluded_count', case when jsonb_typeof(s->'excluded') = 'array'
                             then jsonb_array_length(s->'excluded') else 0 end,
      'items', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'name', coalesce(i.value->>'catalog_item_name', i.value->>'service_title'),
                 'service_title', i.value->>'service_title',
                 'item_type', i.value->>'item_type',
                 'slot_label', i.value->>'slot_label',
                 'quantity', i.value->'quantity',
                 'listed_price', i.value->'listed_price',
                 'line_total', i.value->'line_total',
                 'price_status', i.value->>'price_status',
                 'price_treatment', i.value->>'price_treatment',
                 'pricing_model', i.value->>'pricing_model',
                 'guest_fit', i.value->'guest_fit') order by i.ord)
        from jsonb_array_elements(case when jsonb_typeof(s->'items') = 'array'
                                       then s->'items' else '[]'::jsonb end)
             with ordinality as i(value, ord)), '[]'::jsonb),
      'reservation', case when jsonb_typeof(s->'reservation') = 'object' then
        jsonb_build_object(
          'mode', s->'reservation'->'mode',
          'guest_count', s->'reservation'->'guest_count',
          'extra_guests', s->'reservation'->'extra_guests',
          'extras_total', s->'reservation'->'extras_total',
          'subtotal', s->'reservation'->'subtotal',
          'service_charge', s->'reservation'->'service_charge',
          'total', s->'reservation'->'total',
          'deposit', s->'reservation'->'deposit',
          'balance', s->'reservation'->'balance',
          'balance_due_date', s->'reservation'->'balance_due_date')
        else null end,
      'reservation_label', case when r.request_kind = 'custom_quote'
                                then 'curated price for reference' else 'reservation total' end);
  end if;

  if v_pii then
    select pr.first_name, pr.last_name, pr.phone into v_first, v_last, v_phone
    from public.profiles pr where pr.id = r.user_id;
    select au.email into v_email from auth.users au
    where au.id = r.user_id and au.email_confirmed_at is not null;
    v_contact := jsonb_build_object(
      'name', nullif(btrim(coalesce(v_first,'') || ' ' || coalesce(v_last,'')), ''),
      'phone', v_phone,
      'email', coalesce(v_email, r.contact_email),
      'email_verified', v_email is not null,
      'guest', r.user_id is null,
      'notes', r.notes);
  end if;

  if r.coordinator_id is not null then
    select nullif(btrim(coalesce(o.first_name,'') || ' ' || coalesce(o.last_name,'')), '')
      into v_owner_name from public.profiles o where o.id = r.coordinator_id;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', a.id, 'created_at', a.created_at, 'action', a.action,
           'actor', nullif(btrim(coalesce(ap.first_name,'') || ' ' || coalesce(ap.last_name,'')), ''),
           'from_status', a.from_status, 'to_status', a.to_status,
           'from_owner', nullif(btrim(coalesce(fp.first_name,'') || ' ' || coalesce(fp.last_name,'')), ''),
           'to_owner', nullif(btrim(coalesce(tp.first_name,'') || ' ' || coalesce(tp.last_name,'')), ''),
           'reason', case when v_pii then a.reason end,
           'note', case when v_pii then a.note end)
           order by a.created_at, a.id), '[]'::jsonb)
    into v_activity
  from (select x.* from public.request_activity x
        where x.request_id = r.id
        order by x.created_at desc, x.id desc limit 200) a
  left join public.profiles ap on ap.id = a.actor_id
  left join public.profiles fp on fp.id = a.from_owner
  left join public.profiles tp on tp.id = a.to_owner;

  return jsonb_build_object(
    'id', r.id, 'created_at', r.created_at, 'status', r.status,
    'request_source', r.request_source, 'request_kind', r.request_kind,
    'type_label', case when r.request_source = 'plan_my_event' then 'Plan My Event request'
                       when r.request_source = 'theme_package' then
                         case r.request_kind when 'reserve' then 'Package reservation request'
                                             when 'custom_quote' then 'Package custom quote request'
                                             else 'Package request' end
                       else 'Request' end,
    'event_type', r.event_type, 'event_date', r.event_date, 'guest_count', r.guest_count,
    'budget_range', r.budget_range, 'has_venue', r.has_venue, 'estimated_total', r.estimated_total,
    'owner', case when r.coordinator_id is null then null
                  else jsonb_build_object('id', r.coordinator_id, 'name', v_owner_name) end,
    'is_owner', coalesce(r.coordinator_id = p_actor, false),
    'is_admin', v_admin, 'can_manage', v_manage,
    'package', v_pkg, 'contact', v_contact, 'contact_redacted', v_contact is null,
    'activity', v_activity, 'activity_redacted', not v_pii);
end $$;

create or replace function public.plan_request_quotes_guard()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare r public.plan_request_recipients; v_req_status text; v_owner uuid;
begin
  select * into r from public.plan_request_recipients where id = new.recipient_id;
  if not found then raise exception 'recipient not found'; end if;
  new.request_id := r.request_id;

  select status into v_req_status from public.plan_requests where id = r.request_id;
  if v_req_status in ('cancelled','declined','completed','deposit_received','booked') then
    raise exception 'request is % and no longer accepts quotes', v_req_status;
  end if;

  if new.entered_on_behalf then
    if not (public.tp_is_admin(new.entered_by)
            or public.specialist_can(new.entered_by, 'partners.quotes.enter', 'allow')) then
      raise exception 'not permitted to enter quotes on behalf of a partner' using errcode = '42501';
    end if;
  else
    select owner_id into v_owner from public.partners where id = r.partner_id;
    if v_owner is null or v_owner <> new.entered_by then
      raise exception 'only the responsible partner can submit its own quote' using errcode = '42501';
    end if;
  end if;

  new.revision_number := coalesce((select max(revision_number) from public.plan_request_quotes
                                   where recipient_id = new.recipient_id), 0) + 1;

  update public.plan_request_recipients
     set status = case new.status when 'declined' then 'declined' when 'submitted' then 'quoted' else status end,
         responded_at = now()
   where id = r.id;
  return new;
end $$;

commit;
