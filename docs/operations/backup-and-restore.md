# Encrypted Backup and Restore Runbook

## Scope and ownership

The nightly job exports PostgreSQL roles, application schema, and data using the current Supabase CLI
workflow. The data export is explicitly checked for `auth.users` and `public.account_profiles`, so
Auth identities and immutable ownership mappings cannot silently fall out of the backup. It also
records content-free row counts for Auth users, Account profiles, saved scenarios, and Evaluation
reports in the encrypted manifest.

This is a logical database backup. Supabase Auth settings, API keys, Realtime configuration, Vercel
configuration, and provider credentials must be recreated from private configuration records. Storage
objects are not included. The application currently does not depend on Supabase Storage; if that
changes, Storage object export and restoration become a launch blocker before relying on this job.

Two developers own backup-failure response. Recovery-key custody must be split so one lost developer
device cannot destroy the only usable copy. Never copy production data into development, automated
tests, screenshots, tickets, or chat.

## One-time setup

1. Select a private, institution-approved off-site destination supported by `rclone`.
2. On an offline or protected operator device, install `age` and run:

   ```bash
   age-keygen -o paramedic-monitor-recovery-key.txt
   ```

3. Store the identity file in the approved credential vault. Record its public `age1...` recipient
   separately for the backup job. Never add the identity file to GitHub or the application host.
4. Configure an `rclone` remote with write, list, and single-object-delete access only to the dedicated
   backup prefix. Do not grant access to unrelated institutional storage.
5. Obtain the production Supabase Session pooler connection string and percent-encode its database
   password. Test it from a protected operator machine without printing it.
6. In GitHub repository Actions secrets, add:

   | Secret | Value |
   |---|---|
   | `PRODUCTION_SUPABASE_DB_URL` | Percent-encoded production pooler URL |
   | `PRODUCTION_SUPABASE_PROJECT_REF` | Exact 20-character production project reference |
   | `BACKUP_AGE_RECIPIENT` | Public `age1...` encryption recipient |
   | `BACKUP_RCLONE_REMOTE` | Dedicated destination such as `college-vault:paramedic-monitor` |
   | `BACKUP_RCLONE_CONFIG_B64` | Base64-encoded minimal rclone configuration |
   | `OPS_ALERT_SMTP_URL` | Separate operational SMTP endpoint using `smtp://` or `smtps://` |
   | `OPS_ALERT_SMTP_USERNAME` | Operational alert credential |
   | `OPS_ALERT_SMTP_PASSWORD` | Operational alert credential |
   | `OPS_ALERT_FROM` | Approved operational sender |
   | `OPS_ALERT_TO` | At least two comma-separated developer addresses |

7. Open **Actions → Encrypted Supabase Backup → Run workflow**.
8. Confirm the run reports an encrypted `.tar.gz.age` upload and content-free Auth/Profile counts.
9. In the off-site destination, confirm one object exists under `daily/` and one for the current month
   under `monthly/`. Download it and confirm it is not readable as a tar archive before decryption.
10. Confirm both developers receive a test operational alert by running
    `scripts/operations/notify-operations.sh` with `OPS_EVENT_CODE=backup_alert_test` from a protected
    environment. Do not deliberately break the production backup job to test alerts.

The workflow runs nightly at 07:17 UTC. It retains exactly the newest 30 validated daily filenames and
12 validated monthly filenames. It creates the first successful monthly copy for a month, so a failure
on the first day does not omit that month. It refuses to delete unexpected names or broad paths.

## Manual backup verification

Use a protected shell with the same secret variables as the workflow:

```bash
scripts/operations/backup-supabase.sh
```

For configuration-only validation that performs no connection, dump, encryption, upload, deletion, or
audit purge:

```bash
BACKUP_DRY_RUN=true scripts/operations/backup-supabase.sh
```

Successful encrypted upload happens before the one-year audit-retention function runs. A failed export,
verification, encryption, or upload therefore cannot purge audit history.

## Quarterly restore rehearsal

1. Create a new, empty Supabase project dedicated to the rehearsal. Never use production or the shared
   development project.
2. Recreate required extensions and platform configuration described by Supabase before restoration.
3. Download one encrypted monthly backup to a protected operator machine.
4. Set the following only in that protected shell:

   - `RESTORE_SOURCE_FILE` — downloaded `.age` file;
   - `RESTORE_AGE_IDENTITY_FILE` — protected `age` identity file;
   - `RESTORE_TARGET_DB_URL` — percent-encoded rehearsal database URL;
   - `RESTORE_TARGET_PROJECT_REF` — rehearsal project reference;
   - `PRODUCTION_PROJECT_REF` — production project reference used by the safety check;
   - `RESTORE_CONFIRMATION=RESTORE_NON_PRODUCTION`;
   - `RESTORE_EVIDENCE_FILE` — a new path in the approved private evidence directory.

5. Validate the safety boundary without connecting:

   ```bash
   RESTORE_DRY_RUN=true scripts/operations/restore-rehearsal.sh
   ```

6. Run the rehearsal:

   ```bash
   scripts/operations/restore-rehearsal.sh
   ```

7. The script decrypts in a mode-`0700` temporary directory, validates every checksum, restores with
   `ON_ERROR_STOP`, and compares Auth/Profile/scenario/report counts with the encrypted source manifest.
8. Sign in only with a synthetic rehearsal Account. Verify Personal ownership, Templates, one Room,
   and one report. Do not send email to or use credentials belonging to real people.
9. Store the mode-`0600` evidence file in the private quarterly recovery record with reviewer, date,
   CLI/Postgres versions, deviations, and remediation.
10. Destroy the rehearsal project and protected local backup copy under the approved disposal process.

The restore script refuses identical production/target project references, a target URL containing the
production reference, a target URL not containing the declared rehearsal reference, a missing explicit
confirmation phrase, invalid checksums, changed counts, or an existing evidence path.

## Failure response

Treat missing nightly output, export verification failure, encryption/upload failure, unexpected remote
filenames, retention failure, and count mismatch as incidents. Keep the previous backups, do not weaken
encryption or widen remote permissions, notify both developers, record only sanitized failure codes,
and follow [Incident and Account operations](./incident-and-account-operations.md).
