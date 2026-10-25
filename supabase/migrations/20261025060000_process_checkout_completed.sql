alter table public.orders
  add column if not exists needs_review boolean not null default false,
  add column if not exists review_reason text;

drop index if exists public.orders_session_id_idx;
drop index if exists public.idx_orders_session_id;
create unique index if not exists orders_session_id_key
  on public.orders (session_id);

create or replace function public.process_checkout_completed(
  p_order jsonb, p_tickets jsonb, p_items jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_item record;
  v_remaining integer;
  v_reasons text[] := '{}';
begin
  insert into orders (
    id, user_id, event_id, order_number, subtotal, total_amount, fees,
    discount_amount, tax_amount, customer_email, payment_intent_id,
    transaction_id, session_id, payment_status, payment_method, status,
    completed_at, promo_code_id, crew_id
  ) values (
    (p_order->>'id')::uuid, (p_order->>'user_id')::uuid,
    (p_order->>'event_id')::uuid, p_order->>'order_number',
    (p_order->>'subtotal')::numeric, (p_order->>'total_amount')::numeric,
    (p_order->>'fees')::numeric, 0, 0,
    coalesce(p_order->>'customer_email', ''), p_order->>'payment_intent_id',
    p_order->>'session_id', p_order->>'session_id',
    'captured', 'card', 'completed', now(), null,
    nullif(p_order->>'crew_id', '')::uuid
  )
  on conflict (session_id) do nothing
  returning id into v_order_id;

  -- Stripe retry: order already exists, nothing more to do
  if v_order_id is null then
    select id into v_order_id from orders
      where session_id = p_order->>'session_id';
    return jsonb_build_object('order_id', v_order_id, 'duplicate', true,
                              'needs_review', false);
  end if;

  -- Lock ticket types in stable order (avoids deadlocks), clamp at 0
  for v_item in
    select (e->>'ticketTypeId')::uuid as id, sum((e->>'quantity')::int) as qty
    from jsonb_array_elements(p_items) e
    where e->>'ticketTypeId' is not null
    group by 1 order by 1
  loop
    select remaining into v_remaining
      from ticket_types where id = v_item.id for update;
    if not found then
      v_reasons := array_append(v_reasons, 'ticket_type ' || v_item.id || ' missing');
      continue;
    end if;
    if v_remaining < v_item.qty then
      v_reasons := array_append(v_reasons, format(
        'oversold ticket_type %s: had %s, bought %s', v_item.id, v_remaining, v_item.qty));
    end if;
    update ticket_types
      set remaining = greatest(remaining - v_item.qty, 0), updated_at = now()
      where id = v_item.id;
  end loop;

  insert into tickets (
    event_id, order_id, ticket_type, ticket_number, base_price, purchase_price,
    purchased_by, purchase_date, payment_intent_id, confirmation_code,
    qr_code_data, status
  )
  select t.event_id, v_order_id, t.ticket_type, t.ticket_number, t.base_price,
         t.purchase_price, t.purchased_by, now(), t.payment_intent_id,
         t.confirmation_code, t.qr_code_data, 'purchased'
  from jsonb_to_recordset(p_tickets) as t(
    event_id uuid, ticket_type text, ticket_number text, base_price numeric,
    purchase_price numeric, purchased_by uuid, payment_intent_id text,
    confirmation_code text, qr_code_data text);

  if array_length(v_reasons, 1) > 0 then
    update orders set needs_review = true,
      review_reason = array_to_string(v_reasons, '; ')
      where id = v_order_id;
  end if;

  return jsonb_build_object('order_id', v_order_id, 'duplicate', false,
    'needs_review', coalesce(array_length(v_reasons, 1), 0) > 0,
    'reasons', to_jsonb(v_reasons));
end;
$$;

revoke all on function public.process_checkout_completed(jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.process_checkout_completed(jsonb, jsonb, jsonb) to service_role;
