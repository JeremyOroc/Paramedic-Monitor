-- Attempt names.
--
-- The room has no attempt record of its own: sessions.active_attempt_version
-- is an integer and participant_attempts is per trainee. A name is a property
-- of the room's attempt, so this is the missing entity. A row exists only once
-- an attempt has been named; an unnamed attempt has none.
create table if not exists session_attempts (
  session_id      uuid        references sessions(id) on delete cascade not null,
  attempt_version integer     not null,
  label           text        not null default '',
  updated_at      timestamptz not null default now(),
  primary key (session_id, attempt_version)
);

alter table session_attempts enable row level security;
revoke all on session_attempts from anon, authenticated;
grant select, insert, update on table session_attempts to service_role;
