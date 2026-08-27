-- Close the anon-key holes left over from migration 001.
--
-- Migration 004 revisited the session-slice tables but not these. The anon key
-- ships to every browser in NEXT_PUBLIC_SUPABASE_ANON_KEY, so
-- "sessions: public read" let anyone enumerate every room code -- and a room
-- code is the entire join credential (no password, no roster check). The
-- insert/update policies on the two unused tables were dead surface area.
--
-- Nothing in src/ needs any of these: every real read and write goes through an
-- API route on the service-role key, which bypasses RLS entirely.

drop policy if exists "sessions: public read"            on sessions;
drop policy if exists "sessions: public insert"          on sessions;
drop policy if exists "scenarios: public read"           on scenarios;
drop policy if exists "scenarios: public insert"         on scenarios;
drop policy if exists "scenarios: public update"         on scenarios;

-- vitals_snapshots has zero reads and zero writes anywhere in src/. It was the
-- original per-Send history model; session_state replaced it and the table was
-- never dropped. Phase 12b reintroduces history properly as
-- session_state_history, so this is not that table returning under a new name.
drop policy if exists "vitals_snapshots: public read"    on vitals_snapshots;
drop policy if exists "vitals_snapshots: public insert"  on vitals_snapshots;
drop table if exists vitals_snapshots;

-- `scenarios` stays: PLAN.md still has the timed-state builder deferred, not
-- cancelled. It is now service-role only, like everything else.
revoke all on scenarios from anon, authenticated;
revoke all on sessions  from anon, authenticated;
grant select, insert, update, delete on table scenarios to service_role;
grant select, insert, update, delete on table sessions  to service_role;
