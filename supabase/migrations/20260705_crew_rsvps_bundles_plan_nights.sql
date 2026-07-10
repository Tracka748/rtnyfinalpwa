CREATE TABLE crew_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('going', 'maybe')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (crew_id, event_id, user_id)
);

CREATE INDEX idx_crew_rsvps_crew_event ON crew_rsvps(crew_id, event_id);
CREATE INDEX idx_crew_rsvps_event ON crew_rsvps(event_id);

--------------------------------------------------------------


------------------------------------------------------------------------

CREATE TABLE bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  perks JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  discount_percent NUMERIC,
  min_tickets INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id)
);

CREATE INDEX idx_bundles_event ON bundles(event_id);
CREATE INDEX idx_bundles_business ON bundles(business_id);

---------------------------------------------------------------

CREATE TABLE crew_plan_nights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  captain_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crew_plan_nights_crew ON crew_plan_nights(crew_id);
-------------------------------------------
CREATE TABLE crew_plan_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_night_id UUID NOT NULL REFERENCES crew_plan_nights(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  bundle_id UUID REFERENCES bundles(id) ON DELETE SET NULL,
  sequence_order INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (plan_night_id, event_id)
);

CREATE INDEX idx_crew_plan_events_plan_night ON crew_plan_events(plan_night_id);
CREATE INDEX idx_crew_plan_events_event ON crew_plan_events(event_id);
------------------------------------------------------------

CREATE TABLE event_partners (
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, business_id)
);

CREATE INDEX idx_event_partners_event ON event_partners(event_id);
CREATE INDEX idx_event_partners_business ON event_partners(business_id);
CREATE UNIQUE INDEX idx_event_partners_one_primary
  ON event_partners(event_id)
  WHERE is_primary = true;

