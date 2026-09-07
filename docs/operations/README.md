# Production Operations

These runbooks close the repository-side operating boundary for the single-college Account release.
They do not contain production credentials, Instructor or Student information, or institutional
contacts. Those values belong in the approved secret managers and the college's private operations
record.

## Runbooks

- [Backup and restore](./backup-and-restore.md) — nightly encrypted logical exports, 30 daily and 12
  monthly copies, failure alerts, and quarterly non-production restoration.
- [Custom SMTP](./custom-smtp.md) — sending-domain setup and invitation/recovery delivery tests.
- [Deployment and maintenance](./deployment-and-maintenance.md) — coordinated maintenance,
  migrations, verification, reopening, rollback, and forward-fix boundaries.
- [Incident and Account operations](./incident-and-account-operations.md) — disablement, deletion,
  data requests, evidence handling, and college privacy coordination.
- [Release acceptance](./release-acceptance.md) — the evidence-based launch and pre-classroom gates.
- [Account invitations](./account-invitations.md) — ordinary Instructor and reserved Administrator
  provisioning.

## External launch gates

Before classroom use, Product operators must privately record all of the following:

- the production owner and a second owner with MFA-protected Supabase/GitHub/Vercel access;
- two developer failure-alert recipients;
- the college's named privacy contact and escalation method;
- the approved report/Student-name retention and deletion process;
- the approved encrypted off-site backup destination and recovery-key custodians;
- a passing restore rehearsal no more than one quarter old;
- the custom Auth SMTP provider, verified sending domain, and fallback provider/contact;
- the class schedule and the developer responsible for post-break readiness checks.

Missing values block classroom launch. They are not replaced with names, addresses, or credentials in
this repository.
