-- Step 1 — Schema

alter table venues add column business_id uuid references businesses(id);
alter table venues add constraint venues_business_id_key unique (business_id);

alter table vendors add column business_id uuid references businesses(id);

alter table partners add column business_id uuid references businesses(id);
alter table partners add constraint partners_business_id_key unique (business_id);

-- Step 2 — Link the exact-name matches to existing businesses

update venues v set business_id = b.id
from businesses b where v.name = b.name;

update vendors ve set business_id = b.id
from businesses b where ve.type = 'venue' and ve.name = b.name;

-- Step 3a — Add the new category value

alter table businesses drop constraint businesses_category_check;
alter table businesses add constraint businesses_category_check
  check (category = any (array['food','shopping','entertainment','nightlife','self_care','activity','cafe','bar','event_services']));

-- Step 3b — Montage Music Hall (venue_type-based category mapping now correct)

do $$
declare montage_id uuid; montage_venue_type text;
begin
  select venue_type into montage_venue_type from venues where name = 'Montage Music Hall';

  insert into businesses (name, category) values (
    'Montage Music Hall',
    case coalesce(montage_venue_type, 'null')
      when 'bar' then 'bar'
      when 'concert_hall' then 'entertainment'
      when 'nightclub' then 'nightlife'
      when 'lounge' then 'nightlife'
      else 'entertainment'
    end
  ) returning id into montage_id;

  update venues set business_id = montage_id where name = 'Montage Music Hall';
  update vendors set business_id = montage_id where name = 'The Montage Music Hall';
  update partners set business_id = montage_id where display_name = 'The Montage Music Hall';
end $$;

-- Step 4a — Auto-create businesses for remaining unmatched venues

do $$
declare r record; new_id uuid; mapped_category text;
begin
  for r in select id, name, venue_type from venues where business_id is null loop
    mapped_category := case coalesce(r.venue_type, 'null')
      when 'bar' then 'bar'
      when 'concert_hall' then 'entertainment'
      when 'nightclub' then 'nightlife'
      when 'lounge' then 'nightlife'
      else 'entertainment'
    end;
    insert into businesses (name, category) values (r.name, mapped_category) returning id into new_id;
    update venues set business_id = new_id where id = r.id;
  end loop;
end $$;

-- Step 4b — Auto-create businesses for remaining unmatched venue-type vendors only

do $$
declare r record; new_id uuid;
begin
  for r in select id, name from vendors where type = 'venue' and business_id is null loop
    insert into businesses (name, category) values (r.name, 'entertainment') returning id into new_id;
    update vendors set business_id = new_id where id = r.id;
  end loop;
end $$;

-- Step 4c — Auto-create businesses for ALL remaining unmatched partners (venue-type uses mapped
-- category from their linked venue if present; vendor-type and anything else falls back to event_services)

do $$
declare r record; new_id uuid; mapped_category text;
begin
  for r in select p.id, p.display_name, p.partner_type, v.venue_type
           from partners p
           left join venues v on v.id = p.venue_id
           where p.business_id is null
  loop
    if r.partner_type = 'venue' then
      mapped_category := case coalesce(r.venue_type, 'null')
        when 'bar' then 'bar'
        when 'concert_hall' then 'entertainment'
        when 'nightclub' then 'nightlife'
        when 'lounge' then 'nightlife'
        else 'entertainment'
      end;
    else
      mapped_category := 'event_services';
    end if;

    insert into businesses (name, category) values (r.display_name, mapped_category) returning id into new_id;
    update partners set business_id = new_id where id = r.id;
  end loop;
end $$;
