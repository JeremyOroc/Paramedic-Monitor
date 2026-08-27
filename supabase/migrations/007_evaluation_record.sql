-- Phase 12 — the evaluation record.
--
-- The instructor is an evaluator reviewing drills after the fact. Two axes are
-- needed and neither existed: what the trainee did (only 8 of their controls
-- emitted events) and what the patient was at that moment (session_state is
-- overwritten in place, so no context survived the next Send).
--
-- Scoring stays with the evaluator. This migration only stores the data.

-- ─────────────────────────────────────────────────────────────────────────────
-- 12b — instructor-side state history
-- Append-only. Written alongside the session_state upsert, never read by the
-- 1.5s student poll: history sits beside the hot path, not on it.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists session_state_history (
  id              uuid        primary key default gen_random_uuid(),
  session_id      uuid        references sessions(id) on delete cascade not null,
  attempt_version integer     not null,
  version         integer     not null,
  state           jsonb       not null,
  applied_at      timestamptz not null default now(),
  unique (session_id, version)
);

create index if not exists session_state_history_session_attempt_idx
  on session_state_history (session_id, attempt_version, version asc);

alter table session_state_history enable row level security;
revoke all on session_state_history from anon, authenticated;
grant select, insert on table session_state_history to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 12c — link each action to the patient state behind it
-- Joins to session_state_history on (session_id, state_version -> version).
-- Nullable: rows predating this migration have no state to point at, and an
-- event fired before the instructor's first Send legitimately has none.
-- ─────────────────────────────────────────────────────────────────────────────
alter table student_events
  add column if not exists state_version integer;

-- ─────────────────────────────────────────────────────────────────────────────
-- 12d — pin `kind` to the known set
-- recordStudentEvent passed input.kind straight from the request body into a
-- plain text column, so a trainee with devtools could write arbitrary kinds
-- into the record. The TS union was a claim the database did not enforce.
-- ─────────────────────────────────────────────────────────────────────────────
alter table student_events
  drop constraint if exists student_events_kind_check;

alter table student_events
  add constraint student_events_kind_check check (kind in (
    'acknowledge',
    'arrival',
    'transport',
    'medication',
    'analyze',
    'charge',
    'shock',
    'etco2_calibration',
    'nibp_start',
    'nibp_result',
    'power_on',
    'power_off',
    'twelve_lead',
    'twelve_lead_capture',
    'print',
    'etco2_toggle',
    'energy_change',
    'treatment_menu',
    'patient_info'
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- 12f — review query correctness
-- getReview ordered occurred_at ascending with no limit, so PostgREST's
-- 1000-row cap truncated the NEWEST rows: on a long session the live roster
-- silently stopped updating. Reviews are now filtered by attempt.
-- ─────────────────────────────────────────────────────────────────────────────
create index if not exists student_events_session_attempt_occurred_idx
  on student_events (session_id, attempt_version, occurred_at asc);

-- ─────────────────────────────────────────────────────────────────────────────
-- 12e — participant identity integrity
-- Identity is a localStorage token, so a cleared store or a second device made
-- a second participants row with the same nickname, splitting that trainee's
-- events across two ids. Collapse duplicates oldest-first, then forbid new ones.
--
-- Accepted trade-off: room code + nickname is now enough to assume an identity.
-- In a supervised classroom that is the right trade for a correct roster.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  duplicate record;
  survivor_id uuid;
begin
  for duplicate in
    select session_id, lower(nickname) as key
      from participants
     group by session_id, lower(nickname)
    having count(*) > 1
  loop
    select id into survivor_id
      from participants
     where session_id = duplicate.session_id
       and lower(nickname) = duplicate.key
     order by joined_at asc
     limit 1;

    update student_events
       set participant_id = survivor_id
     where participant_id in (
       select id from participants
        where session_id = duplicate.session_id
          and lower(nickname) = duplicate.key
          and id <> survivor_id
     );

    -- participant_attempts is unique on (participant_id, attempt_version), so
    -- reassigning would collide. The survivor already has its own attempt rows;
    -- drop the losers' and let the cascade clear the rest.
    delete from participant_attempts
     where participant_id in (
       select id from participants
        where session_id = duplicate.session_id
          and lower(nickname) = duplicate.key
          and id <> survivor_id
     );

    delete from participants
     where session_id = duplicate.session_id
       and lower(nickname) = duplicate.key
       and id <> survivor_id;
  end loop;
end;
$$;

create unique index if not exists participants_session_nickname_idx
  on participants (session_id, lower(nickname));
