-- Part 6a: lifecycle loader, claim, assign
begin;

create or replace function public.request_lifecycle_load(
  p_actor uuid, p_request_id uuid, p_admin_only boolean default false)
returns public.plan_requests
language plpgsql security definer set search_path = '' as $$
declare r public.plan_requests;
begin
  if p_actor is null or not public.specialist_can(p_actor, 'events.requests.manage', 'allow') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_admin_only and not public.tp_is_admin(p_actor) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if not public.request_inbox_visible(p_actor, p_request_id) then
    raise exception 'request not found' using errcode = 'RQ404';
  end if;
  select * into r from public.plan_requests where id = p_request_id for update;
  if not found then
    raise exception 'request not found' using errcode = 'RQ404';
  end if;
  return r;
end $$;

create or replace function public.request_claim(p_actor uuid, p_request_id uuid)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r public.plan_requests; v_to text; v_act uuid;
begin
  r := public.request_lifecycle_load(p_actor, p_request_id, false);
  if r.status in ('completed','declined','cancelled') then
    raise exception 'request is closed' using errcode = 'RQ409';
  end if;
  if r.coordinator_id is not null then
    raise exception 'request already has an owner' using errcode = 'RQ409';
  end if;
  v_to := case when r.status = 'pending' then 'in_progress' else r.status end;

  insert into public.request_activity (request_id, actor_id, action, from_status, to_status, to_owner)
  values (r.id, p_actor, 'claimed', r.status, v_to, p_actor) returning id into v_act;

  perform set_config('rtny.lifecycle', 'on', true);
  update public.plan_requests
     set status = v_to, coordinator_id = p_actor, unowned_since = null
   where id = r.id;
  perform set_config('rtny.lifecycle', 'off', true);

  return jsonb_build_object('status', v_to, 'owner_id', p_actor, 'activity_id', v_act);
end $$;

create or replace function public.request_assign(
  p_actor uuid, p_request_id uuid, p_assignee uuid, p_reason text default null)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  r public.plan_requests; v_to text; v_act uuid;
  v_reason text := nullif(btrim(p_reason), '');
begin
  r := public.request_lifecycle_load(p_actor, p_request_id, true);
  if v_reason is not null and length(v_reason) > 500 then
    raise exception 'reason is too long' using errcode = 'RQ422';
  end if;
  if p_assignee is null
     or not public.specialist_can(p_assignee, 'events.requests.manage', 'allow') then
    raise exception 'assignee cannot manage requests' using errcode = 'RQ422';
  end if;
  if r.status in ('completed','declined','cancelled') then
    raise exception 'request is closed' using errcode = 'RQ409';
  end if;
  if r.coordinator_id is not null then
    raise exception 'request already has an owner' using errcode = 'RQ409';
  end if;
  v_to := case when r.status = 'pending' then 'in_progress' else r.status end;

  insert into public.request_activity
    (request_id, actor_id, action, from_status, to_status, to_owner, reason)
  values (r.id, p_actor, 'assigned', r.status, v_to, p_assignee, v_reason) returning id into v_act;

  perform set_config('rtny.lifecycle', 'on', true);
  update public.plan_requests
     set status = v_to, coordinator_id = p_assignee, unowned_since = null
   where id = r.id;
  perform set_config('rtny.lifecycle', 'off', true);

  if p_assignee <> p_actor then
    insert into public.request_notifications (request_id, audience, recipient_user_id, kind, dedupe_key)
    values (r.id, 'staff', p_assignee, 'assigned', 'assigned:' || v_act::text);
  end if;

  return jsonb_build_object('status', v_to, 'owner_id', p_assignee, 'activity_id', v_act);
end $$;

revoke all on function public.request_lifecycle_load(uuid, uuid, boolean)
  from public, anon, authenticated, service_role;
revoke all on function public.request_claim(uuid, uuid) from public, anon, authenticated;
revoke all on function public.request_assign(uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.request_claim(uuid, uuid) to service_role;
grant execute on function public.request_assign(uuid, uuid, uuid, text) to service_role;

commit;


-- Part 6b: reassign, release / unassign
begin;

create or replace function public.request_reassign(
  p_actor uuid, p_request_id uuid, p_new_owner uuid, p_reason text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  r public.plan_requests; v_act uuid;
  v_reason text := nullif(btrim(p_reason), '');
begin
  r := public.request_lifecycle_load(p_actor, p_request_id, true);
  if v_reason is null then
    raise exception 'reason is required' using errcode = 'RQ422';
  end if;
  if length(v_reason) > 500 then
    raise exception 'reason is too long' using errcode = 'RQ422';
  end if;
  if r.status in ('completed','declined','cancelled') then
    raise exception 'request is closed' using errcode = 'RQ409';
  end if;
  if r.coordinator_id is null then
    raise exception 'request has no owner' using errcode = 'RQ409';
  end if;
  if p_new_owner is null or p_new_owner = r.coordinator_id
     or not public.specialist_can(p_new_owner, 'events.requests.manage', 'allow') then
    raise exception 'new owner is not valid' using errcode = 'RQ422';
  end if;

  insert into public.request_activity
    (request_id, actor_id, action, from_status, to_status, from_owner, to_owner, reason)
  values (r.id, p_actor, 'reassigned', r.status, r.status, r.coordinator_id, p_new_owner, v_reason)
  returning id into v_act;

  perform set_config('rtny.lifecycle', 'on', true);
  update public.plan_requests set coordinator_id = p_new_owner where id = r.id;
  perform set_config('rtny.lifecycle', 'off', true);

  if p_new_owner <> p_actor then
    insert into public.request_notifications (request_id, audience, recipient_user_id, kind, dedupe_key)
    values (r.id, 'staff', p_new_owner, 'assigned', 'assigned:' || v_act::text);
  end if;

  return jsonb_build_object('status', r.status, 'owner_id', p_new_owner, 'activity_id', v_act);
end $$;

create or replace function public.request_release(
  p_actor uuid, p_request_id uuid, p_reason text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  r public.plan_requests; v_to text; v_act uuid; v_action text;
  v_reason text := nullif(btrim(p_reason), '');
begin
  r := public.request_lifecycle_load(p_actor, p_request_id, false);
  if r.status in ('completed','declined','cancelled') then
    raise exception 'request is closed' using errcode = 'RQ409';
  end if;
  if r.coordinator_id is null then
    raise exception 'request has no owner' using errcode = 'RQ409';
  end if;
  if r.coordinator_id = p_actor then
    v_action := 'released';
  elsif public.tp_is_admin(p_actor) then
    v_action := 'unassigned';
  else
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_reason is null then
    raise exception 'reason is required' using errcode = 'RQ422';
  end if;
  if length(v_reason) > 500 then
    raise exception 'reason is too long' using errcode = 'RQ422';
  end if;
  v_to := case when r.status = 'in_progress' then 'pending' else r.status end;

  insert into public.request_activity
    (request_id, actor_id, action, from_status, to_status, from_owner, to_owner, reason)
  values (r.id, p_actor, v_action, r.status, v_to, r.coordinator_id, null, v_reason)
  returning id into v_act;

  perform set_config('rtny.lifecycle', 'on', true);
  update public.plan_requests
     set status = v_to, coordinator_id = null, unowned_since = clock_timestamp()
   where id = r.id;
  perform set_config('rtny.lifecycle', 'off', true);

  return jsonb_build_object('status', v_to, 'owner_id', null, 'activity_id', v_act, 'action', v_action);
end $$;

revoke all on function public.request_reassign(uuid, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.request_release(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.request_reassign(uuid, uuid, uuid, text) to service_role;
grant execute on function public.request_release(uuid, uuid, text) to service_role;

commit;


-- Part 6c: set status (incl. reopen), add note
begin;

create or replace function public.request_set_status(
  p_actor uuid, p_request_id uuid, p_to text, p_reason text default null)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  r public.plan_requests; v_act uuid; v_admin boolean;
  v_action text := 'status_changed';
  v_reason text := nullif(btrim(p_reason), '');
begin
  r := public.request_lifecycle_load(p_actor, p_request_id, false);
  v_admin := public.tp_is_admin(p_actor);

  if p_to is null
     or p_to not in ('in_progress','date_confirmed','deposit_requested','deposit_received',
                     'completed','declined','cancelled')
     or p_to = r.status then
    raise exception 'status is not valid' using errcode = 'RQ422';
  end if;
  if v_reason is not null and length(v_reason) > 500 then
    raise exception 'reason is too long' using errcode = 'RQ422';
  end if;

  if r.status in ('completed','declined','cancelled') then
    if p_to <> 'in_progress' then
      raise exception 'request is closed' using errcode = 'RQ409';
    end if;
    if not v_admin then
      raise exception 'not allowed' using errcode = '42501';
    end if;
    if v_reason is null then
      raise exception 'reason is required' using errcode = 'RQ422';
    end if;
    v_action := 'reopened';
  elsif r.status = 'pending' then
    if p_to not in ('declined','cancelled') then
      raise exception 'request must be claimed first' using errcode = 'RQ409';
    end if;
    if not v_admin then
      raise exception 'not allowed' using errcode = '42501';
    end if;
  else
    if not v_admin and r.coordinator_id is distinct from p_actor then
      raise exception 'not allowed' using errcode = '42501';
    end if;
  end if;

  insert into public.request_activity
    (request_id, actor_id, action, from_status, to_status, reason)
  values (r.id, p_actor, v_action, r.status, p_to, v_reason)
  returning id into v_act;

  perform set_config('rtny.lifecycle', 'on', true);
  update public.plan_requests
     set status = p_to,
         unowned_since = case
           when v_action = 'reopened' and r.coordinator_id is null then clock_timestamp()
           else unowned_since end
   where id = r.id;
  perform set_config('rtny.lifecycle', 'off', true);

  if v_action = 'status_changed'
     and p_to in ('date_confirmed','deposit_requested','declined','cancelled')
     and r.user_id is not null
     and exists (select 1 from auth.users u
                 where u.id = r.user_id and u.email_confirmed_at is not null) then
    insert into public.request_notifications (request_id, audience, recipient_user_id, kind, dedupe_key)
    values (r.id, 'customer', r.user_id, 'status_update', 'status:' || p_to || ':' || v_act::text);
  end if;

  return jsonb_build_object('status', p_to, 'owner_id', r.coordinator_id,
                            'activity_id', v_act, 'action', v_action);
end $$;

create or replace function public.request_add_note(
  p_actor uuid, p_request_id uuid, p_note text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  r public.plan_requests; v_act uuid;
  v_note text := nullif(btrim(p_note), '');
begin
  r := public.request_lifecycle_load(p_actor, p_request_id, false);
  if not public.tp_is_admin(p_actor) and r.coordinator_id is distinct from p_actor then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_note is null or length(v_note) > 2000 then
    raise exception 'note is not valid' using errcode = 'RQ422';
  end if;

  insert into public.request_activity (request_id, actor_id, action, note)
  values (r.id, p_actor, 'note_added', v_note) returning id into v_act;

  return jsonb_build_object('activity_id', v_act);
end $$;

revoke all on function public.request_set_status(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.request_add_note(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.request_set_status(uuid, uuid, text, text) to service_role;
grant execute on function public.request_add_note(uuid, uuid, text) to service_role;

commit;
