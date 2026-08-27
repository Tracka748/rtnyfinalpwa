create table partner_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  partner_type text not null check (partner_type in ('venue','promoter','organizer','vendor')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (name, partner_type)
);

alter table partners
  add column category_id uuid references partner_categories(id);

insert into partner_categories (name, partner_type) values
  ('Live Music Venue', 'venue'), ('Banquet Hall', 'venue'), ('Restaurant / Bar', 'venue'),
  ('Rooftop', 'venue'), ('Outdoor Space', 'venue'), ('Community Center', 'venue'),
  ('Hotel / Event Space', 'venue'), ('Warehouse / Industrial', 'venue'), ('Other Venue', 'venue'),
  ('Decorator', 'vendor'), ('Caterer', 'vendor'), ('DJ', 'vendor'), ('Photographer', 'vendor'),
  ('Videographer', 'vendor'), ('Florist', 'vendor'), ('Bartender / Mobile Bar', 'vendor'),
  ('Rental Equipment', 'vendor'), ('Security', 'vendor'), ('Transportation', 'vendor'), ('Other Vendor', 'vendor'),
  ('Nightlife Promoter', 'promoter'), ('Corporate/Private Events Promoter', 'promoter'),
  ('Community Promoter', 'promoter'), ('Other Promoter', 'promoter'),
  ('Event Organizer', 'organizer'), ('Festival Organizer', 'organizer'),
  ('Nonprofit/Community Organizer', 'organizer'), ('Corporate Organizer', 'organizer'), ('Other Organizer', 'organizer');

update partners
set category_id = (select id from partner_categories where name = 'Live Music Venue' and partner_type = 'venue')
where category = 'Live Music';
