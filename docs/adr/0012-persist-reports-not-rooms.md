---
status: accepted
---

# Persist Evaluation records instead of ended Rooms

Ending a Room discards its temporary live-operation state, while each completed Attempt produces a
persistent Evaluation record owned by the creating Instructor Account. This supports later review
and instructor-entered student names without retaining the mutable state, access paths, and presence
data of an inactive classroom Room indefinitely.

## Consequences

- A Room with several Attempts produces a separate persistent Evaluation record for each Attempt.
- Report lifecycle and access follow Account ownership rather than the expired Room's join or host
  credentials.
