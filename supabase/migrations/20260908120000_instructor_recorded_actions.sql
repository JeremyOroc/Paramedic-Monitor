-- Phase 16 — actions the instructor records on the trainee's behalf.
--
-- Two things happen in a real drill that the record could not hold:
--
--   1. The paramedic gives a drug with both hands full and never reaches the
--      monitor's medication keys. The med was given; the record said nothing.
--   2. The trainee asks a SAMPLE or OPQRST question out loud. Asking is the
--      skill being assessed, and it left no trace at all -- the console's
--      letter buttons were local highlight and nothing more.
--
-- Both are trainee actions. The instructor is only the one at a keyboard, so
-- these rows are credited to the participant and carry `payload.source =
-- 'instructor'` to say who pressed the key. That keeps one timeline per
-- trainee instead of two streams the evaluator has to interleave by eye.
--
-- `medication` already exists (the monitor emits it), so only the two ask
-- kinds are new.

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
    'patient_info',
    'sample_ask',
    'opqrst_ask'
  ));
