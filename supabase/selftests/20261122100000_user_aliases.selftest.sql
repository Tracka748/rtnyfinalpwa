-- 20261122100000_user_aliases.selftest.sql


do $$
declare
  v_admin uuid; v_other uuid; v_spec uuid; r record; v_a text; v_b text;
begin
  select id into v_admin from public.profiles where role = 'admin' limit 1;
  select id into v_other from public.profiles where id <> v_admin order by id limit 1;
  if v_admin is null or v_other is null then
    raise exception 'SELFTEST FAILED: need an admin and one other profile';
  end if;

  for r in select id from public.profiles loop
    v_a := public.suggest_alias(r.id);
    if v_a !~ '^[a-z0-9_]{3,30}$' then
      raise exception 'SELFTEST FAILED: bad suggestion % for %', v_a, r.id;
    end if;
    if exists (select 1 from public.alias_reserved_words w where w.word = v_a) then
      raise exception 'SELFTEST FAILED: reserved suggestion %', v_a;
    end if;
  end loop;

  v_a := public.ensure_alias(v_admin);
  v_b := public.ensure_alias(v_admin);
  if v_a is distinct from v_b then
    raise exception 'SELFTEST FAILED: ensure_alias not idempotent';
  end if;

  begin
    update public.user_aliases set alias = 'AB' where user_id = v_admin;
    raise exception 'SELFTEST FAILED: bad format accepted';
  exception when check_violation then null;
  end;

  perform public.ensure_alias(v_other);
  begin
    update public.user_aliases set alias = v_a where user_id = v_other;
    raise exception 'SELFTEST FAILED: duplicate alias accepted';
  exception when unique_violation then null;
  end;

  begin
    update public.user_aliases set alias = 'admin' where user_id = v_other;
    raise exception 'SELFTEST FAILED: reserved alias accepted';
  exception when raise_exception then
    if sqlerrm <> 'That alias is reserved.' then
      raise exception '%', sqlerrm;
    end if;
  end;

  if not public.is_special_user(v_admin) then
    raise exception 'SELFTEST FAILED: admin not special';
  end if;

  for r in select id from public.profiles loop
    if public.is_special_user(r.id)
       and not exists (select 1 from public.user_aliases a where a.user_id = r.id) then
      raise exception 'SELFTEST FAILED: special user % has no alias (run backfill first)', r.id;
    end if;
  end loop;

  select user_id into v_spec from public.user_specialist_assignments
    where status = 'active' limit 1;
  if v_spec is not null then
    delete from public.user_aliases where user_id = v_spec;
    update public.user_specialist_assignments set status = 'active'
      where user_id = v_spec and status = 'active';
    if not exists (select 1 from public.user_aliases where user_id = v_spec) then
      raise exception 'SELFTEST FAILED: specialist trigger did not create alias';
    end if;
  end if;

  if has_table_privilege('anon', 'public.user_aliases', 'select')
     or has_table_privilege('authenticated', 'public.user_aliases', 'select')
     or has_table_privilege('anon', 'public.user_aliases', 'insert')
     or has_table_privilege('authenticated', 'public.user_aliases', 'insert')
     or has_table_privilege('authenticated', 'public.user_aliases', 'update') then
    raise exception 'SELFTEST FAILED: aliases table exposed';
  end if;

  if has_function_privilege('anon', 'public.ensure_alias(uuid)', 'execute')
     or has_function_privilege('authenticated', 'public.ensure_alias(uuid)', 'execute')
     or has_function_privilege('anon', 'public.suggest_alias(uuid)', 'execute')
     or has_function_privilege('authenticated', 'public.is_special_user(uuid)', 'execute') then
    raise exception 'SELFTEST FAILED: functions exposed';
  end if;

  if not has_function_privilege('service_role', 'public.ensure_alias(uuid)', 'execute') then
    raise exception 'SELFTEST FAILED: service_role cannot run ensure_alias';
  end if;

  raise exception 'SELFTEST PASSED';
end $$;
