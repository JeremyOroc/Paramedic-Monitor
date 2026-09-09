---
status: accepted
---

# Keep trainee Transport routing separate from instructor Dispatch routing

Each trainee owns a separate Transport leg and Selected receiving hospital for the current Attempt
instead of overwriting the instructor-confirmed Dispatch leg. This preserves the instructor's shared
scenario as the route to the Incident scene while allowing independent hospital selection, movement,
and rerouting for every trainee.

## Consequences

- Transport state is scoped to the trainee, Room, and Attempt, survives a refresh in that scope, and
  clears on reset, a new Attempt, re-dispatch, or an Incident-scene change.
- The trainee's Spectator projection includes the semantic Transport route and directory presentation.
- Hospital browsing and selection are deliberately absent from Evaluation records.
- OSRM-derived route and ranking failures cannot mutate the instructor-confirmed Dispatch leg or
  another trainee's Transport state.
