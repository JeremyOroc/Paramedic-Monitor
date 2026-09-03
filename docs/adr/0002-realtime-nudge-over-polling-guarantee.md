---
status: accepted
---

# Realtime as an accelerator over a polling guarantee

The trainee monitor and the Instructor Console sync through the database by polling, and that stays the source of truth: every client polls on a slow interval, sending the version it already holds so an unchanged room costs almost nothing. Supabase Realtime is layered on top only as a nudge — a broadcast tells a client to poll now, so a Send reaches the monitor in well under a second on the happy path — and is never the only path a state change takes. We chose this over Realtime alone because a broadcast dropped during a wifi outage is gone, and a monitor that missed it would sit on a stale patient with no error anywhere; polling re-fetches truth by construction and cannot get stuck. We chose it over polling alone because polling bills per request whether or not anything changed, and the room data shows a state change roughly every thirteen minutes against a poll every second and a half, which stops scaling around a few hundred concurrent clients.

## Consequences

- Removing either path is a regression, not a cleanup: the poll is the correctness guarantee, the broadcast is the latency guarantee, and each looks redundant next to the other.
- `PLAN.md` and `STATUS.md` previously recorded Supabase Broadcast alone as the locked mechanism; this supersedes that.
- Trainee presence on the instructor roster is inferred from the poll today, so the poll cannot slow down until presence moves to the Realtime channel. The two arrive together; slowing the poll first would show every connected trainee as offline.
