---
status: accepted
---

# Make report multi-deletion page-scoped, atomic, and active-Attempt-safe

Reports limits multi-selection to the current 25-record page and deletes the selected owner records
in one database transaction so instructors can reason about both selection scope and failure. The
current unexpired active Attempt's Evaluation record is protected by the database as well as the
application because deleting it would silently stop that Attempt's durable evaluation capture;
historical records from the same Room remain deletable. This supersedes ADR 0012's first-release
deferral of bulk operations while preserving its permanent-deletion confirmation and audit rules.
