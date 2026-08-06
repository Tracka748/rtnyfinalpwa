-- Storage bucket for ad images

insert into storage.buckets (id, name, public)
values ('ad-images', 'ad-images', true);

create policy "Public read access for ad-images"
on storage.objects for select
using (bucket_id = 'ad-images');

-- Placement options (pricing lookup table)

create table ad_placement_options (
  key text primary key,
  label text not null,
  price_cents integer not null default 0,
  billing_period text not null default 'monthly',
  is_active boolean not null default true,
  stripe_price_id text,
  created_at timestamptz not null default now()
);

insert into ad_placement_options (key, label, price_cents, billing_period)
values ('premium_spotlight', 'Premium Spotlight', 10000, 'monthly');

alter table ads
  add constraint ads_placement_key_fkey
  foreign key (placement_key) references ad_placement_options(key);

insert into ad_placement_options (key, label, price_cents, billing_period)
values ('hero_carousel', 'Hero Carousel', 0, 'monthly');
