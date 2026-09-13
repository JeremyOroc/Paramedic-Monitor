---
status: accepted
---

# Preserve legacy participant schema names behind device-oriented product language

Room membership represents Scenario devices that may be shared by one or more Trainees, but the
existing `participants`, `participant_id`, and `student_events` database and code identifiers remain
unchanged. Correcting user-facing and domain language prevents person-level attribution while
avoiding a broad migration across authorization, Room state, projections, and persistent Evaluation
records solely to rename established storage contracts.
