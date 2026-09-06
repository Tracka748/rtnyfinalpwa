alter table venues add column if not exists business_id uuid references businesses(id);
alter table venues drop constraint if exists venues_business_id_key;
alter table venues add constraint venues_business_id_key unique (business_id);

alter table vendors add column if not exists business_id uuid references businesses(id);

alter table partners add column if not exists business_id uuid references businesses(id);
alter table partners drop constraint if exists partners_business_id_key;
alter table partners add constraint partners_business_id_key unique (business_id);

alter table businesses drop constraint if exists businesses_category_check;
alter table businesses add constraint businesses_category_check
  check (category = any (array['food','shopping','entertainment','nightlife','self_care','activity','cafe','bar','event_services']));

update venues v set business_id = b.id
from businesses b where v.name = b.name and v.business_id is null;

update vendors ve set business_id = b.id
from businesses b where ve.type = 'venue' and ve.name = b.name and ve.business_id is null;

do $$
declare montage_id uuid; montage_venue_type text;
begin
  select id into montage_id from businesses where name ilike '%montage music hall%' order by created_at asc limit 1;

  if montage_id is null then
    select venue_type into montage_venue_type from venues where name ilike '%montage music hall%' limit 1;
    insert into businesses (name, category) values (
      'The Montage Music Hall',
      case coalesce(montage_venue_type, 'null')
        when 'bar' then 'bar'
        when 'concert_hall' then 'entertainment'
        when 'nightclub' then 'nightlife'
        when 'lounge' then 'nightlife'
        else 'entertainment'
      end
    ) returning id into montage_id;
  end if;

  update venues set business_id = montage_id where name ilike '%montage music hall%' and business_id is distinct from montage_id;
  update vendors set business_id = montage_id where name ilike '%montage music hall%' and business_id is distinct from montage_id;
  update partners set business_id = montage_id where display_name ilike '%montage music hall%' and business_id is distinct from montage_id;
end $$;

do $$
declare r record; new_id uuid; mapped_category text;
begin
  for r in select id, name, venue_type from venues where business_id is null loop
    select id into new_id from businesses where name = r.name limit 1;
    if new_id is null then
      mapped_category := case coalesce(r.venue_type, 'null')
        when 'bar' then 'bar'
        when 'concert_hall' then 'entertainment'
        when 'nightclub' then 'nightlife'
        when 'lounge' then 'nightlife'
        else 'entertainment'
      end;
      insert into businesses (name, category) values (r.name, mapped_category) returning id into new_id;
    end if;
    update venues set business_id = new_id where id = r.id;
  end loop;
end $$;

do $$
declare r record; new_id uuid;
begin
  for r in select id, name from vendors where type = 'venue' and business_id is null loop
    select id into new_id from businesses where name = r.name limit 1;
    if new_id is null then
      insert into businesses (name, category) values (r.name, 'entertainment') returning id into new_id;
    end if;
    update vendors set business_id = new_id where id = r.id;
  end loop;
end $$;

do $$
declare r record; new_id uuid; mapped_category text;
begin
  for r in select p.id, p.display_name, p.partner_type, v.venue_type
           from partners p
           left join venues v on v.id = p.venue_id
           where p.business_id is null
  loop
    select id into new_id from businesses where name = r.display_name limit 1;
    if new_id is null then
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
    end if;
    update partners set business_id = new_id where id = r.id;
  end loop;
end $$;
