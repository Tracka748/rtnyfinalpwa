alter table event_drafts
  add column theme_id uuid references themes(id),
  add column theme_custom_text text;
