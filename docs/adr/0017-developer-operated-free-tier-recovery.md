---
status: accepted
---

# Permit Free-tier production only with developer-operated recovery

Supabase Free is the development and internal-evaluation default and may remain the first classroom
production tier after a readiness review. Pro is an available upgrade, not a predetermined purchase.
If Free remains, the developers own a complete independent backup and recovery system rather than
treating a normal application-table dump as equivalent to managed project recovery.

## Consequences

- Recovery covers application schema/data, Supabase Auth identities, and immutable ownership mappings.
  The mechanism must account for the CLI's default exclusion of managed schemas such as `auth`.
- Nightly encrypted backups go to private, institution-approved off-site storage, with 30 daily and
  12 monthly copies. Two designated developers receive failure alerts.
- A whole-project restoration is rehearsed and documented quarterly.
- After a five-or-more-day break, a developer performs registration, login, Room, and report smoke
  tests at least one business day before the next class.
- If the college cannot accept this availability dependency or recovery posture, production moves to
  an appropriate paid plan.
