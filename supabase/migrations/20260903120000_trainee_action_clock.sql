-- Phase 14 -- the trainee action's own clock (docs/adr/0004).
--
-- `occurred_at` is the server's insert time. For an action pressed during a
-- wifi drop and replayed later, that is the wrong time and, with the state
-- version stamped at insert, the wrong patient. These three columns let the
-- monitor say when it pressed the button and what it was showing.
--
-- All nullable: rows from before this migration have no client clock, and the
-- report falls back to `occurred_at` for them.
alter table student_events
  add column if not exists occurred_at_client timestamptz,
  add column if not exists capture_sequence   integer,
  add column if not exists clock_offset_ms    integer;
