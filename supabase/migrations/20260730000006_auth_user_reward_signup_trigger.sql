-- Adds a signup trigger that creates a user_rewards row immediately when a
-- new user is created. This is a UX improvement, not a bug fix — award_points
-- already lazily creates this row on first earn. The trigger closes the one
-- remaining gap: a brand-new user who tries to SPEND before ever earning
-- would otherwise hit "Rewards account not found."

CREATE OR REPLACE FUNCTION create_user_reward_account()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_rewards (user_id, balance, lifetime_total, tier, streak_days)
  VALUES (NEW.id, 0, 0, 'explorer', 0)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_reward_account();
