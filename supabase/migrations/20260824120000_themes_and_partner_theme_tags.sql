-- Master controlled theme list
create table themes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Custom promoter-typed themes, pending admin review before joining the controlled list
create table theme_suggestions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  submitted_by_user_id uuid references auth.users(id),
  event_id uuid references events(id),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);

-- Partner <-> theme association / verification state
create table partner_theme_tags (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references partners(id) on delete cascade,
  theme_id uuid not null references themes(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  first_approved_at timestamptz,
  unique (partner_id, theme_id)
);

-- Photo-proof support on the existing partner_media table
alter table partner_media
  add column theme_tag_id uuid references partner_theme_tags(id) on delete set null,
  add column photo_review_status text check (photo_review_status in ('pending','approved','rejected'));

-- Event theme selection
alter table events
  add column theme_id uuid references themes(id),
  add column theme_custom_text text;

-- Explicit flag, decoupled from free-text category, per earlier decision
alter table partners
  add column requires_photo_verified_tags boolean not null default false;
