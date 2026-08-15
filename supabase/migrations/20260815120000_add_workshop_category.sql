-- Adds 'workshop' as a valid events.category value, backing the new
-- "Workshops" tab in the Plan Our Crew Night search picker.

ALTER TYPE event_category ADD VALUE 'workshop';
