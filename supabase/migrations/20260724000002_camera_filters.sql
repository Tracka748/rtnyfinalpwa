-- Camera filters: event-branded photo filters partners sell, redeemable with reward points.
--
-- Depends on the 'filter_purchase' point_reason enum value added in
-- 20260724_point_reason_add_filter_purchase.sql, which must be applied first.

CREATE TABLE public.filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE RESTRICT,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  asset_url TEXT NOT NULL,
  points_cost INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_filters_event ON public.filters(event_id);
CREATE INDEX idx_filters_partner ON public.filters(partner_id);

--------------------------------------------------------------

CREATE TABLE public.user_filter_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  filter_id UUID NOT NULL REFERENCES public.filters(id) ON DELETE RESTRICT,
  points_spent INTEGER NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, filter_id)
);

CREATE INDEX idx_user_filter_unlocks_user ON public.user_filter_unlocks(user_id);
CREATE INDEX idx_user_filter_unlocks_filter ON public.user_filter_unlocks(filter_id);

--------------------------------------------------------------
-- RLS: enabled with no policies (default-deny), matching the pattern used for
-- crew_rsvps/bundles/etc. Only service_role (which bypasses RLS) and the
-- SECURITY DEFINER RPC below can read or write these tables.

ALTER TABLE public.filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_filter_unlocks ENABLE ROW LEVEL SECURITY;

--------------------------------------------------------------
-- RPC: atomically spend points to unlock a filter.
-- Returns the newly created user_filter_unlocks row.

CREATE OR REPLACE FUNCTION public.spend_points_for_filter(
  p_user_id UUID,
  p_filter_id UUID
)
RETURNS public.user_filter_unlocks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_active   BOOLEAN;
  v_points_cost INTEGER;
  v_event_date  TIMESTAMPTZ;
  v_reward_id   UUID;
  v_balance     INTEGER;
  v_unlock      public.user_filter_unlocks;
BEGIN
  -- Only the user themselves (or a trusted service-role caller, for whom
  -- auth.uid() is null) may spend points on p_user_id's behalf.
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized to spend points for another user';
  END IF;

  SELECT f.is_active, f.points_cost, e.event_date
    INTO v_is_active, v_points_cost, v_event_date
  FROM public.filters f
  JOIN public.events e ON e.id = f.event_id
  WHERE f.id = p_filter_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Filter % not found', p_filter_id;
  END IF;

  IF NOT v_is_active THEN
    RAISE EXCEPTION 'Filter is not active';
  END IF;

  IF now() >= v_event_date + interval '24 hours' THEN
    RAISE EXCEPTION 'Filter unlock window has closed';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_filter_unlocks
    WHERE user_id = p_user_id AND filter_id = p_filter_id
  ) THEN
    RAISE EXCEPTION 'Filter already unlocked by this user';
  END IF;

  -- Lock the user's rewards row for the rest of the transaction so two
  -- concurrent spends can't both pass the balance check below.
  SELECT ur.id, ur.balance
    INTO v_reward_id, v_balance
  FROM public.user_rewards ur
  WHERE ur.user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No rewards account found for user %', p_user_id;
  END IF;

  IF v_balance < v_points_cost THEN
    RAISE EXCEPTION 'Insufficient points balance';
  END IF;

  UPDATE public.user_rewards
  SET balance = balance - v_points_cost,
      updated_at = now()
  WHERE id = v_reward_id;

  INSERT INTO public.point_transactions (reward_profile_id, amount, reason, metadata)
  VALUES (
    v_reward_id,
    -v_points_cost,
    'filter_purchase',
    jsonb_build_object('filter_id', p_filter_id)
  );

  INSERT INTO public.user_filter_unlocks (user_id, filter_id, points_spent)
  VALUES (p_user_id, p_filter_id, v_points_cost)
  RETURNING * INTO v_unlock;

  RETURN v_unlock;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Filter already unlocked by this user';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.spend_points_for_filter(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.spend_points_for_filter(UUID, UUID) TO authenticated, service_role;
