alter table theme_suggestions
  drop constraint theme_suggestions_event_id_fkey,
  drop column event_id,
  add column event_draft_id uuid references event_drafts(id);
