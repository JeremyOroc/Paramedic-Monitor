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
- A protected Account profile keyed by that ID is the canonical role and enabled/disabled source.
  Least-privilege grants, RLS, and protected server routes consult current database state rather than
  trusting role/status solely from a JWT that may be stale.
- Disabling an Account must deny existing sessions immediately through those current-state checks,
  end its active Room, and return its browsers to sign-in even if an access token has time remaining.
- The service-role key remains server-only, and database policy tests cover both allowed and denied
  operations for anonymous, Instructor, Administrator, owner, and non-owner callers.
- The requested username/password experience needs an explicit adapter because Supabase password
  authentication natively accepts email or telephone identities, not usernames.
- The three initial Administrators are manually created and verified, then promoted by immutable Auth
  user ID; their reserved username text is never an authorization rule.
