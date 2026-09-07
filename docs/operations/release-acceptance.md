# Release Acceptance and Classroom Readiness

Record every result with timestamp, tester, environment, release commit, migration list, and a private
evidence location. Use synthetic Instructor and Student identities. A failed required item blocks launch.

## Platform and recovery

- [ ] Production and development use separate Supabase projects.
- [ ] Supabase, GitHub, Vercel, SMTP, backup-storage, and DNS owners use MFA; at least two owners can
      recover access.
- [ ] SSL enforcement and appropriate database network restrictions are reviewed.
- [ ] No service/secret key is browser-exposed; legacy keys remain deactivated.
- [ ] Migration history matches the reviewed repository and the production schema passes verification.
- [ ] Nightly encrypted off-site backup passed; 30 daily and 12 monthly retention is visible.
- [ ] Both developers received a sanitized failure-alert test.
- [ ] A complete non-production restore rehearsal passed within the current quarter, including Auth,
      Account ownership, Personal scenarios, Templates, Rooms, and Reports.
- [ ] Custom SMTP, SPF, DKIM, and DMARC are verified; Auth link tracking is disabled.
- [ ] The college approved report/Student-name retention and deletion, named its privacy contact, and
      accepted the incident runbook.

## Account and authorization

- [ ] Invitation delivery and acceptance work for a new Instructor.
- [ ] A duplicate case-insensitive username asks for another username without partial access.
- [ ] Username/password sign-in, sign-out, recovery, expired link, and resend paths pass.
- [ ] Public signup remains disabled and no registration route exists.
- [ ] Disabled Accounts lose existing-session access immediately and their live Room ends.
- [ ] Reactivation requires a fresh successful login.
- [ ] `Zoid`, `Branden`, and `Jeremy` authority is attached to reviewed immutable Auth UUIDs.
- [ ] An Instructor cannot mutate Templates; an Administrator can, and a privacy-minimized audit row
      records the mutation.
- [ ] Two synthetic Accounts cannot read or mutate one another's Personal scenarios, Rooms, or Reports.

## Room and report lifecycle

- [ ] An Account can own only one waiting/active Room and can reopen or deliberately replace it.
- [ ] A second Account device is read-only until confirmed takeover; takeover invalidates the old
      controller for Send, Attempt, report-name, and End Room mutations.
- [ ] Trainees join without Accounts using a case-insensitive six-character unambiguous Room code.
- [ ] Repeated failed Room-code guesses are throttled.
- [ ] Instructor Send reaches the trainee monitor; trainee actions reach the live Evaluation record.
- [ ] One durable report is created per Attempt with immutable scenario snapshot and all trainees.
- [ ] New Attempt and End Room complete reports; expiry leaves an Incomplete report.
- [ ] Search, filters, Student/Attempt-name editing, timeline copy, manual completion, and permanent
      deletion pass without cross-owner access.
- [ ] Account deletion removes Personal scenarios and Reports but preserves Templates.

## Application and browser support

- [ ] `/api/health` returns HTTP 200 with `database: ok`.
- [ ] `/instructor` is the canonical Console and `/admin` redirects to it.
- [ ] Console, Reports, and Account navigation works locally and in a live Room.
- [ ] Maintenance mode redirects pages, returns sanitized API 503 responses, prevents Room creation and
      joining, and leaves health reachable; normal mode restores service.
- [ ] Supported desktop Chrome/Edge and the supported iPad Safari viewport pass without clipping,
      horizontal overflow, framework overlays, or relevant console warnings/errors.
- [ ] The unauthenticated script passes:

      ```bash
      PRODUCTION_BASE_URL=https://YOUR-DOMAIN scripts/operations/production-smoke.sh
      ```

## Free-tier post-break check

If production remains on Supabase Free, after any break of five or more days a designated developer
runs this check at least one business day before the next class:

- [ ] Confirm the project is active and the latest nightly backup/alert checks passed.
- [ ] Run the unauthenticated smoke script.
- [ ] Complete one test invitation or approved existing test login.
- [ ] Create a Room, join with a synthetic trainee, exchange one state/action, end the Room, verify the
      report, delete the test record, and sign out.
- [ ] Escalate to a paid plan if the college cannot accept pause/reactivation or recovery dependency.
