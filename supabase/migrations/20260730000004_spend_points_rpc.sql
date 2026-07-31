-- Creates the general-purpose spend_points RPC. Atomically deducts from
-- user_rewards.balance and logs a negative-amount ledger entry in
-- point_transactions. This does NOT touch user_rewards or point_transactions
-- schema — both remain exactly as they exist today.

CREATE OR REPLACE FUNCTION spend_points(
  p_user_id   UUID,
  p_reason    point_reason,
  p_amount    INT,
  p_metadata  JSONB DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reward_id  UUID;
  v_balance    INT;
BEGIN
  -- 1. Authorization: allow service-role (auth.uid() IS NULL) but block
  --    an authenticated client from spending another user's balance.
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 2. Input validation
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- 3. Lock the balance row to prevent concurrent spend races.
  SELECT id, balance
    INTO v_reward_id, v_balance
    FROM user_rewards
   WHERE user_id = p_user_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rewards account not found';
  END IF;

  -- 4. Sufficient balance check
  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient points balance';
  END IF;

  -- 5. Atomic deduct + ledger entry
  UPDATE user_rewards
     SET balance    = balance - p_amount,
         updated_at = NOW()
   WHERE id = v_reward_id;

  INSERT INTO point_transactions (reward_profile_id, amount, reason, metadata)
  VALUES (v_reward_id, -p_amount, p_reason, p_metadata);

EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Duplicate spend detected';
END;
$$;

REVOKE EXECUTE ON FUNCTION spend_points FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION spend_points TO authenticated, service_role;
