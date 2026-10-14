create or replace function public.protect_profile_privileged_columns()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.role := 'user';
      new.is_organizer := false;
    elsif new.role is distinct from old.role
       or new.is_organizer is distinct from old.is_organizer then
      raise exception 'profiles.role and profiles.is_organizer cannot be changed by this role'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_privileged_columns on public.profiles;
create trigger protect_profile_privileged_columns
  before insert or update on public.profiles
  for each row execute function public.protect_profile_privileged_columns();
