-- Paramedic Monitor — Initial Schema
-- Run this in the Supabase SQL Editor for your project.
-- After running: enable Realtime on the vitals_snapshots table in the Supabase dashboard
--   (Table Editor → vitals_snapshots → Realtime toggle ON)

-- ─────────────────────────────────────────────────────────────────────────────
-- sessions
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists sessions (
  id         uuid        primary key default gen_random_uuid(),
  code       text        unique not null,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- vitals_snapshots
-- Each row = one instructor Send event.
-- Latest row per session_id = current state for late-joiner recovery.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists vitals_snapshots (
  id           uuid        primary key default gen_random_uuid(),
  session_id   uuid        references sessions(id) on delete cascade not null,
  hr           smallint    not null default 80,
  bp_sys       smallint    not null default 120,
  bp_dia       smallint    not null default 80,
  etco2        smallint    not null default 35,
  spo2         smallint    not null default 98,
  rhythm       text        not null default 'nsr'
                           check (rhythm in ('nsr','vf','vt','asystole','pea')),
  patient_mode text        not null default 'adult'
                           check (patient_mode in ('adult','pediatric','neonate')),
  joules       smallint    not null default 120,
  shock_count  smallint    not null default 0,
  cpr_active   boolean     not null default false,
  etco2_mode   boolean     not null default false,
  created_at   timestamptz default now()
);

create index if not exists vitals_snapshots_session_id_created_at_idx
  on vitals_snapshots (session_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- scenarios
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists scenarios (
  id          uuid        primary key default gen_random_uuid(),
  session_id  uuid        references sessions(id) on delete cascade not null,
  name        text        not null,
  timing_mode text        not null default 'manual'
                          check (timing_mode in ('manual','timed')),
  states      jsonb       not null default '[]'::jsonb,
  created_at  timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- Sessions are public-readable (students join by code).
-- Inserts are allowed from the anon key (no auth in this app).
-- ─────────────────────────────────────────────────────────────────────────────
alter table sessions          enable row level security;
alter table vitals_snapshots  enable row level security;
alter table scenarios         enable row level security;

-- Allow anyone to read sessions (needed to validate a join code)
create policy "sessions: public read"
  on sessions for select using (true);

-- Allow anyone to insert sessions (instructor creates one)
create policy "sessions: public insert"
  on sessions for insert with check (true);

-- Allow anyone to read vitals for any session
create policy "vitals_snapshots: public read"
  on vitals_snapshots for select using (true);

-- Allow anyone to insert vitals (instructor sends)
create policy "vitals_snapshots: public insert"
  on vitals_snapshots for insert with check (true);

-- Allow anyone to read scenarios
create policy "scenarios: public read"
  on scenarios for select using (true);

-- Allow anyone to insert/update scenarios (instructor manages them)
create policy "scenarios: public insert"
  on scenarios for insert with check (true);

create policy "scenarios: public update"
  on scenarios for update using (true);
