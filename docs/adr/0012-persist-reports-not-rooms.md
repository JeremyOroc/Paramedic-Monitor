---
status: accepted
---

# Persist Evaluation records instead of ended Rooms

An Evaluation record is created and autosaved from Attempt start, remains Incomplete until New
Attempt or End Room, and persists under the creating Instructor Account after the Room's temporary
live-operation state is discarded. This supports interruption recovery and later review without
retaining the mutable access paths and presence data of an inactive classroom Room indefinitely.

## Consequences

- A Room with several Attempts produces a separate persistent Evaluation record for each Attempt.
- A record contains every participating trainee and may carry Instructor-entered Student names that
  are deliberately separate from join nicknames. The list is bounded at 100 entries of 100 characters,
  preserves capitalization, drops blanks, and permits duplicate names.
- Each record stores an immutable scenario name, confirmed defibrillator model, and report-relevant
  configuration at Attempt start; later edits or deletion of the source scenario do not rewrite it.
- Report lifecycle and access follow Account ownership rather than the expired Room's join or host
  credentials.
- Records remain until their owner permanently deletes them; no automatic expiry exists in the first
  development/pilot release. Production rollout is blocked on a college-approved retention period
  and deletion process, after which the product and operational policy must match that decision.
- Once its Room ends or expires, an owner may manually complete an Incomplete record without changing
  its timeline; expiry never silently claims that an Attempt completed normally.
- Reports may be searched, opened, have their Attempt/Student names edited, have their timeline
  copied, and be permanently deleted. Export, sharing, grading, comments, and bulk operations remain
  outside the first release.
- The list is newest-first and paginated by 25, with combined case-insensitive Attempt/scenario/Student
  search, status filter, and date range. UTC timestamps display in Toronto time, and copied timelines
  carry EST/EDT.
- Students have no direct report access. College-verified correction, extraction, or deletion requests
  are fulfilled operationally by Product operators against the specifically identified record.
- Permanent deletion requires a second confirmation that identifies the Attempt, scenario, and date;
  it does not require typed-name confirmation.
- Creation, name edits, manual completion, deletion, and operator corrections produce audit rows with
  actor, action, report ID, and timestamp but no Student names or report contents. Ordinary views are
  not logged.
