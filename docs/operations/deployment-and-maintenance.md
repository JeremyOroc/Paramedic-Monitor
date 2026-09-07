# Deployment and Maintenance Runbook

## Normal state

`MAINTENANCE_MODE` is server-only and safe-off: unset values, `false`, and values other than the exact
case-insensitive word `true` leave the verified production service open. Normal production should set
it explicitly to `false`. `/api/health` remains reachable in either state.

Changing a Vercel environment variable applies to a new deployment, not an already-running deployment.
Plan both the maintenance-on and maintenance-off deployments before starting.

## Enter maintenance

1. Schedule outside teaching activity and identify the operator, reviewer, expected duration, migration
   list, recovery evidence, and communication owner.
2. Confirm no active Room. If one exists, coordinate its end and preserve its Evaluation record.
3. Confirm the latest encrypted backup and alert path passed. For a schema/data migration, take and
   verify a fresh encrypted backup.
4. In Vercel Production environment variables, set `MAINTENANCE_MODE=true` and redeploy the current
   production commit.
5. Confirm `/` and `/instructor` redirect to `/maintenance`, application APIs return sanitized HTTP 503
   with `Retry-After`, and `/api/health` remains uncached and reachable.
6. Confirm Room creation and trainee joining are unavailable before changing production data.

## Apply and verify

1. Compare local and linked migration history. Do not run a blind push when histories differ.
2. Review the exact pending migration files and apply only the approved release.
3. Run migration verification queries, schema lint, database advisors, and relevant policy tests against
   a synthetic environment before production acceptance.
4. Provision or change Administrators only by immutable Auth UUID under the invitation runbook.
5. Record migration IDs and content-free counts; never paste keys, emails, Student names, scenarios, or
   report contents into deployment evidence.

## Reopen

1. Complete the applicable [release acceptance](./release-acceptance.md) sections while maintenance is
   active wherever possible.
2. Set `MAINTENANCE_MODE=false` in Vercel Production and redeploy the verified release.
3. Confirm health, landing page, Instructor login, canonical Console, Room create/join, report creation,
   and sign-out.
4. Monitor Supabase, Vercel, custom SMTP, backup, and operational alerts for the agreed observation
   window before declaring the maintenance complete.

## Recovery boundary

Before any new Account, Personal scenario, Room, or report data exists after a rollout, operators may
restore the pre-change backup and previous application through the approved recovery procedure. Once
new Account-owned data exists, do not restore an older snapshot over production. Keep maintenance on
and use a reviewed forward fix or explicit data reconciliation that preserves the new records.

Never use `git reset --hard`, delete migration history, edit an already-applied migration, or restore a
backup merely to make migration tooling appear clean.
