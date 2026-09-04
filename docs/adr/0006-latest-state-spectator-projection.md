---
status: accepted
---

# Keep one retryable latest Spectator projection per trainee

The Spectator feature stores one latest monitor projection per trainee and polls it as the correctness path, rather than retaining a frame history or treating the evaluation event log as a replay stream. Failed publications coalesce to the newest state and retry until accepted because spectating answers “what is visible now,” while the separate evaluation record owns historical trainee actions; this bounds storage and recovery work without making a temporary network outage leave the instructor permanently stale.

## Consequences

- Projection writes require attempt scoping and ordering protection so delayed or duplicated requests cannot replace a newer state.
- New Attempt clears the current projection, and room cleanup removes it with the room.
- Timed phases carry absolute timestamps so the Spectator view can animate smoothly between its one-second authoritative polls without storing intermediate frames.
- Trainee presence, projection freshness, and Spectator connectivity are separate states and must not be presented as interchangeable.
