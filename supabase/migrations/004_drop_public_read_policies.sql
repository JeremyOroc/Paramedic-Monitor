-- All session reads and writes go through the API routes, which use the
-- service-role key and bypass RLS. The public-read policies from migration
-- 002 let anyone with the anon key read every room's participants (including
-- token hashes), student events, and shared state — drop them. RLS stays
-- enabled on these tables, so the anon key now gets nothing.
--
-- If browser-side Supabase Realtime table subscriptions are ever added,
-- prefer Broadcast channels (no table read policies required) over
-- reintroducing public reads.

drop policy if exists "session_state: public read" on session_state;
drop policy if exists "participants: public read" on participants;
drop policy if exists "participant_attempts: public read" on participant_attempts;
drop policy if exists "student_events: public read" on student_events;
