-- Migrate shift 1/2/3 -> Day/Night (idempotent, safe to re-run)
-- Jalankan sekali di Neon: psql $DATABASE_URL -f db/migrate_day_night.sql

-- 1) Map existing attendance to new shift names (1 & 2 -> Day, 3 -> Night)
update mood_records set shift = 'Day' where shift in ('1', '2');
update mood_records set shift = 'Night' where shift = '3';

-- 2) Replace shift_config 1/2/3 with Day/Night
delete from shift_config where shift in ('1','2','3');

insert into shift_config (shift, start_time, end_time) values
  ('Day', '06:00', '18:00'),
  ('Night', '18:00', '06:00')
on conflict (shift) do update set
  start_time = excluded.start_time,
  end_time = excluded.end_time;

-- Verify:
-- select * from shift_config order by shift;
-- select shift, count(*) from mood_records group by shift;
