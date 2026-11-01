-- 20261031000001_reel_duration_limits.sql
alter table ad_reel_duration_options
  add column min_seconds numeric,
  add column max_seconds numeric;

update ad_reel_duration_options set min_seconds = 8,  max_seconds = 10 where key = 'reel_short';
update ad_reel_duration_options set min_seconds = 12, max_seconds = 15 where key = 'reel_long';

alter table ad_reel_duration_options
  alter column min_seconds set not null,
  alter column max_seconds set not null,
  add constraint ad_reel_duration_bounds_chk
    check (min_seconds > 0 and min_seconds <= max_seconds);
