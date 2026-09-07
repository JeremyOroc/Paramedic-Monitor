# Incident, Privacy, and Account Operations

## Private responsibility record

Before classroom use, the private operations record must identify two Product-operator developers,
the college's privacy contact, a technical escalation path, approved response hours, and the person
authorized to decide whether affected people or regulators must be notified. Product operators contain
and investigate technical incidents; the college privacy contact owns notification decisions.

Operational email and repository logs contain only a sanitized event code, timestamp, run URL, affected
system, and status. Never include Auth tokens, database URLs, keys, email addresses, usernames, Student
names, scenario contents, report timelines, or SQL row payloads.

## Incident sequence

1. Preserve evidence without copying personal data into chat or tickets.
2. If continued use could change or expose data, enter maintenance using the deployment runbook.
3. Revoke or rotate the specifically affected credential; do not rotate unrelated keys reflexively.
4. Disable affected Accounts when necessary and end their active Rooms.
5. Determine scope by immutable Auth user ID, report ID, Room ID, timestamps, and privacy-minimized audit
   entries—not by mutable usernames or user metadata.
6. Notify both developers through the separate operational-alert path.
7. Give the college privacy contact a factual, minimal incident summary through the approved private
   channel. The college decides external notification.
8. Recover through a reviewed forward fix after new Account data exists. Validate health, authorization,
   Room ownership, reports, backups, and email before reopening.
9. Record cause, evidence locations, decisions, remediation, and follow-up without embedding personal
   content in the repository.

## Disable and reactivate an Account

Disablement is the reversible first action. In a reviewed Supabase SQL Editor transaction, update the
single profile selected by immutable Auth UUID from `enabled` to `disabled`. Verify exactly one row
changed. The database trigger ends its live Room, while protected application reads reject the existing
session immediately. Revoke that user's Auth sessions through the supported Supabase Auth
administration control as defense in depth.

Reactivation requires identity verification and approval. Update exactly the intended immutable UUID
back to `enabled`, then require a fresh login and verify ownership of Personal scenarios and Reports.
Never infer authority from a reserved username or user-editable metadata.

## Permanently delete an Account

1. Obtain documented approval and identify the Account only by Auth UUID.
2. Disable it first, end active work, and revoke its sessions.
3. Confirm the approved retention/data-request process permits deletion.
4. Record content-free counts of Personal scenarios and Reports that will cascade.
5. Delete the Auth user through the supported Supabase Auth administration interface.
6. Verify the matching Account profile, Personal scenarios, and Reports are removed; shared Templates
   and unrelated Accounts remain.
7. Record completion without retaining deleted content in the incident or change record.

## Student data request

Students do not have Accounts. The college identifies the responsible Instructor and exact Evaluation
record through an approved private channel. Product operators extract, correct, or delete only that
record. Corrections must create the existing privacy-minimized `product_correction` audit action and
must not place Student names or report contents in operational logs. Views are not logged.

## Retention

The pilot keeps Reports until owner deletion pending the college's written policy. Template and report
mutation audits retain one year. The nightly backup calls the guarded retention function only after a
successful encrypted upload; the database rejects a cutoff newer than one year. The college-approved
policy supersedes the pilot only through a reviewed PLAN, migration, tests, and runbook change.
