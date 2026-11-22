-- 20261122100001_user_aliases_backfill.sql
do $$
declare r record;
begin
  for r in select id from public.profiles order by created_at nulls last, id loop
    if public.is_special_user(r.id) then
      perform public.ensure_alias(r.id);
    end if;
  end loop;
end $$;

select p.id, p.first_name, p.last_name, a.alias
from public.user_aliases a
join public.profiles p on p.id = a.user_id
order by a.created_at;
