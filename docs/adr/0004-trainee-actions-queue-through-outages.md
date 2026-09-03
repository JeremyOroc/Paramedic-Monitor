---
status: accepted
---

# Trainee actions queue through outages and keep their own time

A trainee action taken while the monitor has no connection is held on the device and replayed when the connection returns, rather than fired once and forgotten. Each action carries the moment it happened and the state version the monitor was showing, so a replayed shock lands in the evaluation record at the time it was pressed and against the patient the trainee was looking at — not at the time it finally reached the server, against whatever the instructor had sent by then. We accepted the cost that the record now trusts the device clock, bounded by the server offset the monitor already measures, because the alternative — the server's insert time — silently drops or misorders exactly the actions taken during the outages that classroom wifi produces, and the record's purpose is to be complete.

## Consequences

- The server can no longer stamp the state version at insert for a replayed action; the client's claim is accepted and bounded above by the version current at insert.
- The record has two clocks. The trainee's ordering clock is authoritative for the timeline; the server's insert time remains as an audit bound.
- The evaluation record must show when a trainee action was taken against a state older than the latest the instructor had sent, so a decision made on a stale monitor reads as "had not received it yet" rather than "ignored it".
