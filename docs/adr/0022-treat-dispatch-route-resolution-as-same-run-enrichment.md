---
status: accepted
---

# Treat Dispatch route resolution as same-run enrichment

Dispatch-run identity is determined by instructor intent: the first dispatch or an intentional
normalized Incident-scene/countdown change creates a new run. Unit-origin edits and derived route
coordinates, availability, distance, duration, and geometry remain in the current run; the instructor
creates run identity and Scenario devices trust it rather than independently inferring re-dispatch from
route data. This prevents asynchronous geocoding from clearing trainee progress or reopening New
Assignment while retaining deliberate re-dispatch behavior.

## Consequences

- Instructor-authored addresses remain Save/Send-controlled, while matching route enrichment publishes
  automatically before or after Start with the existing run id and dispatch clock.
- Starting or re-dispatching with an unresolved route requires an explicit Start Anyway/Send Anyway or
  Cancel decision before clocks or network state mutate.
- Automatic enrichment retains a marked internal history version for exact action context but is not
  presented as an Instructor change and does not affect behind counts.
- Route writes are serialized, stale results are rejected, and temporary failures use bounded,
  coalesced retries with explicit recovery after exhaustion.
- Blocking dispatch on external geocoding and treating coordinate changes as incident changes are both
  rejected because route availability must not define or prevent a Dispatch run.
