-- e-Mood schema (Neon Postgres)
-- Sesuai PRD section 8.3, disesuaikan hasil grilling:
--   - tanpa kolom group_line/shift_default di members (OQ-1: skip)
--   - mood_records: absen masuk saja, tanpa kolom check-in/out (OQ-6: skip)
--   - followed_up/followup_note/followup_by tetap ada (OQ-4: checkbox + catatan bebas)
--   - role dashboard pakai neon_auth.user.role (admin | leader | section_head)

create extension if not exists pgcrypto;

create table members (
  id            uuid primary key default gen_random_uuid(),
  noreg         text unique not null,
  nama          text not null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create table mood_records (
  id             uuid primary key default gen_random_uuid(),
  member_id      uuid references members(id),
  noreg          text not null,
  nama           text not null,
  recorded_at    timestamptz not null default now(),
  shift          text not null,
  category       text not null check (category in ('HAPPY','NETRAL','BADMOOD')),
  confidence     numeric not null check (confidence >= 0 and confidence <= 100),
  low_confidence boolean not null default false,
  raw_scores     jsonb not null,
  source         text not null default 'auto' check (source in ('auto','manual')),
  frames_used    int,
  device_id      text,
  followed_up    boolean not null default false,
  followup_note  text,
  followup_by    uuid references neon_auth.user(id),
  followup_at    timestamptz,
  created_at     timestamptz not null default now()
);

-- satu member cuma bisa absen sekali per shift per hari (FR-1.5)
create unique index mood_records_one_per_shift_per_day
  on mood_records (member_id, shift, (recorded_at::date));

create index mood_records_recorded_at_idx on mood_records (recorded_at);
create index mood_records_category_idx on mood_records (category);

create table emotion_mapping (
  emotion     text primary key,
  category    text not null check (category in ('HAPPY','NETRAL','BADMOOD')),
  updated_at  timestamptz not null default now()
);

create table app_config (
  key   text primary key,
  value jsonb not null
);

create table shift_config (
  shift      text primary key,
  start_time time not null,
  end_time   time not null
);

create table audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor       uuid references neon_auth.user(id),
  action      text not null,
  table_name  text not null,
  record_id   text,
  before      jsonb,
  after       jsonb,
  created_at  timestamptz not null default now()
);

-- seed emotion_mapping sesuai D-1
insert into emotion_mapping (emotion, category) values
  ('happy', 'HAPPY'),
  ('neutral', 'NETRAL'),
  ('surprise', 'NETRAL'),
  ('angry', 'BADMOOD'),
  ('sad', 'BADMOOD'),
  ('disgust', 'BADMOOD'),
  ('fear', 'BADMOOD');

-- seed shift_config (default, bisa diubah lewat admin FR-6.6)
insert into shift_config (shift, start_time, end_time) values
  ('1', '06:00', '14:00'),
  ('2', '14:00', '22:00'),
  ('3', '22:00', '06:00');

-- seed app_config
insert into app_config (key, value) values
  ('confidence_threshold', '50'),
  ('capture_fps', '2.5');
