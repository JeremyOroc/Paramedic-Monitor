# Wagami A — collaborator handoff for A4 onward

As of 2026-09-15, the programmer has accepted A3 and its A3.1 shell/navigation amendment as
done. The current agent must not start A4. A4, A5, and A6 are reserved for a collaborator on
another device. This is a development handoff, not an IP or release approval.

## Transfer check first

The local repository is on branch `wagami-a` at committed HEAD `83931fa` (`A3`), **but the
A3.1 code, tests, v3 concept, ADRs, and these handoff notes are still uncommitted in the
working tree**. A fresh clone of the remote branch at that HEAD is not an A3.1 checkout.
Before the collaborator starts, transfer this exact working tree or arrange an approved
commit/push and have the collaborator fetch it. Confirm the recipient has
`src/hooks/useWagamiANavigation.ts`, `src/lib/wagamiANavigation.ts`, the `WagamiADevice.tsx`
right Analyze/Charge/Shock stack, ADRs 0028–0030, and this document. No commit, push,
production migration, or other cross-device transfer was done by this handoff.

## Read order and precedence

1. Read repository `AGENTS.md` and the relevant Next 16.3 guide under `node_modules/next/dist/docs/`
   before writing code. Follow its plan-confirmation, tests, status, and changelog rules.
2. Read `PLAN.md`'s *Current Requirement Updates* for the 2026-09-15 A amendment, then its
   A3.1/A4/A5/A6 phase sections. Read `STATUS.md` for current boundaries.
3. Read [ADRs 0028](../adr/0028-lock-wagami-a-patient-mode-during-defibrillation.md),
   [0029](../adr/0029-keep-wagami-a-shell-across-secondary-views.md), and
   [0030](../adr/0030-navigate-only-enabled-wagami-a-inner-actions.md), plus `CONTEXT.md`'s
   *Device Patient mode* term.
4. Compare the [approved v3 concept](../design/wagami-a-concepts/precision-graphite-shell-controls-v3.png)
   to the [actual A3.1 renders and fidelity ledger](../design/wagami-a-concepts/a3-1-rendered-qa.md).
   The flatter code-native render was accepted as done. No concept bitmap is a shipped UI
   asset or clinical/iPad acceptance test.

Older A1/v2 design text and the historical A3 baseline describe a left Charge, touch mute,
clickable PNI card, touch Analyze, and Print/Capture tile. **A3.1 supersedes those decisions.**
The current six immediate right-dock tiles are 12-lead, EtCO₂, Medications, Call Info,
Vital Log (`Journal des signes vitaux`), and Configure. X/Z are intentionally preserved.

## Current code boundary

- `src/components/monitor/WagamiAPreview.tsx` provides `/?dev=3` without joining a Room.
  `src/components/monitor/MonitorPage.tsx` selects it for `dev=3`. Power works; A4 clinical
  and A5 task actions are visibly disabled. Preview data can be simulated and is labeled
  `PREVIEW`; do not invent Vital Log history.
- `WagamiADevice.tsx` owns the outer-shell buttons and optional callback/eligibility props:
  Analyze, Charge, guarded Shock, mute, Patient-mode cycle and lock, BP reading, energy,
  and task launch. It can retain shell controls around inner secondary content via
  `screenContent`, `navigationView`, and `secondaryActions`. These are A3.1 affordances,
  **not** clinical implementation.
- `WagamiAScreen.tsx` displays fixed FC/SpO₂/PNI/EtCO₂ cards, waveform workspace, six task
  tiles, and passive defib status. PNI and defib status are read-only. No on-screen Analyze,
  mute, or BP-reading action exists.
- `src/lib/wagamiANavigation.ts` fixes row-major task order before energy −/+ and excludes
  disabled items. `src/hooks/useWagamiANavigation.ts` remembers live selection per inner
  view, wraps Left/Right, activates once on Enter, and synchronizes touch activation.
  Do not include shell buttons or read-only cards in its action ring.
- Wagami A uses `WAGAMI_A_COLORS` in `src/lib/constants.ts` and matching
  `--color-wagami-a-*` tokens in `src/app/globals.css`. No A component should borrow X/Z
  colors or copy their shell/key anatomy.

## Remaining phase gates

**A4 — clinical core, not started.** Connect the A shell callbacks to established state
rules and timing in `src/lib/defib/defibMachine.ts`, `src/hooks/useDefibSequence.ts`,
`src/hooks/useNibpReading.ts`, `src/hooks/useAlarm.ts`, and defib audio mechanisms. Wire
touch energy −/+ without duplicating shell Analyze/Charge/Shock/BP/mute events. Patient
mode cycles Adult → Pediatric → Neonate → Adult on permitted presses, but becomes visibly
unavailable from Analyze/Charge start through shock delivery/cancellation, including
charged/shock-ready states; never silently change pending energy. Preserve CPR, alarms,
active-process navigation, and the charged-state-only one-press Shock guard. Keep X/Z
clinical behavior unchanged. Add tests with each component/hook/utility change.

**A5 — destinations/localization, not started.** Build all six inner-display destinations
while the outer A shell stays present, including inner-screen full-display 12-lead and Call
Info. Call Info opens the existing trainee Assignment dashboard/caller-information flow;
the medication Event Log stays inside Medications. Vital Log uses X-parity immutable
five-elapsed-monitor-minute FC/accepted cuff BP/SpO₂/EtCO₂ snapshots, eight rows per page,
clearing on power-off/refresh; 12-lead capture/printing remains in 12-lead. Configure shows
Device Patient mode read-only and has PNI settings, shell LED on/off, and Device language
French (default) ↔ English. Localize fixed A UI/prompts/report labels, not Instructor-authored
scenario text. Persist preferences through one Attempt, reset at New Attempt/new Room,
mirror in Spectator. Test all destinations, focus rings, locale paths, snapshots, and shell
continuity.

**A6 — live integration/release decision, not started.** Only after visible controls and
destinations function, enable live Instructor A model selection and Attempts. Verify saved
scenarios, Spectator and immutable Evaluation reports, and apply/check the A report migration
in a controlled environment; it has not been applied to production. Run real landscape-iPad
touch/fit testing and renewed A-versus-X/Z distinctness review. Obtain qualified IP advice
before public release. The programmer alone decides whether A becomes default and whether
or when X/Z cease public availability; keep them available meanwhile. No automatic release,
deletion, migration, or legal-clearance assertion.

## Verification baseline and working agreement

The A3.1 focused run passed 22 tests; TypeScript, affected-file ESLint, and
`npx next build --webpack` passed. Browser QA at 1024×768 and 1536×1024 found no overflow
or page errors; Power cycled, and unsupported width showed guidance. Full Vitest after the
A preview test update reported 1,476 passing, one skipped, and **three unrelated pre-existing
failures**: two in `src/server/sessions/__tests__/roomOwnership.test.ts` and one in
`src/components/monitor/__tests__/PatientInfoPanel.test.tsx`. Do not conceal new A failures
inside that baseline. The real-iPad test remains open.

Before changing any requirement, update `PLAN.md`; write tests alongside every feature;
record completion in `STATUS.md` and an entry at the top of `CHANGELOG.md`. Present an A4
implementation plan and resolve ambiguity with the programmer before code, per `AGENTS.md`.
Gate A5 and A6 separately; do not infer permission for live-system or release changes.

## Codex setup on the collaborator's device

The required starting point is the **complete A3.1 working tree**, this repository's
`AGENTS.md`, a local Codex task with file/shell access, and the project dependencies from
`package-lock.json` (`npm ci`). Plugins do not substitute for the missing uncommitted files,
the A4 plan approval, or tests. Select GPT-5.6 Sol with High reasoning if available.

- For A4/A5 React and rendered UI work, install the **Build Web Apps** plugin if it is
  available in that Codex installation. Use its `react-best-practices` and
  `frontend-testing-debugging` skills; use `frontend-app-builder` only for a new A5 visual
  design task. A browser/computer-use plugin is optional: ordinary Playwright is an
  acceptable rendered-QA fallback. None is a hard A4 prerequisite.
- Before A5/A6 Supabase, Realtime, schema, or migration work, install/connect the
  **Supabase** plugin if available and use its `supabase` skill; add
  `supabase-postgres-best-practices` when working on queries or schema. Connection and
  project/database permissions are separate; never paste credentials into a prompt or
  infer authorization for a production migration.
- If the collaborator wants the same *design discussion and ADR* workflow, transfer or
  install the personal `grill-with-docs`, `grilling`, and `domain-modeling` skills
  separately. They are not checked into this repository and are optional for A4 coding.
  ImageGen is only relevant if new bitmap concepts are requested. A GitHub plugin is not
  required for local Git operations.

Check the collaborator's actual Plugins/Skills catalog rather than assuming the current
machine's installations carry over. Install only missing, relevant items using Codex's
Plugins UI or CLI, then start a fresh Codex task so installed plugin skills are visible.
If a recommended plugin is unavailable, report that and use repository conventions,
built-in coding tools, and Playwright where appropriate; do not treat optional tooling
as a reason to start A4 without approval.

## Suggested Codex prompt (select GPT-5.6 Sol, High reasoning in the app)

```text
Continue Wagami A in this Paramedic Monitor checkout. A3/A3.1 are accepted as done;
begin with A4, but do not implement it until you present a concrete A4 plan and I approve
it, per AGENTS.md. First verify this checkout contains src/hooks/useWagamiANavigation.ts,
the A3.1 right-shell Analyze/Charge/guarded Shock stack, ADRs 0028–0030, and
docs/handoff/wagami-a-a4-onward.md. If not, stop: the older A3 commit is insufficient.
Read AGENTS.md, that handoff brief, current PLAN.md/STATUS.md/CONTEXT.md, A components
and tests, and the relevant installed Next.js 16.3 docs.

On your device, check Codex Plugins/Skills and run npm ci. If available, install Build
Web Apps for react-best-practices and frontend-testing-debugging (frontend-app-builder
only if a new A5 visual design is requested). Use browser/computer-use tooling for
rendered QA if available, otherwise Playwright. Before Supabase/Realtime/database work,
install/connect Supabase and use its supabase skill, plus supabase-postgres-best-practices
for queries/schema; credentials and migration authorization are separate. Optional for
our earlier design-interview/ADR style: separately install or transfer the personal
grill-with-docs, grilling, and domain-modeling skills. ImageGen and a GitHub plugin are
not needed for A4. Install only missing relevant capabilities, start a fresh Codex task
after plugin installation, and report unavailable tools with a workable fallback.

Once A4 is approved, connect A's shell-only clinical controls and touchscreen energy
to established defib, NIBP, alarm, audio, and CPR rules. Preserve the active-defib Patient
mode lock, one-press Shock guard, honest disabled states, and X/Z behavior. Add feature
tests, log requirement changes in PLAN.md and completions in STATUS.md/CHANGELOG.md, and
report focused/full tests, types, lint, build, and rendered QA separately from the three
documented unrelated baseline failures.

Gate A5 and A6 with separate plans and my approvals. A5 owns all six inner-display
destinations, Vital Log, French-default/English-toggle UI, and a persistent outer shell.
A6 alone owns live A selection, controlled database migration, real-iPad and qualified
IP review, and my explicit decisions on defaults and X/Z public availability. Do not
make release, deletion, production migration, or legal-clearance decisions for me.
```
