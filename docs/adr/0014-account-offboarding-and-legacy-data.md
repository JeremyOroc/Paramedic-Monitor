---
status: accepted
---

# Separate Account disablement from deletion and remove unowned legacy data

Product operators manage Account lifecycle through Supabase rather than an in-application Account
console. Reversible disablement blocks access and ends active operation without erasing owned work;
permanent deletion is a separate deliberate action that removes the Account's private data.

Pre-account Rooms and report data are deleted during account rollout because no authenticated owner
can be assigned reliably. Existing scenarios are the sole legacy data migrated and become Templates.

## Consequences

- Disabling an Account blocks login, ends its active Room, and preserves Personal scenarios and
  Reports for possible reactivation.
- Permanently deleting an Account also deletes its Personal scenarios and Reports. Shared Templates
  survive regardless of which Administrator created or last edited them.
- No unowned report archive or compatibility authorization path is retained after rollout.
- Rollout procedures must distinguish and confirm the destructive cleanup from the reversible Room
  expiry step.
- Account migration runs under maintenance after a verified backup. Before new Account-owned data is
  accepted, rollback may restore the old app and backup; afterwards recovery must preserve new data
  through a forward fix or reviewed reconciliation.
