-- ============================================================
-- MICRON — Hash Rosin Tracker
-- Supabase Schema (PostgreSQL 15+)
-- ============================================================
-- Run in order. Safe to re-run (uses IF NOT EXISTS / CREATE OR REPLACE).
-- Pairs with Supabase Auth (auth.users) and Supabase Storage.
--
-- Buckets required (create in Supabase Studio → Storage):
--   batch-photos   (private)
--   press-photos   (private)
--   avatars        (public)
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 0. Extensions
-- ─────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "citext";


-- ─────────────────────────────────────────────────────────────
-- 1. Enums
-- ─────────────────────────────────────────────────────────────
do $$ begin
  create type batch_stage    as enum ('setup','wash','freezedry','press','cure','done','archived');
  create type material_type  as enum ('WPFF','FF','Dry Flower','Dry Trim','Kief','Other');
  create type grow_type      as enum ('Indoor','Indoor · Hydroponic','Indoor · Living Soil','Greenhouse','Greenhouse · Organic','Light Dep','Outdoor','Outdoor · Sun-grown');
  create type weight_unit    as enum ('g','oz');
  create type temp_unit      as enum ('F','C');
exception
  when duplicate_object then null;
end $$;


-- ─────────────────────────────────────────────────────────────
-- 2. Profiles (1:1 with auth.users)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  handle        citext unique,
  avatar_url    text,
  weight_unit   weight_unit not null default 'g',
  temp_unit     temp_unit   not null default 'F',
  theme         text        not null default 'dark',
  community_opt_in boolean  not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Auto-create a profile row when a new auth user signs up
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ─────────────────────────────────────────────────────────────
-- 3. Farms (growers / suppliers)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.farms (
  id          uuid primary key default uuid_generate_v4(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  location    text,
  grow_type   grow_type,
  contact     text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists farms_owner_idx on public.farms(owner_id);


-- ─────────────────────────────────────────────────────────────
-- 4. Batches (the primary workflow record)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.batches (
  id                uuid primary key default uuid_generate_v4(),
  owner_id          uuid not null references auth.users(id) on delete cascade,
  batch_code        text not null,                                    -- user-facing "B-046"
  farm_id           uuid references public.farms(id) on delete set null,
  strain            text not null,
  cultivar          text,
  material_type     material_type,
  input_g           numeric(10,2),                                    -- starting biomass in grams
  cost_cents        integer,                                          -- total cost in cents (nullable)
  cost_per_lb_cents integer,                                          -- optional alt representation

  started_at        timestamptz not null default now(),
  wash_date         timestamptz,
  press_date        timestamptz,
  cure_started_at   timestamptz,

  stage             batch_stage not null default 'setup',
  operator          text,

  -- Wash environment
  room_temp_lo_f    numeric(4,1),
  room_temp_hi_f    numeric(4,1),
  water_temp_lo_f   numeric(4,1),
  water_temp_hi_f   numeric(4,1),

  -- Freeze dry cycle
  freeze_dry_start  timestamptz,
  freeze_dry_end    timestamptz,
  freeze_dry_notes  text,

  -- Narrative
  impression        text,        -- general impression / tasting note
  biomass_notes     text,        -- biomass observations, grower feedback

  -- Community sharing
  community_shared  boolean not null default false,
  community_shared_at timestamptz,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  unique (owner_id, batch_code)
);
create index if not exists batches_owner_idx on public.batches(owner_id);
create index if not exists batches_strain_idx on public.batches(owner_id, strain);
create index if not exists batches_stage_idx  on public.batches(owner_id, stage);
create index if not exists batches_farm_idx   on public.batches(farm_id);


-- ─────────────────────────────────────────────────────────────
-- 5. Wash passes (1..N per batch — typically 6)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.wash_passes (
  id           uuid primary key default uuid_generate_v4(),
  batch_id     uuid not null references public.batches(id) on delete cascade,
  pass_number  smallint not null check (pass_number between 1 and 20),
  minutes      numeric(5,2),
  rpm          integer,
  completed_at timestamptz,
  notes        text,
  created_at   timestamptz not null default now(),
  unique (batch_id, pass_number)
);
create index if not exists wash_passes_batch_idx on public.wash_passes(batch_id);


-- ─────────────────────────────────────────────────────────────
-- 6. Bags (micron bands: 160-219, 120-159, 90-119, 45-89, …)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.bags (
  id             uuid primary key default uuid_generate_v4(),
  batch_id       uuid not null references public.batches(id) on delete cascade,
  band_id        text not null,                                      -- '160-219' | '120-159' | '90-119' | '45-89'
  wet_g          numeric(10,2),
  dry_g          numeric(10,2),
  color_index    smallint,                                           -- 0..N index into colorScale
  melt_rating    smallint check (melt_rating between 0 and 6),
  texture        text,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (batch_id, band_id)
);
create index if not exists bags_batch_idx on public.bags(batch_id);


-- ─────────────────────────────────────────────────────────────
-- 7. Press runs (N per batch)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.presses (
  id            uuid primary key default uuid_generate_v4(),
  batch_id      uuid not null references public.batches(id) on delete cascade,
  press_code    text not null,                                       -- user-facing "P-1"
  press_number  smallint not null,
  grade_ids     text[] not null default '{}',                        -- ['90-119','120-159']
  charge_g      numeric(10,2),
  yield_g       numeric(10,2),
  temp_f        numeric(4,1),
  pressure_psi  integer,
  minutes       numeric(5,2),
  notes         text,
  pressed_at    timestamptz,
  preset_id     uuid,                                                -- nullable FK, set below
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (batch_id, press_number)
);
create index if not exists presses_batch_idx on public.presses(batch_id);


-- ─────────────────────────────────────────────────────────────
-- 8. Press presets (saved recipes)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.press_presets (
  id           uuid primary key default uuid_generate_v4(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  temp_f       numeric(4,1),
  pressure_psi integer,
  minutes      numeric(5,2),
  notes        text,
  use_count    integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (owner_id, name)
);
create index if not exists press_presets_owner_idx on public.press_presets(owner_id);

-- Finish the FK from presses.preset_id
alter table public.presses
  drop constraint if exists presses_preset_fk,
  add  constraint presses_preset_fk
    foreign key (preset_id) references public.press_presets(id) on delete set null;


-- ─────────────────────────────────────────────────────────────
-- 9. Wash cycle presets (6-pass templates)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.wash_presets (
  id         uuid primary key default uuid_generate_v4(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  passes     jsonb not null,                                         -- [{pass:1,minutes:2,rpm:130}, ...]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, name)
);
create index if not exists wash_presets_owner_idx on public.wash_presets(owner_id);


-- ────────────────────────────────────────────────────────────
-- 9b. Cure logs (1 per batch, optionally scoped per press_id)
-- ────────────────────────────────────────────────────────────
do $$ begin
  create type cure_method     as enum ('cold-cure','room-cure','warm-cure','flash-cure','no-cure','custom');
  create type cure_container  as enum ('glass','parchment','silicone','mylar','other');
  create type cure_light      as enum ('opaque','uv-blocking','clear');
exception when duplicate_object then null; end $$;

create table if not exists public.cure_logs (
  id               uuid primary key default uuid_generate_v4(),
  batch_id         uuid not null references public.batches(id) on delete cascade,
  press_id         uuid references public.presses(id) on delete set null,
  method           cure_method not null default 'room-cure',
  method_custom    text,
  container        cure_container not null default 'glass',
  container_custom text,
  vacuum_sealed    boolean not null default false,
  light_exposure   cure_light not null default 'opaque',
  temp_f           numeric(5,1),
  target_days      integer not null default 21,
  started_at       timestamptz,
  ended_at         timestamptz,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists cure_logs_batch_idx on public.cure_logs(batch_id);
create index if not exists cure_logs_active_idx on public.cure_logs(batch_id) where ended_at is null;


-- ────────────────────────────────────────────────────────────
-- 9c. Cure observations (day-3 / day-7 / day-14 / day-21 check-ins)
-- ────────────────────────────────────────────────────────────
create table if not exists public.cure_observations (
  id            uuid primary key default uuid_generate_v4(),
  cure_log_id   uuid not null references public.cure_logs(id) on delete cascade,
  observed_at   timestamptz not null default now(),
  day_index     integer,
  color_index   integer,
  melt_rating   integer,
  terps_score   integer,
  taste_score   integer,
  texture       text,
  notes         text,
  photo_url     text,
  created_at    timestamptz not null default now()
);
create index if not exists cure_obs_log_idx on public.cure_observations(cure_log_id, observed_at);


-- ─────────────────────────────────────────────────────────────
-- 10. Custom texture options (per-user vocabulary)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.texture_options (
  id         uuid primary key default uuid_generate_v4(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  label      text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (owner_id, label)
);
create index if not exists texture_options_owner_idx on public.texture_options(owner_id, sort_order);


-- ─────────────────────────────────────────────────────────────
-- 10b. Cure method + container vocabulary (mirrors texture_options)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.cure_method_options (
  id         uuid primary key default uuid_generate_v4(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  label      text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (owner_id, label)
);
create index if not exists cure_method_options_owner_idx on public.cure_method_options(owner_id, sort_order);

create table if not exists public.container_options (
  id         uuid primary key default uuid_generate_v4(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  label      text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (owner_id, label)
);
create index if not exists container_options_owner_idx on public.container_options(owner_id, sort_order);


-- ─────────────────────────────────────────────────────────────
-- 10c. Source type + harvest type vocabulary (per-user)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.source_type_options (
  id         uuid primary key default uuid_generate_v4(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  label      text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (owner_id, label)
);
create index if not exists source_type_options_owner_idx on public.source_type_options(owner_id, sort_order);

create table if not exists public.harvest_type_options (
  id         uuid primary key default uuid_generate_v4(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  label      text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (owner_id, label)
);
create index if not exists harvest_type_options_owner_idx on public.harvest_type_options(owner_id, sort_order);


-- ─────────────────────────────────────────────────────────────
-- 10d. Extend batches with intake fields
-- ─────────────────────────────────────────────────────────────
alter table public.batches
  add column if not exists source_type        text,        -- Outdoor / Indoor / Light Dep / Hoop House / Hydroponic / custom
  add column if not exists harvest_date       date,        -- date of harvest (not the wash date)
  add column if not exists harvest_type       text,        -- Fresh Frozen / Cured / Sugar Trim / custom
  add column if not exists biomass_cost_cents integer;     -- total $ paid for biomass (in cents)

create index if not exists batches_source_type_idx  on public.batches(owner_id, source_type);
create index if not exists batches_harvest_date_idx on public.batches(owner_id, harvest_date);
create index if not exists batches_harvest_type_idx on public.batches(owner_id, harvest_type);


-- ─────────────────────────────────────────────────────────────
-- 10e. Per-grade yield breakdown on press runs
-- ─────────────────────────────────────────────────────────────
alter table public.presses
  add column if not exists yield_by_grade jsonb not null default '{}'::jsonb;
-- shape: {'160-219': 4.2, '120-159': 11.6, '90-119': 18.3, '45-89': 4.4}
-- yield_g should equal sum of yield_by_grade values when present.
-- NOTE: keys may also be merged-grade ids (see merged_grades below), so a press
-- run's grades[] / yield_by_grade can mix band ids and merge ids.


-- ─────────────────────────────────────────────────────────────
-- 10g. Merged grades — 2+ micron ranges combined into ONE analyzable unit
-- ─────────────────────────────────────────────────────────────
create table if not exists public.merged_grades (
  id          uuid primary key default uuid_generate_v4(),
  batch_id    uuid not null references public.batches(id) on delete cascade,
  client_id   text not null,                 -- the app-side merge id used in presses.grades[]
  label       text not null,                 -- e.g. "90–159µ Blend"
  band_ids    text[] not null,               -- ['120-159','90-119']
  color_index smallint,
  melt_rating smallint check (melt_rating is null or melt_rating between 0 and 6),
  texture     text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (batch_id, client_id)
);
create index if not exists merged_grades_batch_idx on public.merged_grades(batch_id);
-- Derived dry weight = sum of constituent bags.dry_g (computed in app / views, not stored).

-- Photos can attach to a merged grade too:
alter table public.photos
  add column if not exists merged_grade_id uuid references public.merged_grades(id) on delete cascade;
create index if not exists photos_merge_idx on public.photos(merged_grade_id);


-- ─────────────────────────────────────────────────────────────
-- 10h. Saved grade combinations — reusable merge templates (per user)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.grade_combos (
  id         uuid primary key default uuid_generate_v4(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  label      text not null,
  band_ids   text[] not null,
  use_count  integer not null default 0,
  created_at timestamptz not null default now(),
  unique (owner_id, label)
);
create index if not exists grade_combos_owner_idx on public.grade_combos(owner_id);


-- ─────────────────────────────────────────────────────────────
-- 10f. Constrain cure_observations score ranges
-- ─────────────────────────────────────────────────────────────
do $$ begin
  alter table public.cure_observations
    add constraint cure_obs_terps_range
      check (terps_score is null or terps_score between 1 and 10);
  alter table public.cure_observations
    add constraint cure_obs_taste_range
      check (taste_score is null or taste_score between 1 and 10);
  alter table public.cure_observations
    add constraint cure_obs_color_range
      check (color_index is null or color_index between 0 and 20);
  alter table public.cure_observations
    add constraint cure_obs_melt_range
      check (melt_rating is null or melt_rating between 1 and 6);
exception when duplicate_object then null; end $$;


-- ─────────────────────────────────────────────────────────────
-- 11. Photos (polymorphic: belongs to a batch OR a bag OR a press)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.photos (
  id           uuid primary key default uuid_generate_v4(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  batch_id     uuid references public.batches(id) on delete cascade,
  bag_id       uuid references public.bags(id)     on delete cascade,
  press_id     uuid references public.presses(id)  on delete cascade,
  cure_log_id  uuid references public.cure_logs(id) on delete cascade,
  cure_obs_id  uuid references public.cure_observations(id) on delete cascade,
  storage_path text not null,                                        -- "<bucket>/<owner_id>/<uuid>.jpg"
  caption      text,
  width        integer,
  height       integer,
  size_bytes   integer,
  taken_at     timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  check (
    (batch_id is not null)::int + (bag_id is not null)::int + (press_id is not null)::int >= 1
  )
);
create index if not exists photos_batch_idx on public.photos(batch_id);
create index if not exists photos_bag_idx   on public.photos(bag_id);
create index if not exists photos_press_idx on public.photos(press_id);
create index if not exists photos_owner_idx on public.photos(owner_id);


-- ─────────────────────────────────────────────────────────────
-- 12. Timers (persist across app kills)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.timers (
  id          uuid primary key default uuid_generate_v4(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  batch_id    uuid references public.batches(id) on delete cascade,
  kind        text not null,                                         -- 'wash_pass' | 'freeze_dry' | 'press'
  target_ms   integer,                                               -- duration target (null = open elapsed)
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  meta        jsonb not null default '{}'::jsonb
);
create index if not exists timers_owner_idx on public.timers(owner_id);
create index if not exists timers_batch_idx on public.timers(batch_id);


-- ─────────────────────────────────────────────────────────────
-- 13. Community shares (anonymized aggregates view)
-- ─────────────────────────────────────────────────────────────
create or replace view public.community_batches as
  select
    b.id, b.strain, b.material_type,
    b.input_g,
    (select sum(dry_g) from public.bags where batch_id = b.id) as total_dry_g,
    (select sum(yield_g) from public.presses where batch_id = b.id) as total_rosin_g,
    b.wash_date, b.press_date,
    b.room_temp_lo_f, b.room_temp_hi_f,
    b.water_temp_lo_f, b.water_temp_hi_f
  from public.batches b
  where b.community_shared = true
    and b.stage = 'done';


-- ─────────────────────────────────────────────────────────────
-- 14. updated_at trigger
-- ─────────────────────────────────────────────────────────────
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare r record;
begin
  for r in
    select table_name from information_schema.columns
    where table_schema = 'public' and column_name = 'updated_at'
  loop
    execute format(
      'drop trigger if exists trg_touch_%1$s on public.%1$s;
       create trigger trg_touch_%1$s
         before update on public.%1$s
         for each row execute function public.touch_updated_at();',
      r.table_name
    );
  end loop;
end $$;


-- ============================================================
-- ROW LEVEL SECURITY
-- Every table is owner-scoped. Community view is public-readable.
-- ============================================================

alter table public.profiles         enable row level security;
alter table public.farms            enable row level security;
alter table public.batches          enable row level security;
alter table public.wash_passes      enable row level security;
alter table public.bags             enable row level security;
alter table public.presses          enable row level security;
alter table public.cure_logs        enable row level security;
alter table public.cure_observations enable row level security;
alter table public.press_presets    enable row level security;
alter table public.wash_presets     enable row level security;
alter table public.texture_options  enable row level security;
alter table public.photos           enable row level security;
alter table public.timers           enable row level security;

-- Profiles: user owns their own row; community handles are publicly readable
drop policy if exists profiles_self_rw on public.profiles;
create policy profiles_self_rw on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists profiles_public_read on public.profiles;
create policy profiles_public_read on public.profiles
  for select using (community_opt_in = true);

-- Farms
drop policy if exists farms_owner_rw on public.farms;
create policy farms_owner_rw on public.farms
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Batches (owner RW + public read of community-shared rows)
drop policy if exists batches_owner_rw on public.batches;
create policy batches_owner_rw on public.batches
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists batches_public_read on public.batches;
create policy batches_public_read on public.batches
  for select using (community_shared = true);

-- Child tables of batches: access follows the parent batch
drop policy if exists wash_passes_owner_rw on public.wash_passes;
create policy wash_passes_owner_rw on public.wash_passes
  for all using (
    exists (select 1 from public.batches b where b.id = batch_id and b.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.batches b where b.id = batch_id and b.owner_id = auth.uid())
  );

drop policy if exists bags_owner_rw on public.bags;
create policy bags_owner_rw on public.bags
  for all using (
    exists (select 1 from public.batches b where b.id = batch_id and b.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.batches b where b.id = batch_id and b.owner_id = auth.uid())
  );

drop policy if exists presses_owner_rw on public.presses;
create policy presses_owner_rw on public.presses
  for all using (
    exists (select 1 from public.batches b where b.id = batch_id and b.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.batches b where b.id = batch_id and b.owner_id = auth.uid())
  );

-- Cure logs (parented through batches)
drop policy if exists cure_logs_owner_rw on public.cure_logs;
create policy cure_logs_owner_rw on public.cure_logs
  for all using (
    exists (select 1 from public.batches b where b.id = batch_id and b.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.batches b where b.id = batch_id and b.owner_id = auth.uid())
  );

drop policy if exists cure_obs_owner_rw on public.cure_observations;
create policy cure_obs_owner_rw on public.cure_observations
  for all using (
    exists (
      select 1 from public.cure_logs cl
      join public.batches b on b.id = cl.batch_id
      where cl.id = cure_log_id and b.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.cure_logs cl
      join public.batches b on b.id = cl.batch_id
      where cl.id = cure_log_id and b.owner_id = auth.uid()
    )
  );

-- User-owned resources
drop policy if exists press_presets_owner_rw on public.press_presets;
create policy press_presets_owner_rw on public.press_presets
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Merged grades follow their parent batch's ownership
alter table public.merged_grades enable row level security;
drop policy if exists merged_grades_owner_rw on public.merged_grades;
create policy merged_grades_owner_rw on public.merged_grades
  for all using (
    exists (select 1 from public.batches b where b.id = batch_id and b.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.batches b where b.id = batch_id and b.owner_id = auth.uid())
  );

-- Saved grade combos are per-user
alter table public.grade_combos enable row level security;
drop policy if exists grade_combos_owner_rw on public.grade_combos;
create policy grade_combos_owner_rw on public.grade_combos
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists wash_presets_owner_rw on public.wash_presets;
create policy wash_presets_owner_rw on public.wash_presets
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists texture_options_owner_rw on public.texture_options;
create policy texture_options_owner_rw on public.texture_options
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Cure / container / source / harvest vocabulary tables
alter table public.cure_method_options    enable row level security;
alter table public.container_options      enable row level security;
alter table public.source_type_options    enable row level security;
alter table public.harvest_type_options   enable row level security;

drop policy if exists cure_method_options_owner_rw on public.cure_method_options;
create policy cure_method_options_owner_rw on public.cure_method_options
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists container_options_owner_rw on public.container_options;
create policy container_options_owner_rw on public.container_options
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists source_type_options_owner_rw on public.source_type_options;
create policy source_type_options_owner_rw on public.source_type_options
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists harvest_type_options_owner_rw on public.harvest_type_options;
create policy harvest_type_options_owner_rw on public.harvest_type_options
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists photos_owner_rw on public.photos;
create policy photos_owner_rw on public.photos
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists timers_owner_rw on public.timers;
create policy timers_owner_rw on public.timers
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());


-- ============================================================
-- STORAGE POLICIES
-- Run after creating the buckets in Supabase Studio.
-- ============================================================

-- Allow authenticated users to read/write files under their own prefix:
-- files must be uploaded at path "<auth.uid()>/<anything>"
-- (Paste into SQL editor; storage.objects already exists.)

drop policy if exists "batch-photos owner rw"  on storage.objects;
create policy "batch-photos owner rw" on storage.objects
  for all to authenticated
  using  (bucket_id = 'batch-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'batch-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "press-photos owner rw"  on storage.objects;
create policy "press-photos owner rw" on storage.objects
  for all to authenticated
  using  (bucket_id = 'press-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'press-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars public read"  on storage.objects;
create policy "avatars public read" on storage.objects
  for select to public
  using (bucket_id = 'avatars');

drop policy if exists "avatars owner write"  on storage.objects;
create policy "avatars owner write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);


-- ============================================================
-- CONVENIENCE VIEWS & ANALYTICS
-- ============================================================

-- Per-batch hydrated summary
create or replace view public.batch_summary as
select
  b.*,
  (select sum(wet_g)  from public.bags  where batch_id = b.id)              as total_wet_g,
  (select sum(dry_g)  from public.bags  where batch_id = b.id)              as total_dry_g,
  (select sum(yield_g) from public.presses where batch_id = b.id)           as total_rosin_g,
  (select count(*)     from public.presses where batch_id = b.id)           as press_count,
  -- Cure stats (latest active cure log)
  (select method from public.cure_logs where batch_id = b.id order by created_at desc limit 1)         as cure_method,
  (select container from public.cure_logs where batch_id = b.id order by created_at desc limit 1)      as cure_container,
  (select vacuum_sealed from public.cure_logs where batch_id = b.id order by created_at desc limit 1)  as cure_vacuum,
  (select started_at from public.cure_logs where batch_id = b.id order by created_at desc limit 1)     as cure_started_at,
  (select target_days from public.cure_logs where batch_id = b.id order by created_at desc limit 1)    as cure_target_days,
  (select extract(day from now() - started_at)::int
     from public.cure_logs where batch_id = b.id and started_at is not null
     order by created_at desc limit 1)                                       as cure_days_elapsed,
  case when b.input_g > 0
    then round(((select coalesce(sum(dry_g),0) from public.bags where batch_id = b.id) / b.input_g * 100)::numeric, 2)
    else null end as hash_yield_pct,
  case when (select coalesce(sum(dry_g),0) from public.bags where batch_id = b.id) > 0
    then round(((select coalesce(sum(yield_g),0) from public.presses where batch_id = b.id)
                / (select sum(dry_g) from public.bags where batch_id = b.id) * 100)::numeric, 2)
    else null end as rosin_return_pct
from public.batches b;

-- Per-strain rollup (for the user's personal analytics)
create or replace view public.strain_stats as
select
  owner_id,
  strain,
  count(*)                              as batch_count,
  round(avg(hash_yield_pct)::numeric,2) as avg_hash_yield_pct,
  round(avg(rosin_return_pct)::numeric,2) as avg_rosin_return_pct,
  max(press_date)                       as last_pressed_at
from public.batch_summary
where stage = 'done'
group by owner_id, strain;


-- Per-strain × cure-method rollup — answers "which cure method works best for X?"
create or replace view public.cure_strain_stats as
select
  b.owner_id,
  b.strain,
  cl.method                                                          as cure_method,
  cl.container                                                       as cure_container,
  cl.vacuum_sealed                                                   as cure_vacuum,
  count(distinct b.id)                                               as batch_count,
  round(avg(co.terps_score)::numeric, 2)                             as avg_terps_score,
  round(avg(co.taste_score)::numeric, 2)                             as avg_taste_score,
  round(avg(co.melt_rating)::numeric, 2)                             as avg_melt_rating,
  round(avg(co.color_index)::numeric, 2)                             as avg_color_index,
  count(co.id)                                                       as observation_count
from public.batches b
join public.cure_logs cl              on cl.batch_id = b.id
left join public.cure_observations co on co.cure_log_id = cl.id
where b.stage = 'done' and cl.started_at is not null
group by b.owner_id, b.strain, cl.method, cl.container, cl.vacuum_sealed;


-- Yield-by-micron rollup per strain — answers "what's my avg 90µ rosin yield for X?"
create or replace view public.strain_yield_by_micron as
select
  b.owner_id,
  b.strain,
  band.band_id,
  count(*)                                                           as press_count,
  round(sum( (p.yield_by_grade ->> band.band_id)::numeric )::numeric, 2) as total_yield_g,
  round(avg( (p.yield_by_grade ->> band.band_id)::numeric )::numeric, 2) as avg_yield_g
from public.batches b
join public.presses p on p.batch_id = b.id
cross join lateral (values
  ('160-219'::text), ('120-159'::text), ('90-119'::text), ('45-89'::text)
) as band(band_id)
where p.yield_by_grade ? band.band_id
group by b.owner_id, b.strain, band.band_id;


-- ─────────────────────────────────────────────────────────────
-- Merged-grade analytics
-- ─────────────────────────────────────────────────────────────

-- Per merged-grade INSTANCE: combined dry, total rosin yield, return %.
create or replace view public.merged_grade_yield as
select
  b.owner_id,
  b.id                                     as batch_id,
  b.strain,
  mg.id                                    as merged_grade_id,
  mg.client_id,
  mg.label,
  mg.band_ids,
  (select coalesce(sum(bg.dry_g),0)
     from public.bags bg
    where bg.batch_id = b.id and bg.band_id = any(mg.band_ids))            as combined_dry_g,
  (select coalesce(sum( (p.yield_by_grade ->> mg.client_id)::numeric ),0)
     from public.presses p
    where p.batch_id = b.id and p.yield_by_grade ? mg.client_id)           as rosin_yield_g
from public.batches b
join public.merged_grades mg on mg.batch_id = b.id;

-- Per-user rollup BY BLEND LABEL — answers "your 90–159µ Blend averages X% yield".
-- Groups every realized merged grade (and saved-combo usage) by its label.
create or replace view public.merged_grade_stats as
select
  owner_id,
  label,
  count(*)                                                              as times_made,
  round(avg(combined_dry_g)::numeric, 2)                               as avg_dry_g,
  round(sum(rosin_yield_g)::numeric, 2)                                as total_rosin_g,
  round(avg(rosin_yield_g)::numeric, 2)                                as avg_rosin_g,
  round(avg(case when combined_dry_g > 0
                 then rosin_yield_g / combined_dry_g * 100 end)::numeric, 2) as avg_return_pct
from public.merged_grade_yield
group by owner_id, label;

-- Saved-combo performance — links each saved grade_combo to the merged grades
-- realized from the same band set, so a combo carries its own yield history.
create or replace view public.combo_stats as
select
  gc.owner_id,
  gc.id            as combo_id,
  gc.label         as combo_label,
  gc.band_ids,
  count(mgy.merged_grade_id)                                           as times_used,
  round(avg(mgy.combined_dry_g)::numeric, 2)                           as avg_dry_g,
  round(avg(mgy.rosin_yield_g)::numeric, 2)                            as avg_rosin_g,
  round(avg(case when mgy.combined_dry_g > 0
                 then mgy.rosin_yield_g / mgy.combined_dry_g * 100 end)::numeric, 2) as avg_return_pct
from public.grade_combos gc
left join public.merged_grade_yield mgy
  on mgy.owner_id = gc.owner_id
 -- same set of bands, order-independent
 and (select array_agg(x order by x) from unnest(mgy.band_ids) x)
   = (select array_agg(x order by x) from unnest(gc.band_ids) x)
group by gc.owner_id, gc.id, gc.label, gc.band_ids;


-- ============================================================
-- DONE. Next steps:
--   1. Create buckets (batch-photos, press-photos, avatars) in Studio
--   2. Seed auth provider config (email magic link, Google OAuth)
--   3. Generate TS types: `supabase gen types typescript --project-id <id>`
-- ============================================================
