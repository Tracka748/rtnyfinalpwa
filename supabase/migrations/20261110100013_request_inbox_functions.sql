-- Part 4a: inbox list / unread / mark-read
begin;

create or replace function public.request_inbox_can_view(p_actor uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_actor is not null
     and (public.tp_is_admin(p_actor)
          or public.specialist_can(p_actor, 'events.requests.view', 'allow'));
$$;

create or replace function public.request_inbox_visible(p_actor uuid, p_request_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.request_inbox_can_view(p_actor)
     and (public.tp_is_admin(p_actor)
          or exists (select 1 from public.plan_requests r
                      where r.id = p_request_id and r.coordinator_id = p_actor)
          or exists (select 1 from public.request_notifications n
                      where n.request_id = p_request_id and n.audience = 'staff'
                        and n.recipient_user_id = p_actor));
$$;

create or replace function public.request_inbox_list(
  p_actor uuid, p_scope text default 'all', p_status text default null,
  p_limit int default 25, p_offset int default 0)
returns table (
  request_id uuid, created_at timestamptz, request_source text, request_kind text,
  type_label text, status text, event_type text, event_date date, guest_count text,
  title text, owner_id uuid, owner_name text, is_owner boolean, unread boolean, total_count bigint)
language plpgsql stable security definer set search_path = '' as $$
declare v_admin boolean;
begin
  if not public.request_inbox_can_view(p_actor) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_scope is null or p_scope not in ('all','mine','unassigned') then
    raise exception 'invalid scope' using errcode = '22023';
  end if;
  if p_status is not null and p_status not in ('pending','in_progress','date_confirmed',
     'deposit_requested','deposit_received','completed','declined','cancelled') then
    raise exception 'invalid status' using errcode = '22023';
  end if;
  v_admin := public.tp_is_admin(p_actor);

  return query
  select r.id, r.created_at, r.request_source, r.request_kind,
         case when r.request_source = 'plan_my_event' then 'Plan My Event request'
              when r.request_source = 'theme_package' then
                case r.request_kind when 'reserve' then 'Package reservation request'
                                    when 'custom_quote' then 'Package custom quote request'
                                    else 'Package request' end
              else 'Request' end,
         r.status, r.event_type, r.event_date, r.guest_count,
         nullif(r.package_snapshot->>'title', ''),
         r.coordinator_id,
         nullif(btrim(coalesce(o.first_name,'') || ' ' || coalesce(o.last_name,'')), ''),
         coalesce(r.coordinator_id = p_actor, false),
         exists (select 1 from public.request_notifications n
                  where n.request_id = r.id and n.audience = 'staff'
                    and n.recipient_user_id = p_actor and n.read_at is null),
         count(*) over ()
  from public.plan_requests r
  left join public.profiles o on o.id = r.coordinator_id
  where (v_admin or r.coordinator_id = p_actor
         or exists (select 1 from public.request_notifications n2
                     where n2.request_id = r.id and n2.audience = 'staff'
                       and n2.recipient_user_id = p_actor))
    and (p_scope = 'all'
         or (p_scope = 'mine' and r.coordinator_id = p_actor)
         or (p_scope = 'unassigned' and r.coordinator_id is null))
    and (p_status is null or r.status = p_status)
  order by r.created_at desc
  limit greatest(1, least(coalesce(p_limit, 25), 100))
  offset greatest(coalesce(p_offset, 0), 0);
end $$;

create or replace function public.request_inbox_unread_count(p_actor uuid)
returns int language plpgsql stable security definer set search_path = '' as $$
declare v int;
begin
  if not public.request_inbox_can_view(p_actor) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select count(*)::int into v from public.request_notifications n
  where n.audience = 'staff' and n.recipient_user_id = p_actor and n.read_at is null;
  return v;
end $$;

create or replace function public.request_inbox_mark_read(p_actor uuid, p_request_id uuid)
returns int language plpgsql security definer set search_path = '' as $$
declare v int;
begin
  if not public.request_inbox_can_view(p_actor) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.request_notifications n set read_at = now()
   where n.request_id = p_request_id and n.audience = 'staff'
     and n.recipient_user_id = p_actor and n.read_at is null;
  get diagnostics v = row_count;
  return v;
end $$;

revoke all on function public.request_inbox_can_view(uuid) from public, anon, authenticated;
revoke all on function public.request_inbox_visible(uuid, uuid) from public, anon, authenticated;
revoke all on function public.request_inbox_list(uuid, text, text, int, int) from public, anon, authenticated;
revoke all on function public.request_inbox_unread_count(uuid) from public, anon, authenticated;
revoke all on function public.request_inbox_mark_read(uuid, uuid) from public, anon, authenticated;
grant execute on function public.request_inbox_can_view(uuid) to service_role;
grant execute on function public.request_inbox_visible(uuid, uuid) to service_role;
grant execute on function public.request_inbox_list(uuid, text, text, int, int) to service_role;
grant execute on function public.request_inbox_unread_count(uuid) to service_role;
grant execute on function public.request_inbox_mark_read(uuid, uuid) to service_role;

commit;


-- Part 4b: inbox detail with PII redaction
begin;

create or replace function public.request_inbox_detail(p_actor uuid, p_request_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  r public.plan_requests;
  v_admin boolean; v_manage boolean; v_pii boolean;
  v_pkg jsonb; v_contact jsonb; v_owner_name text;
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
    'package', v_pkg, 'contact', v_contact, 'contact_redacted', v_contact is null);
end $$;

revoke all on function public.request_inbox_detail(uuid, uuid) from public, anon, authenticated;
grant execute on function public.request_inbox_detail(uuid, uuid) to service_role;

commit;
