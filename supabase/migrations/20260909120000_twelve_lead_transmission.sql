-- Phase 18 — simulated 12-lead transmission destinations.
--
-- A trainee can transmit one completed 12-lead capture to any of the fixed
-- curriculum destinations. Each press is retained as its own Evaluation action;
-- no external clinical system receives data.

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
    'twelve_lead_send',
    'print',
    'etco2_toggle',
    'energy_change',
    'treatment_menu',
    'patient_info',
    'sample_ask',
    'opqrst_ask'
  ));
