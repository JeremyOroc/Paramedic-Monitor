-- Phase 6 clean-install correction — live Room server access.
--
-- The original session tables were created before explicit least-privilege
-- grants became part of the migration discipline. Existing hosted projects
-- can retain historical grants, but a clean local replay leaves service_role
-- without the SELECT/INSERT/UPDATE privileges used by the protected Room API.
-- Browser roles remain unable to access these tables directly.

revoke all on table
  public.session_state,
  public.participants,
  public.participant_attempts,
  public.student_events
from public, anon, authenticated, service_role;

grant select, insert, update on table
  public.session_state,
  public.participants,
  public.participant_attempts
to service_role;

grant select, insert on table public.student_events to service_role;
