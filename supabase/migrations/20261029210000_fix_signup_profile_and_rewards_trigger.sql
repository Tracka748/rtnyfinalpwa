-- Fix: new sign-ups failed with "Database error saving new user".
-- user_rewards.user_id has a foreign key to profiles(id), but no trigger created the
-- profile row, so the reward insert in the on_auth_user_created trigger violated the FK.
-- This replaces the trigger function so it creates the profile first, then the rewards row.
-- The trigger on_auth_user_created itself is unchanged. Already applied live on 2026-10-29;
-- this file records it so a rebuilt database matches. Safe to re-run.

create or replace function public.create_user_reward_account()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do nothing;

  insert into public.user_rewards (user_id, balance, lifetime_total, tier, streak_days)
  values (new.id, 0, 0, 'explorer', 0)
  on conflict do nothing;

  return new;
end;
$$;
