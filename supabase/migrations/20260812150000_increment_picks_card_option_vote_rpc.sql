-- Atomic vote_count increment for picks_card_options.
-- Called only after a picks_card_votes insert has succeeded, so this
-- never runs on a duplicate/rejected vote. Kept as a single UPDATE
-- (no read-modify-write) to avoid lost updates under concurrent votes
-- on the same option — same rationale as spend_points_for_filter /
-- award_points_safe.

CREATE OR REPLACE FUNCTION increment_picks_card_option_vote(p_option_id UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE picks_card_options
     SET vote_count = vote_count + 1
   WHERE id = p_option_id
  RETURNING vote_count;
$$;

REVOKE EXECUTE ON FUNCTION increment_picks_card_option_vote FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_picks_card_option_vote TO service_role;
