# Wagami A — published A4–A6 handoff

**Audit date:** 2026-09-20

**Branch:** `wagami-a`

**Published implementation commit:** `069f6119911294b0e4aa14c2434d169068e8fdc9`

**Purpose:** verify the published state and prepare a later plan. The authorized handoff commit
and push are complete; this brief does not authorize another implementation phase, database
operation, release, deployment, or unrelated Git change.

## Transfer result

The programmer selected the Git branch transfer on 2026-09-20. Commit `069f611` contains the
complete A4 clinical core, A5 destinations/localization/preferences, A6 live integration, their
tests, and the 2026-09-19 planning/handoff audit. It was pushed successfully from `d03cd3f` to
`origin/wagami-a`. The 38 modified tracked files and 17 formerly untracked files from the audit are
all present in that commit.

A recipient can now run `git fetch origin` and check out `origin/wagami-a`. Verify that
`git merge-base --is-ancestor 069f611 HEAD` succeeds, the required files below exist, and
`git status --short` is clean before planning more work. A checkout ending at `d03cd3f` is
incomplete. Supply environment variables separately; `.env.local` was ignored and was not committed.

## What changed since the previous handoff

The handoff committed at `d03cd3f` stopped before A4. Commit `069f611` now adds the approved A4
clinical core, A5 workspace/localization/preferences, A6 live integration, their tests, completion
records, exact validation evidence, and the transfer inventory. The subsequent documentation
commit records that publication. No remaining database, device, distinctness, IP, or release gate
was started.

### Files modified by implementation commit (38)

```text
CHANGELOG.md
PLAN.md
STATUS.md
docs/handoff/wagami-a-a4-onward.md
src/app/__tests__/adminScenarioLibrary.test.tsx
src/app/globals.css
src/components/instructor/DefibrillatorPanel.tsx
src/components/instructor/SendButton.tsx
src/components/instructor/SpectatorMonitor.tsx
src/components/instructor/__tests__/DefibrillatorPanel.test.tsx
src/components/instructor/__tests__/SendButton.test.tsx
src/components/instructor/__tests__/SpectatorMonitor.test.tsx
src/components/monitor/CallerInfoModal.tsx
src/components/monitor/DispatchRouteMap.tsx
src/components/monitor/MonitorPage.tsx
src/components/monitor/WagamiADefibPanel.tsx
src/components/monitor/WagamiADevice.tsx
src/components/monitor/WagamiAPreview.tsx
src/components/monitor/WagamiAScreen.tsx
src/components/monitor/WagamiATaskDock.tsx
src/components/monitor/WagamiAVitalCard.tsx
src/components/monitor/WagamiAWaveformWorkspace.tsx
src/components/monitor/__tests__/DispatchRouteMap.test.tsx
src/components/monitor/__tests__/WagamiADefibPanel.test.tsx
src/components/monitor/__tests__/WagamiADevice.test.tsx
src/components/monitor/__tests__/WagamiAPreview.test.tsx
src/components/monitor/__tests__/WagamiAScreen.test.tsx
src/components/monitor/__tests__/WagamiAVitalCard.test.tsx
src/components/monitor/__tests__/WagamiAWaveformWorkspace.test.tsx
src/hooks/__tests__/useDefibSequence.test.ts
src/hooks/useDefibSequence.ts
src/lib/audio.ts
src/lib/defib/__tests__/defibMachine.test.ts
src/lib/defib/defibMachine.ts
src/server/sessions/__tests__/evaluationRecord.test.ts
src/server/sessions/__tests__/monitorProjectionValidation.test.ts
src/server/sessions/service.ts
src/types/monitorProjection.ts
```

### Files added by implementation commit (17)

```text
src/components/monitor/WagamiAWorkspace.tsx
src/components/monitor/__tests__/WagamiALiveMonitor.test.tsx
src/components/monitor/__tests__/WagamiAWorkspace.test.tsx
src/hooks/__tests__/useWagamiAClinicalCore.test.ts
src/hooks/__tests__/useWagamiAPreferences.test.ts
src/hooks/__tests__/useWagamiAWorkspace.test.ts
src/hooks/useWagamiAClinicalCore.ts
src/hooks/useWagamiAPreferences.ts
src/hooks/useWagamiAWorkspace.ts
src/lib/__tests__/wagamiALocalization.test.ts
src/lib/__tests__/wagamiAPatientMode.test.ts
src/lib/__tests__/wagamiAVoice.test.ts
src/lib/wagamiALocalization.ts
src/lib/wagamiAPatientMode.ts
src/lib/wagamiAVoice.ts
src/server/reports/__tests__/wagamiAReportMigration.test.ts
src/types/wagamiA.ts
```

## Read order and authority

1. Read `AGENTS.md`. Its plan approval, tests, `PLAN.md`, `STATUS.md`, `CHANGELOG.md`, and
   local Next.js documentation rules apply before code changes.
2. Read the Wagami A requirement updates and A0–A6 sections in `PLAN.md`, then the current
   phase block in `STATUS.md` and the 2026-09-15 through 2026-09-19 `CHANGELOG.md` entries.
3. Read ADRs 0023–0030 and `CONTEXT.md` definitions for Wagami A, Device Patient mode,
   Wagami A full-display view, Attempt, projection, and Evaluation record.
4. Inspect `git show --stat 069f611` and the implementation itself before trusting a phase label.
5. Before any later Next.js code work, read the relevant Next 16.3 guide under
   `node_modules/next/dist/docs/` as required by `AGENTS.md`.

`PLAN.md` is the requirement source, `STATUS.md` is the current state ledger, ADRs explain durable
choices, and this document describes the transfer boundary. Where old prose describes an earlier
gate, the newer approved amendment and implemented behavior below take precedence.

## Status based on implementation and verification

### Complete and explicitly accepted

- A0 inventory and original-asset policy; A1 Precision Graphite concept; A2 contracts and
  Room-free preview; A3 original shell/display; and A3.1 shell/navigation are committed at or
  before `d03cd3f`. A3.1's rendered code-native direction was explicitly accepted.
- The repository record does not show a separate post-implementation acceptance of the combined
  A4–A6 working tree. Approval of each implementation plan authorized the work but is not a
  release or final-product acceptance.

### Implemented and locally verified under approved plans

- A4's approved clinical behavior is implemented locally: shell-only Analyze, Charge, guarded
  Shock, BP, mute, and Patient mode; touchscreen energy; alarms; CPR; power cancellation; and the
  A-only rule that shock advice still requires a timed Charge before Shock becomes available.
- A5 is implemented locally: persistent-shell 12-lead, EtCO₂, Medications/Event Log, Call Info,
  Vital Log, Configure/PNI, French-default/English fixed copy and prompts, semantic events, and
  scoped language/shell-LED preferences.

- A6 live code is implemented locally. Instructor model selection, Save/Send, Saved scenario
  round-trip, live Attempts, shared clinical state, semantic Scenario-device events, five-minute
  Vital Log sampling, Room/participant/Attempt preference scope, version-one projection,
  Spectator rendering, and Evaluation model serialization/readback paths include Wagami A.
- X and Z remain selectable. X remains the default. No public-availability or default decision
  was made.
- Desktop rendered QA is complete for the tested 1280×720 and 1024×768 viewports. The rapid
  contained Call Info loop found a Leaflet teardown race; the local fix stops map activity before
  removal and disables contained-map transitions. The clean rerun had no console errors or page
  overflow.

### Partial or awaiting evidence

- `supabase/migrations/20260915160205_widen_wagami_a_report_model.sql` and the existing pgTAP SQL
  recognize `wagamiA`; source-level migration contract tests pass. The migration has not been run
  against a disposable or controlled PostgreSQL/Supabase environment, and report readback has not
  been demonstrated against such a database.
- Desktop emulation does not satisfy the required physical landscape-iPad touch/fit gate.
- The A-versus-X/Z distinctness review must be renewed against the final A3.1/A5/A6 surface.
- Qualified Canadian IP advice has not been obtained or recorded. Internal design review is not
  legal clearance.

### Not started or not authorized

- No production migration, deployment, or release action has started.
- No decision has been made to make A the default or to remove/restrict X or Z.
- No post-A6 implementation phase is approved. The next agent must propose a concrete plan and
  wait for the programmer's approval before changing code or acting on an external gate.
- A4, A5, A6, tests, and the audited handoff state are published in `069f611` on
  `origin/wagami-a`; publication does not imply release acceptance.

## Superseded decisions and still-active records

- ADR 0027's preview-only restriction was a construction-stage gate. The approved A6 work now
  enables A in live Attempts while retaining `/?dev=3` as the visibly labeled Room-free preview.
- ADR 0024's original launcher list ended with Print/Capture. A3.1 replaced that permanent tile
  with Vital Log; 12-lead capture/print/transmit remains inside the 12-lead workflow.
- The A1/v2 clickable PNI card and inner-screen mute/Analyze controls are superseded. BP reading,
  all-cues mute, and Analyze are shell-only; the PNI card and defib panel are read-only displays.
- The original A3 control positions are superseded by A3.1: left mute/Patient mode/BP, isolated
  upper-right Power, right Analyze/Charge/guarded Shock, and lower Left/Enter/Right navigation.
- ADR 0023 remains active: A is additive and does not retire X/Z. ADR 0025 remains active except
  for the explicitly approved A-only charged-after-advice refinement. ADRs 0026 and 0028–0030
  remain active.

## Key implementation map

| Area | Files and behavior |
|---|---|
| Live integration | `src/components/monitor/MonitorPage.tsx` selects A from confirmed Attempt state, shares controller/defib/NIBP/alarm/CPR/dispatch state, scopes preferences, emits events, samples Vital Log, and publishes `MonitorProjection.wagamiA`. |
| A clinical adapter | `src/hooks/useWagamiAClinicalCore.ts`, `src/hooks/useDefibSequence.ts`, `src/lib/defib/defibMachine.ts`, and `src/lib/audio.ts` implement A's charged-only Shock policy and locale-aware prompts without changing X/Z defaults. |
| Device and display | `WagamiADevice.tsx`, `WagamiAScreen.tsx`, `WagamiADefibPanel.tsx`, `WagamiATaskDock.tsx`, `WagamiAVitalCard.tsx`, and `WagamiAWaveformWorkspace.tsx` implement the persistent Precision Graphite shell/display and guarded navigation. |
| Destinations | `src/hooks/useWagamiAWorkspace.ts` and `src/components/monitor/WagamiAWorkspace.tsx` own the six routes, workflow state, semantic events, Vital Log, PNI configuration, and power cleanup. |
| Preferences and language | `useWagamiAPreferences.ts`, `wagamiALocalization.ts`, `wagamiAVoice.ts`, and `src/types/wagamiA.ts` provide Attempt-scoped French/English and shell-LED behavior. |
| Instructor and Spectator | `DefibrillatorPanel.tsx`, `SendButton.tsx`, `SpectatorMonitor.tsx`, and `adminScenarioLibrary.test.tsx` cover selection, normal Save/Send, saved scenarios, and live read-only projection. |
| Server/report contracts | `src/server/sessions/service.ts`, `src/types/monitorProjection.ts`, report/session tests, the staged migration, and pgTAP assertions accept A while retaining legacy projection compatibility. |
| Contained Call Info | `CallerInfoModal.tsx` and `DispatchRouteMap.tsx` provide localized contained assignment/map UI and the teardown-race fix. |

## Exact verification record

Fresh handoff checks on 2026-09-19:

- Selected A6 integration command: **15 test files, 147 tests passed**.

```powershell
npx vitest run src/app/__tests__/adminScenarioLibrary.test.tsx src/components/instructor/__tests__/DefibrillatorPanel.test.tsx src/components/instructor/__tests__/SendButton.test.tsx src/components/instructor/__tests__/SpectatorMonitor.test.tsx src/components/monitor/__tests__/DispatchRouteMap.test.tsx src/components/monitor/__tests__/WagamiALiveMonitor.test.tsx src/components/monitor/__tests__/WagamiAWorkspace.test.tsx src/hooks/__tests__/useDefibSequence.test.ts src/hooks/__tests__/useWagamiAClinicalCore.test.ts src/hooks/__tests__/useWagamiAPreferences.test.ts src/hooks/__tests__/useWagamiAWorkspace.test.ts src/lib/defib/__tests__/defibMachine.test.ts src/server/sessions/__tests__/evaluationRecord.test.ts src/server/sessions/__tests__/monitorProjectionValidation.test.ts src/server/reports/__tests__/wagamiAReportMigration.test.ts
```

- Full `npx vitest run`: **190 files total; 185 passed, 4 failed, 1 skipped; 1,509 tests
  passed, 11 failed, 1 skipped**.
- `npx tsc --noEmit`: passed when run after the build completed. A deliberately concurrent first
  invocation collided with Next regenerating `.next/types` and produced transient TS6053 missing
  generated-file errors; the sequential result is the valid type check.
- `npx eslint src`: passed with **0 errors and 12 warnings**. The warnings are the established
  `<img>`, unused-symbol, and `MonitorPage` hook-dependency warnings recorded in `STATUS.md`.
- `npm run build -- --webpack`: passed under Next.js 16.3.0.
- `git diff --check`: passed after the 2026-09-19 documentation update.

The 11 full-suite failures reproduce the existing Windows/baseline set:

- 7 `src/operations/__tests__/operationsScripts.test.ts` failures because `bash` is absent.
- 2 `src/server/sessions/__tests__/roomOwnership.test.ts` behavioral baseline failures.
- 1 `src/components/monitor/__tests__/PatientInfoPanel.test.tsx` class-name expectation failure.
- 1 `src/server/accounts/__tests__/inviteOnlyConfig.test.ts` LF-only regex failure against this
  CRLF checkout.

No Wagami A test failed. The last rendered browser pass was 2026-09-17, at 1280×720 and 1024×768;
it exercised all six destinations, French/English, LED Off, persistent shell navigation, rapid
Call Info transitions, exact viewport fit, and clean console behavior. It was not a physical-iPad
test. No database runtime test was performed.

## Environment and tools

This checkout was audited with Node `v24.14.0`, npm `11.9.0`, Git, installed dependencies, and the
bundled Next 16.3 documentation. Recreate dependencies from `package-lock.json` with `npm ci`.
Live application work needs locally supplied `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY`; keep them out of Git.

This machine has no `bash`, Supabase CLI, Docker, `psql`, or `pg_prove`. A later authorized
database-validation plan therefore needs an explicitly disposable/controlled Supabase or
PostgreSQL target plus compatible migration and pgTAP tooling. Physical-device validation needs
the supported landscape iPad and a way to open the locally served application. Browser automation
can supplement that device pass but cannot replace it. Plugins are optional; availability does
not grant database, deployment, or release authorization.

## Open decisions for the programmer

1. Whether the locally verified A4–A6 result is accepted as the development baseline after the
   recipient verifies the complete checkout.
2. Whether to authorize a disposable/controlled database plan for migration, pgTAP, and report
   readback. Production is outside the current authorization.
3. When and where to run the physical landscape-iPad QA and final side-by-side distinctness review.
4. How to obtain and record qualified IP advice.
5. After those gates, whether A should be released or become the default, and whether X/Z public
   availability should change.

## Copy-ready prompt for the next agent

```text
Prepare to continue Wagami A in this Paramedic Monitor checkout, but do not implement anything yet.
This is a verification-and-plan task only. First read AGENTS.md and
docs/handoff/wagami-a-a4-onward.md, then inspect PLAN.md, STATUS.md, CHANGELOG.md, CONTEXT.md,
ADRs 0023–0030, the actual code/tests, and `git show 069f611`. Read the relevant installed
Next.js 16.3 documentation before proposing any later Next.js change.

Verify the checkout before relying on the handoff. Fetch origin, check out branch wagami-a from
origin/wagami-a, and verify that commit 069f6119911294b0e4aa14c2434d169068e8fdc9 is an ancestor of
HEAD and that git status --short is clean. The handoff lists the 38 modified and 17 added paths
contained by that implementation commit.
Confirm at minimum that src/hooks/useWagamiAClinicalCore.ts,
src/hooks/useWagamiAWorkspace.ts, src/components/monitor/WagamiAWorkspace.tsx,
src/components/monitor/__tests__/WagamiALiveMonitor.test.tsx,
src/server/reports/__tests__/wagamiAReportMigration.test.ts, and ADRs 0028–0030 exist. If the hash,
commit, inventory, or required files differ, stop and tell me exactly what is missing. A checkout
ending at d03cd3f contains only A0–A3.1 and is insufficient.

Treat A4, A5, and the A6 live code as locally implemented and tested under approved plans, while
independently checking those claims against the code; do not infer post-implementation or release
acceptance. Keep the remaining A6 items separate: controlled database
migration/pgTAP/report readback, physical landscape-iPad QA, final A-versus-X/Z distinctness review,
qualified IP advice, and my release/default/X/Z-availability decisions. Note that ADR 0027's
preview-only restriction and ADR 0024's Print/Capture launcher are superseded as described in the
handoff. X/Z remain available and X remains the default.

After the audit, present a concrete plan for my approval. Identify the exact scope, tests,
environment, database/device access, risks, documentation updates, and decision points. Wait for
my explicit approval before changing code, running a migration, using a remote database, performing
release work, committing, or pushing. Do not deploy, alter production data, change defaults or
public availability, delete X/Z, or claim legal clearance.
```
