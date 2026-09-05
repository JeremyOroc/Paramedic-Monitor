---
status: accepted
---

# Stage the destructive account rollout behind maintenance

The account cutover disables Room creation and joining while operators back up the database, migrate
and verify ownership schema, convert the existing scenario library into Templates, remove unowned
legacy Rooms/reports, configure secrets and SMTP, provision initial Administrators, and run the full
acceptance gate.

## Consequences

- Rollout is scheduled outside teaching activity and exposes an explicit maintenance state.
- Before any new Account-owned data exists, operators may restore the verified pre-migration backup
  and previous application.
- After new Account data exists, blind restoration is prohibited because it would erase valid work;
  recovery uses maintenance plus a reviewed forward fix or data reconciliation.
- Acceptance must prove authentication, authorization, cross-Account isolation, Template auditing,
  Room control, report lifecycle, migration counts, backup restoration, SMTP, and supported browsers.
- A server-side Account-system feature gate defaults off and can return the application to maintenance
  without reverting schema or deleting new data.
- Critical cleanup, migration, backup, and repeated SMTP failures are recorded without secrets or
  personal content and emailed to the developer distribution list.
