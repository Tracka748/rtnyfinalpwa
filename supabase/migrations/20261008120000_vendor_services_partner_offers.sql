-- vendor_services can now be owned by a partner instead of a vendor.
alter table vendor_services
  alter column vendor_id drop not null,
  add column partner_id uuid references partners(id) on delete cascade,
  add column occasions text[] not null default '{}',
  add column status text not null default 'active',
  add column pricing_model text,
  add column min_guests integer,
  add column max_guests integer,
  add column advance_notice_hours integer,
  add column pitch text,
  add column add_ons jsonb not null default '[]',
  add column availability jsonb not null default '{}',
  add column details jsonb not null default '{}',
  add column offer_image_url text,
  add column gallery_urls text[] not null default '{}',
  add column review_note text,
  add column updated_at timestamptz not null default now();

alter table vendor_services
  add constraint vendor_services_owner_check
    check (vendor_id is not null or partner_id is not null),
  add constraint vendor_services_status_check
    check (status in ('draft','pending','active','needs_changes')),
  add constraint vendor_services_active_status_check
    check (active is not true or status = 'active'),
  add constraint vendor_services_guests_check
    check (min_guests is null or max_guests is null or min_guests <= max_guests),
  add constraint vendor_services_pitch_length_check
    check (pitch is null or char_length(pitch) <= 300);

create index vendor_services_partner_id_idx on vendor_services(partner_id);
create index vendor_services_occasions_idx on vendor_services using gin(occasions);

update partner_categories
set name = 'Restaurant & Catering'
where id = '955d92bd-e81d-4944-a326-e21b2b3a3489';

update partners
set category_id = '955d92bd-e81d-4944-a326-e21b2b3a3489'
where id = '0d438864-8e3a-4923-a59c-a7679d39c429';
