-- feed_cards table
create table public.feed_cards (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('announcement','curated','deal','featured')),
  headline text not null,
  sub text,
  action_label text,
  cta_url text,
  event_id uuid references public.events(id) on delete set null,
  promo_code text,
  image_url text,
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  display_order integer not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index feed_cards_active_order_idx on public.feed_cards (active, display_order);

-- updated_at trigger
create or replace function public.set_feed_cards_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger feed_cards_updated_at
before update on public.feed_cards
for each row execute function public.set_feed_cards_updated_at();

-- RLS
alter table public.feed_cards enable row level security;

create policy "Public can read live feed cards"
on public.feed_cards
for select
to anon, authenticated
using (
  active = true
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at >= now())
);

-- No insert/update/delete policy: all writes go through createSupabaseAdmin() in admin routes.

-- Storage bucket
insert into storage.buckets (id, name, public)
values ('feed-card-images', 'feed-card-images', true);
