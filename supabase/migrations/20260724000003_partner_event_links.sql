-- Explicit link between a partner and an event, distinct from event_partners
-- (which links events to businesses, not partners). Used to verify a partner
-- is actually associated with an event before letting them attach event-scoped
-- resources (e.g. filters) to it.

CREATE TABLE public.partner_event_links (
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, partner_id)
);

CREATE INDEX idx_partner_event_links_event ON public.partner_event_links(event_id);
CREATE INDEX idx_partner_event_links_partner ON public.partner_event_links(partner_id);

--------------------------------------------------------------
-- RLS: enabled with no policies (default-deny), matching the pattern used for
-- filters/user_filter_unlocks. Only service_role (which bypasses RLS) can
-- read or write this table.

ALTER TABLE public.partner_event_links ENABLE ROW LEVEL SECURITY;
