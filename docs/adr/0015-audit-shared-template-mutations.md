---
status: accepted
---

# Audit Administrator mutations to shared Templates

Every Template or Template-folder creation, edit, move, and deletion writes a lightweight append-only
audit entry. The entry identifies the acting Administrator, timestamp, action, affected entity ID,
and entity name. This makes shared-library changes attributable without building version history or
restoration for the first release.

## Consequences

- Deleting a Template or folder still requires confirmation and may cascade as already specified.
- Template deletion cannot alter active Rooms, independent Personal copies, or immutable Evaluation
  scenario snapshots.
- Audit rows are not themselves editable or deleted through ordinary application workflows.
- The first release has no application audit UI; Product operators inspect the log through Supabase.
- Pilot audit retention is one year before purge, subject to replacement by the college-approved
  production policy.
