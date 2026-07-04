-- Session slice: secure instructor rooms, student waiting room, and per-student logs.

alter table sessions
  add column if not exists status text not null default 'waiting'
    check (status in ('waiting', 'active', 'ended')),
  add column if not exists active_attempt_version integer not null default 1,
  add column if not exists expires_at timestamptz default (now() + interval '24 hours');

create table if not exists session_hosts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade not null unique,
  token_hash text not null,
  created_at timestamptz default now()
);

create table if not exists session_state (
  session_id uuid primary key references sessions(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  version integer not null default 0,
  updated_at timestamptz default now()
);

create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade not null,
  nickname text not null,
  token_hash text not null,
  joined_at timestamptz default now(),
  last_seen_at timestamptz default now()
);

create index if not exists participants_session_id_idx
  on participants (session_id, joined_at asc);

create table if not exists participant_attempts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade not null,
  participant_id uuid references participants(id) on delete cascade not null,
  attempt_version integer not null,
  started_at timestamptz default now(),
  completed_at timestamptz,
  unique (participant_id, attempt_version)
);

create table if not exists student_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade not null,
  participant_id uuid references participants(id) on delete cascade not null,
  attempt_version integer not null,
  kind text not null,
  label text not null,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz default now()
);

create index if not exists student_events_session_participant_idx
  on student_events (session_id, participant_id, occurred_at asc);

alter table session_hosts enable row level security;
alter table session_state enable row level security;
alter table participants enable row level security;
alter table participant_attempts enable row level security;
alter table student_events enable row level security;

create policy "session_state: public read"
  on session_state for select using (true);

create policy "participants: public read"
  on participants for select using (true);

create policy "participant_attempts: public read"
  on participant_attempts for select using (true);

create policy "student_events: public read"
  on student_events for select using (true);
