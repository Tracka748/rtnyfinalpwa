# Hidden Features

Internal reference for feature-flagged functionality that is built but not yet live for all users. Not user-facing.

---

## Upcoming Events Carousel (EventCardWeek-based)

**Status:** Built, gated off by default

**Flag:** `PARTNER_EVENTS_CAROUSEL_ENABLED` — server-side env var (not a `partners` table column). An env var was used instead of a per-partner DB column to keep the flag low-wiring: no migration, no `types/database.ts` regen, no DB round trip. This means the flag is **global** (applies to all partners at once), not settable per partner.

**Default behavior:** Text-row list of upcoming events (original layout — event name, date, "Tickets" button).

**Flagged-on behavior:** Horizontal-scroll carousel using `EventCardWeek`, showing `flyer_image_url`, `name`, `event_date`, and venue name per event, plus category badge, save/heart button, and lowest ticket price.

**Files touched:**
- `app/partners/[id]/page.tsx`
- `components/custom/events/event-card-week.tsx`

**Requirements to enable:** All of a partner's upcoming events should have `flyer_image_url` set. There's no fallback for a partner with spotty image coverage beyond the built-in per-event fallback (a solid category-color background with a centered icon for any individual event missing an image).

**How to enable:** Set the env var and restart the app — this flips the carousel on for every partner profile page, not one partner at a time:
```
PARTNER_EVENTS_CAROUSEL_ENABLED=true
```
Unset (or any value other than `"true"`) keeps the default text-row layout.

**Rationale:** Built during the partner-profile redesign (July 2026); parked because the text-list has better density (shows all events at once vs. ~4 visible in the carousel) and larger tap targets for the Tickets buttons. Considered as a potential premium/beta feature for later. If per-partner control ends up being the actual requirement (rather than a global toggle), this should move to a `partners` table boolean column instead.

**Date parked:** 2026-07-12
