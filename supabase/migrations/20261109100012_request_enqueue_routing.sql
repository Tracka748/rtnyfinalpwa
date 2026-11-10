-- Part 3: routing + enqueue, fired by an AFTER INSERT trigger on plan_requests
begin;

create or replace function public.request_enqueue_notifications(p_request_id uuid)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user       uuid;
  v_source     text;
  v_version    uuid;
  v_curator    uuid;
  v_category   uuid;
  v_type_key   text;
  v_recips     uuid[] := '{}'::uuid[];
  v_extra      uuid[];
  v_routed     boolean := false;
  v_n          int := 0;
begin
  select r.user_id, r.request_source, r.selected_package_id
    into v_user, v_source, v_version
  from public.plan_requests r where r.id = p_request_id;
  if not found then
    return 0;
  end if;

  -- Eligible admins always receive a copy.
  select coalesce(array_agg(e.coordinator_id), '{}'::uuid[]) into v_recips
  from public.request_eligible_coordinators() e where e.is_admin;

  if v_source = 'theme_package' then
    select tp.curator_id, tp.category_id into v_curator, v_category
    from public.theme_package_versions v
    join public.theme_packages tp on tp.id = v.package_id
    where v.id = v_version;

    if v_curator is not null
       and exists (select 1 from public.request_eligible_coordinators() e where e.coordinator_id = v_curator) then
      v_recips := v_recips || v_curator;
      v_routed := true;
    elsif v_category is not null then
      select t.key into v_type_key
      from public.request_categories c
      join public.specialist_types t on t.id = c.specialist_type_id
      where c.id = v_category and c.active and t.active;

      if v_type_key is not null then
        select coalesce(array_agg(e.coordinator_id), '{}'::uuid[]) into v_extra
        from public.request_eligible_coordinators() e
        where v_type_key = any (e.specialist_type_keys);
        if cardinality(v_extra) > 0 then
          v_recips := v_recips || v_extra;
          v_routed := true;
        end if;
      end if;
    end if;
  else
    select coalesce(array_agg(e.coordinator_id), '{}'::uuid[]) into v_extra
    from public.request_eligible_coordinators() e
    where 'event_planner' = any (e.specialist_type_keys);
    if cardinality(v_extra) > 0 then
      v_recips := v_recips || v_extra;
      v_routed := true;
    end if;
  end if;

  if not v_routed then
    select coalesce(array_agg(e.coordinator_id), '{}'::uuid[]) into v_extra
    from public.request_eligible_coordinators() e;
    v_recips := v_recips || v_extra;
  end if;

  insert into public.request_notifications (request_id, audience, recipient_user_id, kind, dedupe_key)
  select p_request_id, 'staff', u.id, 'new_request', 'new_request'
  from (select distinct unnest(v_recips) as id) u
  on conflict on constraint request_notifications_dedupe do nothing;
  get diagnostics v_n = row_count;

  -- Customer confirmation: signed-in requester with a verified auth email only.
  if v_user is not null
     and exists (select 1 from auth.users au where au.id = v_user and au.email_confirmed_at is not null) then
    insert into public.request_notifications (request_id, audience, recipient_user_id, kind, dedupe_key)
    values (p_request_id, 'customer', v_user, 'customer_confirmation', 'confirmation')
    on conflict on constraint request_notifications_dedupe do nothing;
  end if;

  if v_n = 0 and not exists (select 1 from public.request_notifications
                             where request_id = p_request_id and audience = 'staff') then
    raise warning 'request % has no eligible staff recipient', p_request_id;
  end if;

  return v_n;
end $$;

revoke all on function public.request_enqueue_notifications(uuid) from public, anon, authenticated;
grant execute on function public.request_enqueue_notifications(uuid) to service_role;

create or replace function public.plan_requests_enqueue_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    perform public.request_enqueue_notifications(new.id);
  exception when others then
    -- Never block a customer request; log only the error class, no raw text.
    raise warning 'notification enqueue failed for request % (sqlstate %)', new.id, sqlstate;
  end;
  return null;
end $$;

revoke all on function public.plan_requests_enqueue_trigger() from public, anon, authenticated;

create trigger plan_requests_enqueue
  after insert on public.plan_requests
  for each row execute function public.plan_requests_enqueue_trigger();

commit;
