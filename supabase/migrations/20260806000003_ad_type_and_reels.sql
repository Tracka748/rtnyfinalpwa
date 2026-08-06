-- Ad type + reel duration support

alter table ad_placement_options
  add column allowed_ad_types text[] not null default array['image'];

update ad_placement_options
  set allowed_ad_types = array['image', 'reel']
  where key = 'hero_carousel';

create table ad_reel_duration_options (
  key text primary key,
  label text not null,
  price_cents integer not null default 0,
  billing_period text not null default 'monthly',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into ad_reel_duration_options (key, label, price_cents)
values
  ('reel_short', '8–10 seconds', 0),
  ('reel_long', '12–15 seconds', 0);

alter table ads
  add column ad_type text not null default 'image' check (ad_type in ('image', 'reel')),
  add column video_url text,
  add column reel_duration_key text references ad_reel_duration_options(key);

-- Reel ads store video_url instead of image_url, so the column can no longer be required.
alter table ads
  alter column image_url drop not null;

insert into storage.buckets (id, name, public)
values ('ad-reels', 'ad-reels', true);

create policy "Public read access for ad-reels"
on storage.objects for select
using (bucket_id = 'ad-reels');
