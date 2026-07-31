-- Creates award_points_safe: a standalone RPC that replicates the existing
-- award_points logic (rule lookup, tier multiplier, ledger entry, balance
-- update) while adding cooldown/daily-cap/diminishing-returns enforcement
-- via point_earning_limits. This does NOT modify or delegate to the
-- existing award_points function, since that function computes its own
-- final point value internally and has no override parameter.

CREATE OR REPLACE FUNCTION award_points_safe(
  p_user_id   UUID,
  p_reason    point_reason,
  p_metadata  JSONB DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rule            RECORD;
  v_limit           RECORD;
  v_window_start    TIMESTAMPTZ;
  v_effective_pts   INTEGER;
  v_reward_profile  user_rewards%ROWTYPE;
  v_multiplier      NUMERIC;
  v_final_points    INTEGER;
BEGIN
  -- Authorization: same pattern as spend_points
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Fetch the active rule for this reason
  SELECT points, cooldown_seconds, daily_cap, diminishing_return_factor
    INTO v_rule
    FROM point_rules
   WHERE reason = p_reason AND active = TRUE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'No active rule for this reason');
  END IF;

  -- Determine the current rate-limit window
  v_window_start := NOW() - (v_rule.cooldown_seconds || ' seconds')::INTERVAL;

  -- Fetch or initialize the limit record (lock for update)
  SELECT * INTO v_limit
    FROM point_earning_limits
   WHERE user_id = p_user_id AND reason = p_reason
     FOR UPDATE;

  IF FOUND AND v_limit.window_start > v_window_start THEN
    -- Still within the cooldown window
    IF v_limit.count_in_window >= v_rule.daily_cap THEN
      RAISE EXCEPTION 'Daily cap reached for this action';
    END IF;

    -- Apply diminishing returns: each repeat in window earns less
    v_effective_pts := GREATEST(
      1,
      FLOOR(v_rule.points * POWER(v_rule.diminishing_return_factor, v_limit.count_in_window))
    );

    UPDATE point_earning_limits
       SET count_in_window = count_in_window + 1,
           last_earned_at  = NOW()
     WHERE user_id = p_user_id AND reason = p_reason;
  ELSE
    -- New window: reset counter
    v_effective_pts := v_rule.points;

    INSERT INTO point_earning_limits (user_id, reason, count_in_window, window_start, last_earned_at)
    VALUES (p_user_id, p_reason, 1, NOW(), NOW())
    ON CONFLICT (user_id, reason) DO UPDATE
      SET count_in_window = 1,
          window_start    = NOW(),
          last_earned_at  = NOW();
  END IF;

  -- Replicate award_points logic: lazy row creation
  INSERT INTO user_rewards (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_reward_profile
    FROM user_rewards WHERE user_id = p_user_id
    FOR UPDATE;

  -- Tier multiplier lookup
  SELECT bonus_multiplier INTO v_multiplier
    FROM tier_thresholds WHERE tier = v_reward_profile.tier;

  -- Apply multiplier to the effective points (after diminishing returns)
  v_final_points := FLOOR(v_effective_pts * COALESCE(v_multiplier, 1.0));

  -- Insert transaction
  INSERT INTO point_transactions (reward_profile_id, amount, reason, metadata)
  VALUES (v_reward_profile.id, v_final_points, p_reason, p_metadata);

  -- Update balance
  UPDATE user_rewards SET
    balance        = balance + v_final_points,
    lifetime_total = lifetime_total + v_final_points,
    updated_at     = NOW()
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'success',       true,
    'points_earned', v_final_points,
    'new_balance',   v_reward_profile.balance + v_final_points
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION award_points_safe FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION award_points_safe TO authenticated, service_role;
