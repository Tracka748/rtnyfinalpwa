alter table ticket_types
  add column ticket_format text not null default 'digital'
    check (ticket_format in ('digital', 'physical', 'both')),
  add column fee_payer text
    check (fee_payer in ('buyer', 'promoter')),
  add column printing_quantity integer,
  add column estimated_printing_cost_cents integer,
  add column rtny_distribution boolean not null default false;

create table if not exists platform_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

insert into platform_settings (key, value)
values ('printing_rate_cents_per_ticket', '150')
on conflict (key) do nothing;
