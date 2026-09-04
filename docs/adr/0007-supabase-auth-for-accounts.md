---
status: accepted
---

# Use Supabase Auth for instructor accounts

Instructor and Administrator Accounts use Supabase Auth rather than Clerk. The first release serves
one college and does not need Clerk's organization product; Supabase already belongs to the system's
data boundary and integrates authenticated identities with Postgres authorization, while preserving
a credible path to stronger institutional authentication if it becomes a real requirement.

## Consequences

- Trainees remain unauthenticated Room participants identified by their per-Room nicknames.
- Application roles and scenario ownership must use immutable authenticated user IDs rather than
  usernames or user-editable metadata.
- The requested username/password experience needs an explicit adapter because Supabase password
  authentication natively accepts email or telephone identities, not usernames.
