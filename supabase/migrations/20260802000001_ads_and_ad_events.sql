-- Ad placements and impression/click tracking.

create table ads (
  id uuid primary key default gen_random_uuid(),
  placement_key text not null,
  title text not null,
  image_url text not null,
  link_url text,
  weight integer not null default 1 check (weight >= 0),
  start_date timestamptz,
  end_date timestamptz,
  is_active boolean not null default true,
  owner_id uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ads_placement_active_idx on ads (placement_key, is_active);

create table ad_events (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references ads(id) on delete cascade,
  event_type text not null check (event_type in ('impression', 'click')),
  session_id text,
  user_id uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index ad_events_ad_id_idx on ad_events (ad_id);

alter table ads enable row level security;
alter table ad_events enable row level security;
