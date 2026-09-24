---
status: accepted
---

# Separate Treatment records from editable and immutable Attempt notes

The product will use Treatment as the report-facing umbrella for medication and trauma
interventions. New intervention records carry stable medication or trauma category metadata, while
historical `medication` rows remain unchanged in storage and are normalized to `Treatment {name}`
when rendered. This avoids a destructive historical rewrite and gives future Treatment categories a
clear extension point.

Attempt notes use two records because their editing and history semantics differ. General Notes are
one mutable latest-value narrative on an Attempt and its Evaluation record. Each successful Report
Note Send creates an immutable, timestamped Instructor Note in the report timeline. Instructor Notes
are Attempt-wide annotations and never masquerade as Scenario-device actions credited to a Trainee.

## Consequences

- Treatment readers must support both legacy `medication` rows and new categorized treatment rows.
- The Scenario-device Medications workflow keeps its established label even though Evaluation rows
  use Treatment wording.
- General Notes require explicit instructor saves, ownership checks, unsaved-draft protection, and
  persistent-report update support.
- Instructor Notes require append-only storage and timeline snapshot/readback support independent of
  participant-scoped action records.
- Database changes and compatibility tests must be complete before the new UI can be considered
  finished; production migration remains a separate authorization gate.
