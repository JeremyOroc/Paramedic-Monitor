---
status: superseded by ADR-0013
---

# Allow public Instructor registration without in-app account administration

Any person with a unique username and verified email may self-register and receives the Instructor
role. The first release does not restrict registration by college domain, invitation, or enrollment
code, and its Administrators do not manage Accounts; Product operators perform account and rare role
operations directly through Supabase to keep the single-college application small.

## Consequences

- Registration is an internet-facing abuse surface. Application CAPTCHA and custom throttling are
  deliberately deferred for the first release, while Supabase's platform controls remain active;
  stronger protection is a documented future reconsideration.
- New Accounts can create Rooms, own Personal scenarios, read Templates, and retain their own
  Evaluation records immediately after verification.
- Administrator creation and removal are operational procedures, not ordinary application actions.
