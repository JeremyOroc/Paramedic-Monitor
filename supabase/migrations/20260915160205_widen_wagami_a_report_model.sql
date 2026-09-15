-- Schema contract only. Live Wagami A Attempts remain server-blocked until the A6 gate;
-- this migration does not change attempt creation or the report capture trigger.
alter table public.evaluation_reports
  drop constraint evaluation_reports_defibrillator_model_check;

alter table public.evaluation_reports
  add constraint evaluation_reports_defibrillator_model_check
  check (defibrillator_model in ('wagamiX', 'wagamiZ', 'wagamiA'));
