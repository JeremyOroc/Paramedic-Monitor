# STATUS.md — Paramedic Monitor Build Status

> Updated with every commit. This is the single source of truth for what is done, in progress, and blocked.
> All team members and AI tools should read this before starting work.

---

## Current Phase
**Wagami A metadata-row and Preview-timer refinement — COMPLETE LOCALLY (2026-09-22).** Device
Patient mode and active alarms, Montréal date/time, and Monitor elapsed time now share one aligned
row beneath the vital cards. MODE has explicit separation from its selected chip; clock and timer
text use a larger 13–18 px responsive treatment. `/?dev=3` now counts from its initially powered-on
state, continues through secondary views, resets on power-off, and restarts at zero on power-on
without creating Preview Vital Log rows. Live and Spectator retain shared presentation/parity. All
38 focused tests, TypeScript, affected-file ESLint, the Next.js 16.3 Webpack production build, and
rendered 1280×720 plus 1024×768 interaction QA pass with no browser console errors.

**Wagami A medication, metadata, Vital Log, localization, and mode cues — COMPLETE LOCALLY
(2026-09-22).** Medication presses receive a 400 ms cyan local confirmation without changing event
recording, and visible Record/Consigner sublabels are removed. The live display adds a right-aligned
elapsed timer and Montréal date/time; Preview and Spectator use the defined honest/mirrored variants.
Vital Log defaults to five minutes and A Configure now offers persisted 1/3/5/10/15/30-minute
exact-second cadences while X remains fixed at five. English A terminology is consistently HR/BP,
French remains FC/PNI, and the current mode uses a subtle chip. The 82-test focused suite,
TypeScript, affected-file ESLint with zero errors and one existing warning, the Next.js 16.3 Webpack
production build, and rendered 1280×720 plus 1024×768 interaction QA pass. The full suite has 1,624
passing and one skipped; two concurrent admin timeouts pass in isolation, leaving the same three
unrelated Room-ownership/PatientInfoPanel baseline failures.
**Continuous VF waveform — COMPLETE LOCALLY (2026-09-22).** The shared VF signal no longer forces a
near-zero tail before its four-second boundary. Irregular alternating extrema occupy the complete
cycle, and the sampled endpoint closes onto the first without a wrap spike. VF amplitude, variation,
sweep timing, displayed-FC behavior, defibrillation logic, and consistent A/X/Z/live-12-lead use are
preserved. The 114-test focused suite, TypeScript, affected-file ESLint with zero errors and five
existing warnings, the Next.js 16.3 Webpack production build, and rendered Wagami A VF review pass.
The full suite retains only the same three unrelated Room-ownership and PatientInfoPanel failures.

**Wagami A Fresh sweep reveal — COMPLETE LOCALLY (2026-09-22).** Live ECG, SpO2, EtCO2, and the
synchronized Live 12-lead grid begin genuine sequences blank and grow only behind their existing
Sweep erase bands. Established and partially filled sequences retain patient-time Continuity
reconstruction through navigation, overlays, backgrounding, and resize, including bounded hidden
signal transitions. Reset generation reaches trainee, Preview, and Spectator renderers; CPR and
connected signal changes no longer restart the canvas. Static content remains immediate; clinical
logic, capture availability, X, and Z are unchanged. Focused tests, TypeScript, affected-file ESLint
with zero errors and one existing warning, the Next.js 16.3 Webpack production build, and rendered
Preview checks of power-on and synchronized live 12-lead growth pass. The full suite retains only
the same three unrelated Room-ownership and PatientInfoPanel baseline failures.

**Wagami A waveform continuity across navigation — COMPLETE LOCALLY (2026-09-22).** Live ECG,
SpO₂, EtCO₂, and the first-opened live 12-lead grid retain their canvas and patient-time sweep
through every temporary view, including shell-free Call Info, in trainee, Preview, and Spectator
paths. Re-entry reconstructs at final size before reveal; one local beat clock aligns main ECG and
live-lead timing. Frozen captures, deliberate signal resets, CPR presentation, and disconnected
channels keep their existing semantics. The 78-test focused suite, TypeScript, affected-file ESLint
with zero errors and one existing warning, Next.js 16.3 Webpack production build, and rendered
1280×720 and 1024×768 Preview navigation QA pass.

**Instructor fused-vital layout refinement — COMPLETE LOCALLY (2026-09-22).** ECG is restored to the
top of the right column above CPR and timed-vital controls. The shared timer now sits above FC in the
left column and visibly reads `Trend`; compact fused inputs are shortened to their prior widths, and
EtCO2 calibration is beneath EtCO2. Functional Trend, ECG, CPR, timed-vital, Save/Send, and
calibration behavior is unchanged. All 67 focused tests, TypeScript, affected-file ESLint, the
Next.js 16.3 Webpack production build, and rendered 1280×720 desktop QA pass.

**Instructor fused vital/Trend authoring — COMPLETE LOCALLY (2026-09-22).** Each numeric vital now
uses one widened Fused vital input. Blank/zero timer Sends apply staged values immediately; positive
timer Sends interpolate every changed value from its live Send-time value under one shared deadline.
Unrelated Sends do not restart progress, running targets remain visible, the countdown supports a
replacement-edit mode, completion/no-op disarms the timer, and an intentional immediate interruption
shows white zeroes. Store version 14 migrates legacy separate targets. Off-channel progression,
independent BP/PNI sampling, reset/power/reload behavior, scenario persistence, ordinary final-vital
evaluation rows, and consistent VF/VT FC exclusion are covered. Accepted ADR 0033 records the
single-input tradeoff. All 376 focused tests, TypeScript, ESLint with zero errors and 12 existing
warnings, the Webpack production build, and rendered 1024×768 panel QA pass. The full suite has 1,581
passing, one skipped, and the same three unrelated Room-ownership/PatientInfoPanel failures.

**Wagami A full-page Call Info — COMPLETE LOCALLY (2026-09-21).** Reopened Call Info now replaces
the shell with a viewport-filling, live Assignment dashboard and a slim localized header for Back,
Patient mode, and active alarms. Response/countdown state, dispatch actions, hospital routing and
directory are wired like Wagami X; the classic query variant also works. A blocks entry during
analysis, charging, and charged states through both touch and shell navigation, while X/Z remain
unchanged. Preview uses a non-live full-page canvas, Spectator mirrors it read-only, and the initial
dispatch gate stays shell-free. The 71-test focused suite, TypeScript, affected-file ESLint with
zero errors and one existing warning, and Next.js 16.3 Webpack production build pass. Production
browser QA at 1280×720 and 1024×768 confirms no shell or scrollbars, classic fit, and Back return.
The complete suite has 1,594 passing, one skipped, and the same three unrelated existing failures
in Room ownership and PatientInfoPanel.

**Wagami A mute-button visual state — COMPLETE (2026-09-21).** The shell-only audio button now
shows a speaker with waves when device audio is on and a crossed speaker when muted. No label,
badge, or state-specific color was added; accessible French/English action names, pressed state,
audio behavior, alarm indication, and X/Z remain unchanged. Seven focused component tests,
TypeScript, affected-file ESLint, and rendered landscape Preview inspection of both states pass.
**Wagami A direct PNI-settings entry — COMPLETE LOCALLY (2026-09-20).** The complete
on-screen PNI card is now the sole localized entry to PNI settings on Wagami A, including while
PNI is Off or a reading is active. The current reading continues unchanged; edits affect later
readings. Configure loses its PNI-settings row, the physical PNI shell key retains exclusive
measure/cancel ownership, Preview/live remain interactive, Spectator only mirrors the projected
view, and X/Z plus all current PNI operating behavior remain unchanged. Back and physical-navigation
behavior are resolved: Back returns directly to Monitor, the card stays outside the shell action ring,
and the physical PNI key plus reading completion leave settings open while the measurement proceeds
in the background. Settings navigation adds no Evaluation event. The 162-test expanded
BP/navigation suite, TypeScript, ESLint with zero errors and 12 existing warnings, rendered 1280×720
interaction review, and Next.js 16.3 Webpack production build pass. The complete suite reports 1,572
passing, one skipped, and the same three unrelated Room-ownership/PatientInfoPanel failures.

**Shared Wagami A/X cuff-pressure count-up — COMPLETE LOCALLY (2026-09-20).** One shared immediate
numeric cuff sequence now serves both models: start at `0 mmHg`, rise in the
main PNI slot for approximately eight seconds to systolic + 30, then settle to the accepted SYS/DIA
result. Wagami A displays no detail messages during or after measurement. Cancellation restores the
old accepted reading, readings snapshot their target at start, BP-only alarm suppression continues,
pending Off completes before clearing PNI, partial-active results show both numbers while keeping
independent log/alarm flags, and start/cancel event attribution is normalized. A removes its detail
line and enlarges PNI to match its other vital values; A keeps inline `SYS/DIA`, X keeps stacked
SYS/DIA, and the exact peak holds for 100 ms. Intermediate values remain presentation-only. Reset
boundaries cancel without acceptance; Wagami Z stays unchanged. The source count-up uses elapsed-time
catch-up, Spectator shows the latest projected value without a second clock, the BP control retains an
accessible Cancel action, and A uses full single-vital sizing before a largest-safe final `SYS/DIA`
size. The source hook derives progress from elapsed time, reaches the exact peak at eight seconds,
and settles 100 ms later. The 130-test focused suite, TypeScript, ESLint with zero errors and 12
existing warnings, a rendered 1280×720 Wagami A review, and the Next.js 16.3 Webpack production build
pass. The complete suite reports 1,565 passing, one skipped, and the same three unrelated existing
Room-ownership/PatientInfoPanel failures. No ADR is warranted for this reversible change.

**Wagami A clinical status-line consolidation — COMPLETE LOCALLY (2026-09-20).** The main bottom
source/mode strip and preview/live metadata are removed, and the waveform workspace uses the recovered
height. A fixed shared line now shows dynamic Device Patient mode plus only active localized alarms in
FC/HR → SpO₂ → PNI/NIBP order on the monitor and every secondary header, including Call Info. The
physical mode key now always reads `MODE` while its accessible name announces the current mode; its
cycle, defibrillation lock, Configure readout, alarm LED, and X/Z behavior are preserved. The 112-test
Wagami A/Spectator/X/Z focused suite, TypeScript, ESLint with zero errors and 12 existing warnings,
1280×720 rendered main/secondary/Call Info review, and the Next.js 16.3 Webpack production build pass.
The verified work is prepared on `wagami-a-v2` for integration into `main`.

**Wagami A CPR metronome unmute recovery — COMPLETE LOCALLY (2026-09-20).** Unmuting Wagami A now
resumes the metronome when CPR is active, its clock has started, and the timer remains above `0:00`.
It does not replay the spoken CPR instruction or restart after completion. Preview and live trainee
paths share the rule; X/Z remain unchanged. The expanded 103-test focused suite, TypeScript, ESLint
with zero errors and 12 existing warnings, and the Next.js 16.3 Webpack production build pass.

**Wagami A CPR timer audio completion — COMPLETE LOCALLY (2026-09-20).** Wagami A now stops its
CPR voice/metronome sequence when the active two-minute timer reaches `0:00`, while leaving the
display at `0:00`, alarms available, and X/Z unchanged. The same completion guard is wired into
Preview and live trainee use. The expanded 57-test Wagami A focused suite, TypeScript, ESLint with
zero errors and 12 existing warnings, and the Next.js 16.3 Webpack production build pass.

**Wagami A automatic advised-charge refinement — COMPLETE LOCALLY (2026-09-20).** The A-only
clinical amendment is implemented on `wagami-a-v2`: shockable Analyze results start the existing
four-second charge automatically, one physical Charge press starts manual charging, charge progress
is separated from generic analysis progress, and the defibrillation panel places a large CPR timer
in its center with the charge meter anchored at the bottom. The permanent ready/not-ready row is
removed while contextual charged status remains. Preview, live trainee, and Spectator share charge
origin and semantic progress; X/Z remain unchanged. The requirement, glossary, and ADR are recorded.
The 45-test focused suite passes, TypeScript passes, full ESLint has zero errors and the same 12
existing warnings, and the Next.js 16.3 Webpack production build passes. The complete suite reports
1,556 passing, one skipped, and three unrelated existing failures in Room ownership and
PatientInfoPanel styling; no Wagami A test fails.

**Wagami A rolling UI refinement — AUTHORIZED (2026-09-20).** Wagami A was merged to `main` in
`bd13ffc`, and `wagami-a-v2` now starts from that same commit with a clean working tree. The
programmer authorized an ongoing, non-phased UI workstream for a collaborator: clear Wagami A UI
requests may be implemented, tested, committed, and pushed to `wagami-a-v2` without creating or
approving a numbered phase. Clinical behavior, database/schema work, production/release settings,
model defaults or availability, X/Z removal, and merges to `main` remain separate decisions. The
active collaborator brief is `docs/handoff/wagami-a-ui-updates.md`; the A4–A6 handoff is historical.

The production Supabase migration ledger includes `20260915160205_widen_wagami_a_report_model`,
and the validated `evaluation_reports_defibrillator_model_check` constraint accepts `wagamiX`,
`wagamiZ`, and `wagamiA`. Physical landscape-iPad QA and qualified distinctness/IP review remain
pre-public-release evidence, not blockers to internal UI development on `wagami-a-v2`.

**Wagami A/main merge reconciliation — COMPLETE (2026-09-20).** Both independent documentation
histories and all three shared Monitor hooks are retained. The merged state passes 511 focused tests
across 16 files, TypeScript, full source ESLint with zero errors and 12 existing warnings, and the
Next.js 16.3 Webpack production build.

**Wagami A phased roadmap — ACCEPTED; A0 inventory — COMPLETE; A1 Precision Graphite concept gate — COMPLETE; A2 local implementation — COMPLETE; A3 original shell/live display — COMPLETE (2026-09-15).**
**A3.1 shell/navigation — COMPLETE AND PROGRAMMER-ACCEPTED; A4 clinical core — COMPLETE
(2026-09-15); A5 destinations/localization/preferences — COMPLETE (2026-09-16); A6 live
integration — COMPLETE LOCALLY (2026-09-17), with external release gates still open.**
**2026-09-20 historical Git handoff — COMPLETE and superseded by the rolling UI brief.** The programmer chose
the branch-transfer option. Commit `069f611` contains the complete A4/A5/A6 implementation, all 38
previously modified paths, all 17 previously untracked paths, tests, and the handoff audit, and was
pushed successfully to `origin/wagami-a`. That transfer record remains historical; current UI work
starts from `origin/wagami-a-v2` using `docs/handoff/wagami-a-ui-updates.md`.
The A4, A5, and A6 plans were approved before implementation. The repository record does not show
a separate post-implementation acceptance of the combined A4–A6 working tree, and local completion
does not imply release acceptance.
The programmer approved the concrete A6 plan after accepting A3/A3.1 and completing A4/A5.
A3.1 and the original handoff are committed at `d03cd3f`; A4/A5/A6 and their audited handoff were
published from `069f611` on `origin/wagami-a` and are now contained by `main` and `wagami-a-v2` at
`bd13ffc`. The rendered design, destination, local live-integration, and production report-model
constraint gates are closed. Real-iPad QA, renewed distinctness review, qualified IP advice, and
release/default/public-availability decisions remain external release gates.
The Room-free `/?dev=3` preview runs the approved A clinical core and all six A5
destinations inside the persistent shell: 12-lead capture/print/transmit, EtCO₂
calibration, Medications with nested Event Log, the existing Assignment dashboard, Vital
Log, and Configure/PNI. French is the default; English is selectable. Device language and
shell-LED choice persist by supplied Room/Attempt scope, while LED Off leaves on-screen
and audio alarm behavior intact. English uses existing recorded prompts; French uses
`fr-CA` browser speech. Events retain locale-neutral semantic kinds/payloads. The direct
preview invents no Vital Log rows. Optional typed A projection state renders these choices
in Spectator. Instructor A selection, normal Save/Send, live Attempts, semantic event publication,
shared Vital Log, and Room/participant/Attempt-scoped A projection publication are now enabled in
the local application. X/Z remain available and X remains the default.
Shell-only Analyze, Charge, charged-only one-press Shock, BP reading, all-cues mute,
Patient-mode cycle/lock, Power, and touch energy remain functional. Confirmed pending BP
is hidden until cuff acceptance, BP alarms pause during reading, and X/Z default clinical
behavior remains unchanged.
A6 focused integration tests pass (151 across 15 files), including Instructor selection/send,
Saved scenario round-trip, live monitor actions, scoped preference reset, projection/Spectator,
server state/history, reports, and migration contracts. TypeScript, full source ESLint
(0 errors; 12 established warnings), and the Webpack production build pass. Rendered
1280×720 and 1024×768 QA covered all destinations, French/English switching, LED state,
rapid contained-map navigation, and exact viewport fit without page overflow or console errors.
Full Windows Vitest has 1,509 passing, one skipped, and the same 11 unrelated
failures: seven operations-script tests requiring Bash absent on PATH, two Room-ownership
baselines, one PatientInfoPanel class expectation, and one LF-only config assertion against
this CRLF checkout. No A4/A5/A6 test fails. At the A6 implementation milestone, the A report
migration and pgTAP assertions had source-level coverage only; the migration was subsequently
applied and its live constraint was validated as recorded at the top of this status ledger.
For the 2026-09-19 handoff audit, a fresh selected 15-file A6 run passed 147 tests and the full
suite again reported 1,509 passing, one skipped, and the same 11 failures. Sequential
`npx tsc --noEmit`, full source ESLint (zero errors, 12 warnings), and the Webpack build passed.
The earlier 151-test result and the new 147-test result used different selected file lists; neither
is the complete suite. No Wagami A test failed in the fresh full run.
The collaborator prompt includes an install/check list for UI skills and Supabase work,
optional personal planning skills, and a Playwright fallback. These are environment
recommendations, not permission to perform a production migration or make a release decision.
The programmer has requested a new right-shell Analyze/Charge/Shock vertical group, left-shell
sound mute/Patient mode/BP reading, lower-shell Left/Enter/Right screen navigation, and a Vital Log
replacement for Print/Capture. `PLAN.md` records the accepted amendment; A3.1 has now
superseded the historical A3 control placement without changing X/Z. Patient mode is confirmed disabled throughout active Analyze, Charge, and shock-ready
states until delivery/cancellation. The former Print/Capture launcher is confirmed to become a
timestamped Vital Log of FC, accepted BP, SpO2, and EtCO2; 12-lead capture/printing remains in
12-lead. The shell is confirmed to remain visible and operable across every secondary view,
including full-display 12-lead and Call Info content. Analyze, all-cues mute, and BP reading
are shell-only actions; their old touch buttons were removed, while PNI and defib
status remain visible/read-only. The Patient mode shell button is the sole mode changer,
cycling Adult/Pediatric/Neonate/Adult on permitted presses, with shell and screen state labels;
Configure shows the mode read-only. Power stays isolated upper-right; the right-stack Shock
retains a guard. Left/Right cyclically select enabled inner-display controls (six dock tiles in
row order, then energy controls), excluding shell actions, read-only cards, and disabled states;
Enter activates once, and secondary views have their own focus cycle with live-screen selection
restoration. Vital Log uses X's five-minute snapshots, eight-row pages, and power-off/refresh
reset; the Room-free preview does not fabricate history. The v3 concept is approved,
A3.1 shell/navigation code and tests are implemented, and the programmer accepted the
flatter rendered code-native housing as done. Real-iPad and qualified
IP review remain A6 gates.
The non-destructive Precision Graphite shell-controls v3 image and review spec are saved under
`docs/design/wagami-a-concepts/` and were visually approved as A3.1 direction. It depicts all requested
outer-shell buttons, six corrected task labels, and the retained vital/waveform hierarchy,
but its illustrated date, numbers, dimensions, and icon/button behavior are not clinical or
iPad-fit evidence. The new right-side hardware stack shares a broad motif with Wagami Z;
renewed side-by-side distinctness review and qualified Canadian IP review remain necessary.
The attached BP icon was not used as image input or project asset. A3.1 replaced the
Print/Capture tile with `Journal des signes vitaux`, moved Analyze/mute/PNI-reading to
shell-only guarded callback slots, and added an original cuff/gauge SVG and three hardware
navigation keys. Its focus model wraps only enabled inner actions and remembers selection
per view. At the A3.1 milestone the direct preview enabled Power alone; A4 subsequently
enabled clinical controls and A5 subsequently enabled all destinations. All 22 A3.1-focused tests,
TypeScript, affected-file ESLint, and Webpack build
pass. Desktop browser QA covers 1024×768, 1536×1024, narrow fallback, no overflow/errors,
and Power cycling; screenshots and fidelity ledger are in the A concept folder. The full
suite re-run has 1,476 passing, one skipped, and only the three pre-existing
Room-ownership/PatientInfo failures. The stale A preview-label assertion was updated.
A is additive and X/Z remain available. The accepted direction is a matte-charcoal rugged field
tablet with top vital cards, dominant waveforms, a separate defib panel, six task destinations,
and physical-style Power/Charge/Shock. Existing working clinical timing and state guards carry
forward. The A3 baseline had a Print/Capture tile; A3.1 relabeled it Vital Log. A5 now presents
the shared five-minute timestamped history without inventing rows in the direct preview. Call Info opens the
Assignment dashboard, while the medication Event Log stays within
Medications. The v2 image tile reading `ÉVÉNEMENTS` is a superseded label; images remain unchanged.
Inert X-only controls are omitted. French/English Device language and shell-LED choice
are local to one Attempt and mirrored by Spectator; LED Off affects only the shell light, never
screen/audio warnings. Global all-cues mute has an honest label. The supported landscape iPad and
desktop contract remains. At the historical A2/A3 construction gate, incomplete A was excluded
from live Instructor Attempts; A6 has superseded that restriction and live A Attempts are now
enabled locally. The separate powered-on, dispatch-bypassed `/?dev=3` route remains a visible
`PREVIEW` with no Room join. X stays the development default; any A default change and X/Z public-availability
change require explicit later decisions, not automation. The seven-phase roadmap and tests are
recorded in `PLAN.md`; A0 asset/provenance findings are in `docs/research/wagami-a-phase0-inventory.md`.
At the historical A1 gate, the programmer approved Precision Graphite v2, the exact A-only palette,
PNI-card reading action, and persistent waveform-header global-audio mute. A3.1 superseded
those two action placements. The five-criterion concept-level review is
complete in `docs/design/wagami-a-concepts/precision-graphite-spec.md`. Actual rendered/iPad fit
checks belong to A3/A6 once UI code exists. Future distributable-asset disposition remains open.
A2 recognized A explicitly in model/scenario/projection/report contracts and labels, while
legacy unknown models still default to X. Its independent `/?dev=3` powered-on construction
preview uses code-native A tokens, shows all six future right-side destinations and `PREVIEW`,
and never enters Room routing. At that historical gate Instructor offered only X/Z, imported A
drafts could not be Sent, and the server rejected A before live state/history writes; the approved
A6 implementation supersedes those restrictions. A local forward report-check migration was
created and transactionally tested at A2; it has since been applied to production, and the live
validated constraint accepts X, Z, and A report models. Focused
A2 app suites pass; TypeScript, ESLint (zero errors, 12 pre-existing warnings), and Webpack
production build pass. The full Vitest run reports three independently reproduced unrelated
Room-ownership/Patient-Info baseline failures, while the local 42-assertion report pgTAP run
reports two existing-audit-row failures; both new A constraint assertions pass. Rendered 1024×768
and 1366×768 preview DOM checks show no overflow. A3 replaced the construction placeholder with
the approved original shell and display; A4/A5 subsequently added clinical and destination interactions. No live Instructor A option or A Attempt was
enabled; no public asset removal or IP clearance decision was made.
At the historical A3 milestone, the direct preview used a code-native faceted shell,
upper-left white/red alarm LED, upper-right Power, left Charge, and guarded lower-right
Shock; A3.1 superseded those Charge/Shock positions. The screen has fixed
FC/SpO2/PNI/EtCO2 cards, a dominant ECG workspace with smaller SpO2/EtCO2 traces, a separate
defib status panel, and all six corrected right-dock tasks immediately visible. Existing waveform
renderers use A-only colors without changing X/Z defaults. With no active confirmed channels,
the isolated preview marks normal values as simulated; otherwise it shows the confirmed store
state and disconnects inactive traces. Power works now; Charge/Shock, clinical touch actions,
and destination launchers are visibly disabled until A4/A5, with phase explanations. A3-focused
tests pass (31), TypeScript, ESLint (zero errors, 12 pre-existing warnings), and the optimized
Webpack build pass. Browser QA checked Power off/on, clean console, no overflow at the 1024×768
minimum, and the unsupported-width guard at 375×812. The complete Vitest run has 1,468 passing,
one skipped, and the same three unrelated baseline failures. The generated shell cutout was not
adopted because its checkerboard was baked into the pixels, so the rendered shell remains original
CSS/SVG work; real-iPad and qualified IP review remain A6 gates.
Three original A1 bitmap concepts and three versioned v2 revisions are saved under
`docs/design/wagami-a-concepts/`; generation/revision is complete and the programmer selected
Precision Graphite v2 as the visual direction. Field Slate and Rescue Neutral remain available.
The first-pass menu icons hid the six secondary destinations behind two taps. The programmer
approved a 2×3 labeled touch grid at upper-right inside the screen, with a compact always-visible
defib status panel below; the physical Shock stays separated on the lower-right shell. All v2s
show this arrangement, but their bitmap targets, separate PNI/audio quick actions, and iPad fit
are not implementation proof. A1 concept decisions are complete; actual fit testing follows in
A3/A6. The programmer approved the staged A1→A2 scope. A uses original visual/voice assets unless reuse rights
are documented, while X/Z assets remain untouched. Tracked ZOLL reference photos remain private
planning references pending an explicit public-source-distribution decision. The accepted screen
orders FC/SpO2/PNI/EtCO2 above large ECG and smaller SpO2/EtCO2 traces, with a right-side defib
status pane rather than a right-side vital stack.
**Timer-box countdown presentation — COMPLETE (2026-09-19).**
Muted `MIN`/`SEC` placeholders now sit inside empty Trend Timer boxes and disappear for numeric values.
The boxes become read-only and display the live remaining time in amber while running, then editable
green zeroes at completion; cancelled remaining values use alarm red. The separate visible status/
countdown string is removed while an `aria-live` status remains. All 25 focused tests, TypeScript,
ESLint with zero errors and the same 12 unrelated warnings, and the Webpack production build pass.
Rendered QA confirmed the placeholder, amber countdown, and green completion states without clipping.

**Compact EtCO2/Trend timer row — COMPLETE (2026-09-19).**
The Instructor EtCO2 calibration indicator and complete Trend Timer now share one non-wrapping row
beneath the numeric vitals. The row precedes CPR/timed-vitals utilities when stacked and spans both
Vitals columns at desktop widths. Rendered QA measured the indicator and timer at the same 396px Y
coordinate in one 28px-high, 565px-wide row with no clipping. All 22 focused tests, TypeScript,
ESLint with zero errors and the same 12 unrelated warnings, and the Webpack production build pass.

**Instructor vital Trend and ECG-first layout — COMPLETE (2026-09-19).**
ECG now spans the Instructor Vitals panel directly below its heading and above FC. Every numeric vital
has an absolute Trend target between its current value and On/Off control, with one shared dispatch-
format minute/second timer. Save stages the configuration and Send consumes it into a timestamp-derived
linear progression; current values update once per second and every participating field reaches its exact
target at the deadline. Replacement, direct-value cancellation, Off-channel progression, independent BP,
NIBP sampling, CPR display priority, Automatic FC locking, reset/New Attempt, hydration, Room-device
synchronization, and Saved-scenario preparation follow the documented contract. Evaluation suppresses a
Trend-only start and publishes one idempotent completion row with final values. All 442 focused tests,
TypeScript, ESLint with zero errors and the same 12 unrelated warnings, and the Webpack production build
pass. The complete suite records 1,468 passing tests and one skip with the same three established unrelated
failures. Rendered 1280×720 QA confirmed the layout and a live FC 120→150 Trend completed at `00:00`.
The default Turbopack build remains environment-blocked by its worker-port restriction.

**Start-locked dispatch countdown and hospital preview restoration — COMPLETE (2026-09-19).**
The staged countdown remains editable through Save and Send, while **Start / Dispatch** now snapshots the
last sent duration, stamps the response/route clocks, and persists an authoritative lock that UI controls,
direct store actions, scenario loads, hydration, and later Sends cannot bypass. Active caller, vital,
Incident-scene, Unit-origin, and route updates retain the run id, absolute countdown, Acknowledge, Arrival,
and Transport milestones. The configured duration remains visible in disabled inputs beside a separate
live countdown, including a locked `00:00`; New Attempt/reset establishes the next editable cycle. A
pre-Transport Receiving-hospital selection remains available in its directory preview, but minimizing now
restores the compact Dispatch route at its current progress; Transport promotes the selected hospital route
to the compact active route. All 265 focused store/hook/Admin/Monitor/component tests pass, TypeScript is
clean, and ESLint has zero errors with the same 12 unrelated warnings. The complete suite records 1,444
passing tests and one skip with the same three established unrelated failures. Production build remains
environment-blocked because Turbopack cannot bind its worker process port.

**Dispatch route same-run enrichment — COMPLETE (2026-09-14).**
Only the first dispatch, a normalized Incident-scene change, or a changed countdown now creates a new
Dispatch run. Coordinate/status/geometry enrichment and Unit-origin changes retain the run id, clocks,
trainee milestones, monitor entry, and Transport state. Routing now runs outside the Caller Info tab,
rejects stale results, promotes matching route-only data without making Save/Send dirty, and automatically
publishes late active-run results through a serialized, coalesced, three-attempt queue. Start and active
re-dispatch Send warn before any mutation when routing is unresolved, with live ready-state confirmation;
unsent address edits block Start. Route availability and Retry now sit beside End Room. System enrichment
history remains available for exact action context while visible Instructor rows and behind counts ignore
it. All 411 focused store/hook/Admin/Monitor/evaluation/server/component tests pass, along with TypeScript,
diff validation, and ESLint with zero errors and the same 12 unrelated warnings. The complete suite retains
its same three established unrelated failures; production build and live browser QA are environment-blocked
because Turbopack cannot bind its worker port and an existing unresponsive Next dev lock owns port 3000.

**Compact Scenario library and atomic Reports deletion — COMPLETE (2026-09-14).**
Saved Scenario rows now measure 44px at the desktop breakpoint and keep drag, title, bounded folder,
Up/Down, Save/Save Copy, and Delete controls in one ordered line, with compact narrow wrapping and an
equally dense inline Draft row. The editor label is now `Change scenario title`, with the matching
accessible name and `Enter scenario title` placeholder. Reports now has a current-page delete mode,
eligible-only multi-selection, count/detail confirmation, disabled detail actions, failure-preserving
selection, and valid-page recovery. Single and bulk deletion share one owner-scoped 1–25 report RPC;
RLS and the transaction both prevent deletion of the current unexpired active Attempt and preserve
all-or-nothing behavior. All 106 focused tests and all 40 report RLS pgTAP checks pass, along with
TypeScript, the Webpack production build, database lint/advisors, and ESLint with zero errors and the
same 12 warnings. Rendered 1440px QA confirmed 44px rows, right-side control order, eligible-only
selection, active-Attempt protection, and contextual confirmation with no browser warnings. The full
suite records 1,409 passing tests and one skip; its same three established unrelated failures remain.

**Persistent 12-lead timeline — COMPLETE (2026-09-13).**
After its first opening, the complete 12-lead layer and all twelve canvas elements now remain mounted
through Back and later re-entry. Hidden leads continue logical patient/sweep time without drawing;
reopening forces final geometry, reconstructs every current sweep, and waits for all twelve renderers
before revealing the grid. The normal and 12-lead layers now use one bidirectional readiness handoff,
with shared behavior in trainee and Spectator monitors. All leads use synchronized sweep timing and
cycle duration. At 1180×820 browser replay, twelve hidden canvases remained mounted and
non-interactive, then reopened with their original 380×102 backing stores and a clean console. All
136 focused tests, TypeScript, ESLint with zero errors and the same 12 warnings, and the Webpack
production build pass. The complete serialized suite records 1,411 passing tests and one skip with
the same three unrelated baseline failures.

**Safari background stroke boundary — COMPLETE (2026-09-13).**
Switching to another Safari/browser tab now creates a hard waveform stroke boundary. On return, the
renderer advances patient time, reconstructs the current sweep around its erase gap, skips the first
incremental stroke, and only then resumes local drawing, eliminating a line across the hidden
interval. `visibilitychange` and Safari `pagehide`/`pageshow` events share one idempotent recovery;
the existing long-frame fallback covers omitted events. At 1180×820 browser replay, the ECG retained
its 1000×240 backing size and produced a clean console. All 142 focused tests, TypeScript, ESLint with
zero errors and the same 12 warnings, and the Webpack production build pass. The complete suite's
worker-constrained files pass serially, yielding 1,409 passing tests and one skip with the same three
unrelated baseline failures.

**Seamless waveform re-entry — COMPLETE (2026-09-13).**
Browser and 12-lead returns now rebuild the current ECG, SpO₂, EtCO₂, and CPR sweep before it becomes
visible. The renderer uses absolute elapsed time, detects long animation-frame gaps even when Safari
misses or reorders visibility events, and never draws between pre-suspension and post-suspension
cursors. Covered live-monitor canvases stop drawing while their logical timeline advances, leaving
the iPad frame budget to the twelve 12-lead canvases. Back retains the 12-lead cover until every live
renderer has forced its final dimensions and reported its reconstructed sweep ready; trainee and
Spectator share this behavior. At 1180×820 browser replay, the ECG retained a 581×150 backing store
while covered and returned to its original 580.54×150.09 region with the same backing size and a clean
console. All 144 focused tests, TypeScript, ESLint with zero errors and the same 12 warnings, and the
Webpack production build pass. The complete suite records 1,408 passing tests and one skip with the
same three unrelated baseline failures.

**Continuous live waveform timeline — COMPLETE (2026-09-13).**
ECG, SpO₂, EtCO₂, and CPR compression traces now advance by real elapsed patient time when a browser
tab is hidden, then resume from the current signal and sweep position without clearing the canvas,
rewinding, or connecting stale and current points. The trainee and Spectator live waveform layers
remain mounted beneath the complete 12-lead workflow; the existing temporary Call Info/map,
Treatment, Patient Info, Event Log, acquisition, print, and transmission surfaces preserve them as
well. Genuine signal changes and device/Attempt resets retain their restart semantics. Browser replay
kept the ECG attached at a 1000×240 backing size throughout 12-lead entry and return with no console
errors. All 130 focused tests, TypeScript, ESLint with zero errors and the same 12 warnings, and the
Webpack production build pass. The complete suite records 1,391 passing tests and one skip with the
same three unrelated baseline failures.

**Dedicated Instructor Room QR rail — COMPLETE (2026-09-13).**
The complete 480px Room-controls panel now uses a stable 65% operational region and 35% QR rail while
joining is available. The isolated rail has an approximately 202px minimum, a subtle divider, and
centered same-width Generate/QR states; opening the QR no longer stretches Room code/Copy or compresses
the left-side controls and internally scrolling Devices list. Ended Rooms remove the rail and restore
full-width left content. All 46 focused component/Admin tests, TypeScript, ESLint with zero errors and
the same 12 warnings, and the Webpack production build pass. The complete suite records 1,399 passing
tests and one skip with the same three documented unrelated baseline failures. Authenticated rendered
Instructor QA remains unavailable on this host because the local route redirects to sign-in.

**Inline Instructor Room QR and robust Room-code prefill — COMPLETE (2026-09-13).**
The QR popup is replaced by a 176px inline disclosure in the Generate action's location, with explicit
Hide/Generate focus continuity, responsive wrapping, Room-change reset, and automatic removal when a
Room ends. Valid Room-code query values now populate on initial load and client-side query navigation
without overwriting later manual input or auto-joining. The Device-nickname helper is removed while
optional joining and automatic `Device N` allocation remain unchanged. All 170 focused tests,
TypeScript, the Webpack production build, and rendered production-built lobby QA pass; ESLint has zero
errors and the same 12 existing warnings. The complete suite records 1,376 passing tests and one skip,
with the same three documented unrelated baseline failures. The production site still serves the
older lobby; this host has no authenticated direct Vercel path, so the branch must be integrated into
`main` for the configured GitHub deploy-hook workflow to attempt deployment.

**Invariant Wagami X device geometry — COMPLETE (2026-09-13).**
Zero-minimum shell and Monitor tracks now contain intrinsic clinical content within the established
LCD, so it cannot resize the screen or push the physical right controls under the shell boundary. The
analysis/CPR lower row shares its remaining width in a 2:1 ratio around the exact timer track; at the
reproduced viewport its cells measure 212.66px, 68.52px, and 106.33px inside the unchanged 403.52px
bottom region. Rendered replay keeps the 940.02px shell, 570.88px screen frame, 144.36px right-control
cluster, Home button, Patient Event button, and 555.52px Monitor surface at identical rectangles from
idle through Analyze, CPR, and the charge prompt. Every right control remains fully visible. The
Resting-to-Defib vital transition and charge energy scale remain unchanged. All 142 focused tests,
TypeScript, ESLint with zero errors and the same 12 warnings, and the Webpack production build pass.
The complete suite records 1,387 passing tests and one skip with the same three unrelated failures.

**Exact CPR interval content reservation — COMPLETE (2026-09-13).**
The shared Wagami X status bar now keeps its real `CPR Time` label and fixed four-character value
mounted but invisible and excluded from accessibility output throughout every analysis state. CPR
reveals those same elements without introducing new intrinsic content, so trainee and Spectator
geometry no longer expands when the countdown appears. Browser replay holds the bottom bar at
468.52px, the timer slot at 68.52px, and its content at 66.52px across `ANALYZING ECG`, `STAND CLEAR`,
`SHOCK NOT ADVISED`, and `Perform CPR`; only visibility changes. All 124 focused tests, TypeScript,
ESLint with zero errors and the same 12 warnings, and the Webpack production build pass. The complete
suite records 1,386 passing tests and one skip; its three established unrelated failures remain, and
one load-sensitive fullscreen-map failure passed all 10 tests immediately alone.

**3rd Degree Automatic FC 60 — COMPLETE (2026-09-13).**
3rd Degree now locks FC On at 60 and runs two ventricular escape complexes every two seconds for a
matching 60/min live cadence. Four independent P waves per cycle retain the existing 120/min atrial
cadence and complete AV dissociation. QRS morphology, static 12-lead capture, lock restoration, CPR
priority, persistence, shared Room behavior, and all other rhythms remain unchanged. All 325 focused
automatic-rate, store, scenario, Instructor, display, capture, and waveform tests pass. TypeScript,
the Webpack production build, and ESLint with zero errors and the same 12 warnings pass. The complete
suite records 1,387 passing tests and one skip with the same three documented unrelated failures.

**Revised heart-block Automatic FC rates — COMPLETE (2026-09-13).**
2nd Degree Type 2 now locks FC On at 80 and runs its three conducted ventricular complexes at
80/min. 3rd Degree now locks FC On at 40 and runs its two ventricular escape complexes at 40/min.
Instructor display, direct/batch edits, Saved scenarios, persistence hydration, shared Room state,
trainee display, ECG timing, and SpO2 pulse cadence use the revised values. Existing lock restoration,
CPR priority, static 12-lead images, and other rhythms remain unchanged. All 283 focused tests,
TypeScript, ESLint with zero errors and the same 12 warnings, and the Webpack production build pass.

**Rhythm-owned Automatic FC locks — COMPLETE (2026-09-13).**
The shared Instructor Console now forces FC On and locks its editor for Torsades, 2nd Degree Type 2,
and 3rd Degree. Torsades presents `AUTO 150–250` to the Instructor and runs a deterministic,
Room-synchronized whole-number rate for each 15-complex packet; that value drives the trainee and
Spectator FC, ECG timing, SpO2 pulse cadence, alarms, Wagami X/Z, and Vital Log. 2nd Degree Type 2 is
fixed at 40 with a 40/min ventricular cadence, while 3rd Degree is fixed at 20 with a 20/min escape
cadence. CPR retains priority at 120 or 90 and the locked rhythm resumes afterward. Leaving the
locked group restores the prior manual FC value and On/Off state. All 291 focused tests, TypeScript,
ESLint with zero errors and the same 12 warnings, and the Webpack production build pass. The full
suite records 1,376 passing tests and one skip; 11 unrelated failures remain in Windows operations
script execution, invite-only config parsing, Room ownership expectations, and a stale Patient Info
color-class assertion.

**Stable CPR interval timer footprint — COMPLETE (2026-09-12).**
The Wagami X CPR timer now keeps one mounted, overflow-contained flex slot across Analyze and CPR.
Its current typeface uses tabular numerals inside a centered fixed four-character value box, while the
fixed left and right status cells cannot shrink into it. The same value element persists at `2:00`,
`1:59`, and `0:00`; countdown timing, banners, sounds, ECG continuity, the 110px bottom track, shell
geometry, and Spectator behavior remain unchanged. All 142 focused tests, TypeScript, and the Webpack
production build pass. ESLint has zero errors and the same 12 existing warnings. The complete suite
records 1,363 passing tests and one skip; one unrelated load-sensitive Admin timeout passed alone,
leaving the same three documented unrelated baseline failures. Physical iPad CPR replay remains
pending.

**Stable iPad Wagami X shell sizing — COMPLETE (2026-09-12).**
The standalone `DeviceShell` now inherits the fixed large-viewport surface already owned by
`MonitorPage` instead of independently claiming `h-screen`/`w-screen`. Its shell dimensions, physical
controls, labels, spacing, and typography use stable `lvh`/`lvw` measurements, preventing Safari or
Control Center chrome changes from making the monitor subtly grow and shrink. The 1.36 aspect ratio,
96% fit, desktop minimum width, embedded Spectator path, controls, clinical state, and continuous ECG
behavior remain unchanged. All 134 focused shell, Monitor, viewport, waveform, and defibrillator tests
pass. TypeScript, the Webpack production build, and production CSS generation pass; ESLint has zero
errors and the same 12 existing warnings. The complete suite records 1,361 passing tests and one skip
with the same three documented unrelated failures. Physical iPad gesture replay remains pending.

**Stable iPad Monitor viewport and ECG continuity — COMPLETE (2026-09-12).**
Wagami X now owns a fixed large-viewport surface while `MonitorPage` locks the document at its origin,
contains scroll and overscroll, corrects window/Visual Viewport movement, and restores prior document
state on unmount. The shared waveform renderer ignores one-pixel measurement noise, cancels transient
iPad browser-chrome sizes, commits only a size stable for 120ms, and carries both the existing trace
and waveform phase into the resized backing store. The approved one-time Resting-to-Defib vital move
after Analyze or Charge remains unchanged, and the same ECG surface stays mounted through Analyze and
no-shock CPR. All 95 focused viewport, renderer, waveform, defibrillator, and Monitor tests pass.
TypeScript and the Webpack production build pass; ESLint has zero errors and the same 12 existing
warnings. The complete suite records 1,359 passing tests and one skip with the same three documented
unrelated failures. Replaying the supplied Control Center/Safari gesture remains pending on a physical
iPad.

**Persistent iPad in-app Full-screen hospital directory — COMPLETE (2026-09-12).**
The trainee Assignment dashboard now detects both mobile-style and desktop-style iPad identities and
uses the fixed edge-to-edge in-app map presentation without requesting Safari native fullscreen. A
downward Safari/iPadOS fullscreen-loss gesture therefore cannot dismiss or duplicate the map; the
safe-area-aware labelled Minimize control is its only in-app exit. Desktop browsers retain native
fullscreen, Escape/native-loss recovery, and the rejected-request fallback. Selected hospital,
active route, directory composition, and contained read-only Spectator behavior remain unchanged.
All 17 focused map and hospital-routing tests pass, including the two iPad identity paths, persistent
fullscreen across unrelated `fullscreenchange`, explicit minimization, desktop native loss, and
rejected native entry. TypeScript and ESLint pass with zero errors and the same 12 existing warnings;
the Webpack production build passes. The complete suite records 1,356 passing tests and one skip with
only the same three documented unrelated failures. Physical iPad Safari and standalone/PWA
confirmation remains pending on the device.

**iPad Full-screen hospital directory exit recovery — COMPLETE (2026-09-12).**
The trainee Assignment dashboard now synchronizes app state when an iPad gesture, desktop Escape, or
another browser action ends native fullscreen, returning to the embedded route map and closing the
Receiving Hospital Directory without clearing the Selected receiving hospital or active route. A
rejected or unavailable fullscreen request still receives the fixed in-page fallback. Its fullscreen
surface uses dynamic viewport dimensions and an icon-and-label Minimize control measuring at least
48px high, inset by the device safe area. The contained read-only Spectator remains unchanged. All 43
focused map, directory, Caller Info, routing, and projection tests pass, along with TypeScript, a
production build, and full ESLint with zero errors and the same 12 existing warnings. Browser QA from
a 1024x768 viewport confirmed a 121x48 Minimize control and successful native Escape recovery. The
full suite recorded 1,352 passing tests and one skip; two load-sensitive failures passed immediately
when rerun alone, leaving the same three documented unrelated failures. Real iPad Safari confirmation
remains pending on the physical device.

**Console/hospital UI merge reconciliation — COMPLETE (2026-09-11).**
The compact Caller Info and fullscreen hospital-directory refinements are combined with the newer
Instructor Console discoverability work. Scenario title editing remains solely in the always-visible
Scenarios library, while Caller Info retains its compact responsive geometry with a countdown-only
half row. All 28 focused Caller Info, route-map, and hospital-directory tests and TypeScript pass;
ESLint reports zero errors and the same 12 existing warnings.

**Instructor Console discoverability polish — COMPLETE (2026-09-10).**
The authenticated Console now resolves the Account's waiting or active Room during server rendering,
so the launcher immediately shows its code/status with Reopen Room and confirmation-protected Close
Room actions while suppressing Create Room. Closing ends the Room without creating a replacement,
clears the local controller token, and restores the empty launcher. Scenario title editing is always
visible in the Scenarios library and no longer hidden in Caller Info. Student roster rows retain
presence, nickname, and Spectate while omitting Ack/Arr/Txp/Shk/Med summaries; event capture and
reports are unchanged. The sign-in invitation paragraph is removed. All 99 focused tests and
TypeScript pass; full ESLint has zero errors and the same 12 existing warnings; the webpack production
build passes. Rendered sign-in QA confirms the tighter form, removed copy, working input, clean
console, and no framework overlay. The full suite has 1,350 passing tests and one skipped test; its
three unrelated failures remain two date-expired Room fixtures and one stale Patient Info color-class
assertion.

**Fullscreen Hospital Directory retention and readability — SUPERSEDED IN PART (2026-09-12).**
The 2026-09-10 native-fullscreen retention behavior was replaced by the iPad exit-recovery phase
above. Directory overscroll remains contained, and the hospital toggle remains disabled until the
Full-screen hospital directory is left.
The trainee and contained Spectator directory occupy 30% width. Hospital names, designations, key
notes, and routing statuses now use 14px text in both sections, while distances use 12px text. The
directory shows at most ten fixed-height hospital rows and clamps long authored cells to three lines
while preserving their complete accessible text. The ready-state distance-ordering sentence is omitted.
Adult/Pediatric sections, all 18 hospitals, routing,
ordering, and map-pin label sizing remain unchanged. All 75 focused map, routing, monitor-projection,
and Spectator tests pass, along with the 16 focused follow-up regressions, TypeScript, ESLint with the
12 existing warnings, and the production build. Rendered 1080×810 and 1440×900 browser QA confirms
the new font sizes, exact 30% width, nine complete rows, no horizontal overflow, and removal of the
ready-state sentence.

**Compact Instructor Caller Info editor — COMPLETE (2026-09-10).**
The expanded editor now uses the confirmed responsive two-column desktop layout for Title/countdown,
route origin/summary, primary caller fields, and custom Title/Input pairs. Auto-sort remains full
width, Call/Priority/MPDS remains a three-column row, and Heure occupies the final half row. Probleme,
Information, and Mise a jour now open at half their former height and remain vertically resizable;
narrow layouts continue stacking at full width. The first-Send helper sentence has been removed and
the Scenario Title and minute/second inputs now share an aligned baseline. Existing autocomplete,
state, Save/Send, ordering, and extra-field behavior are unchanged. All 68 focused Caller Info and Instructor tests, TypeScript,
ESLint with the 12 existing warnings, the production build, and rendered desktop/narrow browser QA
pass.

**Spectator availability presentation — COMPLETE (2026-09-10).**
Standalone and Embedded Spectator views now share one typed availability resolver and one large,
non-dismissible player-surface veil for every non-Live state. Retained monitor frames remain beneath
an 85% black veil; states without a frame use solid black. Connecting, Room ended, Attempt not
started, and Waiting remain neutral, while Trainee offline and Spectator connection lost use pending
amber. Live alone keeps the small green header label. Identity, model, stale timestamp, and Docked,
Floating, Fullscreen, and Stop controls remain visible and usable; powered-off simulated monitors
remain Live when their projection path is healthy. The entry fade becomes static immediately and is
removed for reduced motion. All 83 focused tests, TypeScript, full ESLint with the 12 existing
warnings, the webpack production build, and rendered 1440×900 plus 1024×768 standalone QA pass with
no overflow, framework overlay, or console errors. The full suite has 1,346 passing tests and one
skipped test; its three unrelated failures remain two date-expired Room fixtures and one stale
Patient Info modal-color assertion.

**Wagami X CPR cue/timer and power-off audio — FIXED (2026-09-10).**
After either no-shock analysis or an advised shock, the CPR screen now holds `2:00` through the exact
1.752-second Perform CPR prompt and begins the two-minute interval on cue completion. A guarded,
state-owned absolute fallback starts at the same deadline when playback is muted, blocked, interrupted,
or missing its completion event, while delayed callbacks catch up instead of extending the interval.
Reset, Analyze, Charge, unmount, and power-off invalidate pending starts. Power-off now stops every
audible monitor cue before resetting the defibrillator, including streamed metronome media and decoded
one-shot buffers, while preserving the silent iOS keepalive and existing unmuted reboot default. All
94 focused page, defibrillator, timer, and audio tests pass; TypeScript, ESLint with the 12 existing
warnings, and the webpack production build pass. The full suite has 1,330 passing tests and one skipped
test; its three unrelated failures are two date-expired Room fixtures and one stale Patient Info
modal-color assertion.

**Wagami X 12-lead transmission — CODE COMPLETE, MIGRATION PENDING (2026-09-09).**
The third 12-lead soft key is now an envelope-only control that remains dim and inert until a capture
completes. It opens the confirmed seven-hospital destination panel, supports wraparound hardware
Up/Down/Enter navigation plus Back/Return, freezes destination controls during the exact three-second
SENT confirmation, and permits repeated sends from the retained capture. Each send creates a separate
Evaluation action using `12-lead sent — [hospital]` without adding an on-monitor event or performing an
external transmission. Spectator mirrors the panel, selection, destination, and absolute confirmation
deadline. Power-off, reset, and New Attempt lifecycle behavior clears transmission eligibility as
specified. The transmission destination is recorded separately from transport routing in the domain
model. Focused coverage passes all 245 tests across nine files, including direct Spectator rendering;
TypeScript, ESLint with the 12 existing warnings, the production build, and rendered browser QA pass.
The complete suite has 1,316 passing tests, one skipped opt-in test, and ten unrelated failures: seven
Windows/Bash subprocess assertions in `operationsScripts.test.ts`, one line-ending assertion in
`inviteOnlyConfig.test.ts`, and two date-expired fixtures in `roomOwnership.test.ts`. Apply
`20260909120000_twelve_lead_transmission.sql` with the application deployment so live Rooms accept the
new event kind.

Follow-up rendered QA restored the shared green background and blue selected-control color in Vital
Log, Medication Info/Event Log, and 12-lead Send. Their earlier arbitrary CSS-variable utilities were
present in markup but emitted no usable runtime background rule under the current Turbopack/Tailwind
incremental build; named palette utilities with stable global definitions now produce the intended
computed colors.

**Receiving-hospital map workflow — COMPLETE (2026-09-09).**
The assignment dashboard now provides the approved 18-entry Montréal-area Receiving Hospital
Directory, always-labelled Leaflet pins, OSRM driving-distance ordering, a native/fallback
full-screen map with an exact 30% internally scrolling Adult/Pediatric table, and pin/row route
selection. Transport routing is trainee-local and Attempt-scoped, persists through CALL INFO and
refresh, starts moving on Transport, supports atomic current-position rerouting with latest-choice
wins, and is mirrored semantically to Spectator without entering native fullscreen there. It remains
deliberately absent from Evaluation records. Re-dispatch and Incident-scene changes now clear
Acknowledge, Arrival, Transport, and hospital state. Dataset, routing, directory, persistence,
component, concurrency, store-reset, and projection validation coverage passes; TypeScript and ESLint
pass with only the 12 pre-existing warnings. The webpack production build passes. Rendered QA at a
1440×900 desktop viewport confirmed the full-screen 30% panel, internal vertical scroll, no horizontal
overflow, the exact columns/sections/copy, and no console errors. The full Vitest run has two unrelated
date-sensitive failures in `roomOwnership.test.ts` because its fixed 2026-09-08 expiration is no longer
future; the other 1,311 tests pass and one opt-in integration test is skipped.

**Instructor-recorded actions — PHASE 16 CODE COMPLETE, MIGRATION PENDING (2026-09-07).**
The console can record a med given while the paramedic's hands were full and a SAMPLE/OPQRST
question asked out loud; both are credited to the trainee and marked as instructor-entered, and the
staged history and Pulse/Respiratory/Skin findings now reach the report while staying out of the
state the trainee polls. `20260908120000_instructor_recorded_actions.sql` must be applied before the
checklist logging works against a live room. Rebased onto Phase 4: instructor-recorded actions are
authorized as the room's controlling device, so a read-only second device cannot write into the
record behind the controller's back. Rebased again onto Phases 5-7: persistent Evaluation reports
snapshot whole `student_events` rows, so the new kinds and the instructor marker carry into a saved
report without Phase 5 needing to know about them, and `ReportsPage` renders through the same panel.

**Accounts & scenario ownership — PHASE 7 CODE COMPLETE (2026-09-07).**
The authenticated page-shell consistency refinement is complete locally. Console, Reports, and
Account now share the Console's full-width outer spacing, header divider, green title treatment, and
top-right navigation. Reports and Account use title-only headers, the Account settings card is no
longer centered or width-capped, and current-device Sign Out is positioned directly below Account in
the shared header on every authenticated Instructor surface. Component coverage verifies shell,
title, active-area, Sign Out success/failure, and Account-width behavior. All 1,235 runnable Vitest
tests, TypeScript, the production build, and ESLint with zero errors and the 12 existing warnings pass.
Rendered browser QA remains unrun because the Browser plugin and Playwright are not installed; no new
dependency was added without approval.
The confirmed single-college enrollment boundary is Supabase invitation-only, superseding the
implemented shared-code self-registration flow. Public registration and its deployment secret are
removed; verified invited instructors complete a unique username and password in the app
before receiving a fixed Instructor profile. Username/password sign-in, recovery, cookie-based session
refresh, protected Instructor entry, password change, current-device sign-out, and the initial Account
UI otherwise remain. The callback is local-redirect-only and protected pages re-check the live
enabled profile. Standard Supabase Dashboard invitations now consume the implicit-flow credential
fragment, remove it from browser history before asynchronous work, persist the cookie-backed session,
and verify the live invited identity before opening setup. Partial, expired, provider-error, and
non-invited flows fail generically; an already-persisted cookie session remains a supported retry path.
Production host-token Rooms were retired when the Phase 4 application and migration were deployed
together. Account-owned Rooms are production-verified. The Account
authorization foundation includes protected profiles keyed by Auth user ID, normalized
case-insensitive usernames, reserved Administrator names, live enabled/Administrator helpers,
least-privilege grants, RLS, and 24 executable allow/deny database policy assertions. The Account
authorization foundation, scenario ownership, Room ownership, and persistent Reports are complete
and deployed to the linked Supabase project. Phase 6 implements the canonical `/instructor`
Console plus shared Console/Reports/Account navigation and full cross-area browser verification. On
2026-09-06, direct schema inspection proved the trainee
action-clock and Attempt-name migrations had already been applied manually, their two missing history
records were repaired, and the Account authorization migration was then applied normally.
Supabase Auth and a
single-college boundary are accepted. Only instructors and administrators receive Accounts; trainees
keep the existing room-code-and-nickname flow. Product operators invite approved instructors through
Supabase; recipients complete a unique case-insensitive username and password, while sign-in presents
username/password through a server-only email-identity bridge. The only roles are Instructor and
Administrator. `Zoid`, `Branden`,
and `Jeremy` are reserved, deliberately provisioned Administrators whose authority is bound to
immutable authenticated identities. `My Scenarios` is strictly owner-only; `Templates` is a separate
fixed area with folders that every Account can read and only Administrators can mutate. Rooms are
owned and controlled by their creating Account rather than permanently authorized through host-token
URLs. Account admission and Administrator-role changes stay outside the app with Product operators
using Supabase invitations and immutable-ID role assignment. Email recovery is self-service. Templates can start Rooms directly, modified
Templates save only as independent Personal copies, and the current global library migrates intact
into Templates. Rooms remain temporary. Each Attempt creates one autosaving, Account-owned
Evaluation record across all trainees; it remains Incomplete until New Attempt or End Room. Its
optional Student names are separate from join nicknames. Reports are owner-only, searchable, editable,
copyable, permanently deletable, and retained until deletion; export, sharing, grading, comments, and
bulk operations are deferred. Student-name lists allow 100 duplicate-capable entries of 100 characters;
records keep immutable scenario snapshots, and abandoned Incomplete records may be manually completed
without changing their timeline. The application has no public signup surface, CAPTCHA, custom signup
throttling, or shared registration secret. Passwords have an eight-character minimum and no composition
or rotation rules. Usernames use 3–30 restricted characters and are claimed during verified invitation
acceptance. The Account page exposes identity/role, password change,
and current-device Sign out while email and username changes remain operator-assisted.
An Account may use several devices but has one active Room and one controlling device; native
persistent Supabase sessions have current-device Sign out and no custom inactivity timeout. Explicit
takeover makes the prior controller read-only, and Rooms expire 24 hours after creation. Authorization
uses an immutable-ID Account profile plus least-privilege grants, RLS, and server checks; usernames,
user-editable metadata, and stale JWT role claims are not authoritative. Disabled Accounts lose
existing-session access immediately. Legacy
host-token Rooms and their reports are deleted at rollout. Disabling an Account ends its Room but
preserves owned data; deliberate permanent deletion removes its Personal scenarios and Reports while
Templates remain. Attempt naming is preserved under Account ownership and the current browser's
rotating controller fence.
Student names remain free-form without inline privacy guidance. Scenario deletion cannot affect live
Rooms, Personal copies, or report snapshots, and Template mutations receive an operator-only
Supabase audit log.
Owner-driven report retention is provisional until the college approves its production policy, and
custom SMTP is an external-launch requirement. Reports are newest-first, paginated by 25, searchable
and filterable, with UTC storage and Toronto display time. Student data requests flow through the
college to Product operators. The three initial Administrators are manually provisioned by immutable
ID. Invitation links enter a verified acceptance state, while expired invitations are resent by Product
operators through Supabase. Six-character unambiguous Room codes are case-insensitive and failed
join guesses are throttled. Report deletion has a named permanent-confirmation dialog, and consequential
report mutations are audited without copying Student data. Development and production are isolated;
SMTP outages never create a password bypass. The current production choice is Supabase Free with
independent logical dumps and a pre-classroom readiness review; Pro remains optional. `/instructor`
holds Console, Reports, and Account, with an empty virtual-Folder-1 Personal library for new Accounts.
Audits retain one year during the pilot. Technical incidents belong to Product operators and
notification decisions to the college's named privacy contact. Rollout uses a maintenance window,
pre-migration backup, ordered migration/provisioning checks, a comprehensive acceptance gate, and a
forward-fix boundary once new Account data exists. Backup schedule/custody, Free-tier pre-class
readiness, feature gating, alerts, and implementation sequencing are now settled: nightly encrypted
whole-project backups retain 30 daily/12 monthly copies with two-developer alerts and quarterly restore
rehearsals; Free requires a smoke test before classes following five-day breaks; a server-only gate
controls cutover; critical operational failures are sanitized and emailed; and work follows seven
tested dependency-ordered phases. The user explicitly confirmed the complete contract as the shared
implementation baseline and authorized implementation. The revised Phase 1/2 gate passed 24 pgTAP
assertions, local schema lint, all 1,151 Vitest tests with one opt-in integration test skipped,
TypeScript, ESLint with zero errors and the 12 pre-existing warnings, and the production build. A
localhost smoke test returned HTTP 200 for health, invitation-only login, and invite handoff, while
both retired public registration routes returned HTTP 404. The earlier isolated Auth check proved
confirmed sign-in, enabled self-read, and immediate RLS denial after disablement; its invite-based
replacement remains opt-in. Multi-tenancy stays deferred. Phase 3 Personal/Template
scenario ownership is deployed and production-verified. Production health, invitation routing, real Dashboard
invitation acceptance, and a subsequent username/password sign-in are confirmed; legacy API keys are
deactivated after those replacement-key checks passed.
Phase 4 is deployed and production-verified. Its migration deliberately deletes
legacy temporary Rooms, requires immutable Auth-user ownership and a 24-hour expiry, enforces one
waiting/active Room per Account, protects controller hashes from browsers, and transactionally ends
live Rooms/current attempts when an Account is disabled. Room creation now lives only in the
authenticated console. Same-Account secondary devices continue observing the roster/report in
read-only mode and can take control only through an explicit confirmation that rotates the local
controller token; the former controller is rejected immediately for every mutation. Trainee joining
remains Account-free. A clean migration replay, all 83 pgTAP assertions, schema lint, 1,180 Vitest
tests with one opt-in integration test skipped, TypeScript, ESLint with no errors and the 12 existing
warnings, production build, and rendered public/protected-entry checks pass. The complete production
owner/controller/trainee checklist passed after the matching branch and migration were deployed.
Phase 5 adds durable owner-scoped Evaluation
records, immutable per-Attempt scenario snapshots, autosaved report timelines, Student-name metadata,
search/edit/manual-completion/permanent-deletion workflows, and privacy-minimized mutation auditing.
A clean replay of every migration, 118 pgTAP assertions, error-level Supabase schema lint, all 1,199
Vitest tests with one opt-in integration test skipped, TypeScript, ESLint with zero errors and the 12
existing warnings, the production build, and rendered local report workflow checks pass. The Phase 5
application was merged and its `20260907135753_phase_5_persistent_reports.sql` migration was applied
on 2026-09-07. Phase 6 is complete locally on `phase/6-instructor-navigation`. Rendered live-Room QA
corrected the initial no-migration expectation: a clean installation lacked explicit service-role
privileges on four temporary Room tables. The new
`20260907163444_grant_live_room_service_access.sql` migration revokes all browser access and grants
only the server operations actually used. A clean migration replay, 120 pgTAP assertions, error-level
schema lint, database advisors with no error-level findings, 1,203 Vitest tests with one opt-in
integration test skipped, TypeScript, ESLint with zero errors and the 12 existing warnings, the
production build, and rendered compact cross-area/live-Room checks pass. Production is unchanged;
the matching application and corrective migration must deploy together, followed by the wider
desktop smoke test unavailable in the current 319×748 browser surface.
The Phase 3 migration converts the existing library to shared Templates in place, adds immutable
Auth-ID Personal ownership, enabled-account reads, Administrator-only Template writes, scoped
ordering, cascade cleanup, explicit Data API grants, and an operator-only content-free Template audit
log. Scenario APIs now use the caller's cookie-backed Supabase session so RLS is authoritative. The
console renders fixed My Scenarios and Templates areas, read-only Instructor Template controls,
Personal-copy saves, and confirmed Administrator shared edits. A clean local migration replay,
54 pgTAP assertions, schema lint, 1,162 Vitest tests with one opt-in integration test skipped,
TypeScript, ESLint with zero errors and 12 pre-existing warnings, the production build, and rendered
Administrator/Instructor browser flows pass. Global local signup remains disabled while the email
provider stays enabled; invited login returned 200 and anonymous signup returned 422. The matching
application branch and ownership migration were deployed together on 2026-09-07. The ten production
rollout checks passed, including health, Personal/Template separation, Instructor copying, and
sign-out/sign-in persistence. The existing verified `JeremyTest` Auth identity was deliberately
renamed to reserved username `Jeremy` and assigned Administrator authority by immutable user ID;
production sign-in and Administrator-only shared Template controls passed. Phase 4 account-owned
Room authorization is production-verified; Phase 5 persistent Reports are deployed; Phase 6
navigation and cross-area verification are production-verified after all eight acceptance sections
passed. Phase 7 production operations and launch-readiness tooling are complete locally on
`phase/7-production-operations`. The branch adds safe-off server maintenance mode, a rendered
maintenance response, nightly encrypted Supabase logical backup automation with 30 daily/12 monthly
retention, guarded non-production restore rehearsals, two-developer sanitized failure alerts, a
one-year Account-audit retention primitive, and the complete SMTP/backup/deployment/incident/
offboarding/release runbooks. A clean migration replay, 128 pgTAP assertions, schema lint with no
errors, hosted advisors with no error-level findings, 1,232 Vitest tests with one opt-in integration
test skipped, TypeScript, ESLint with zero errors and the 12 existing warnings, Bash syntax checks,
production build, rendered maintenance QA, exact maintenance HTTP responses, and normal-mode smoke
checks pass. No production migration or external configuration was changed. Before classroom launch,
operators must merge and deploy the reviewed migration/application together, set
`MAINTENANCE_MODE=false`, configure custom SMTP/DNS and the GitHub backup/alert secrets, run the first
encrypted backup and non-production restore rehearsal, name the college privacy contact, rerun hosted
advisors, and complete the release-acceptance checklist. Supabase's remaining leaked-password warning
is a documented Pro-only hardening option; INFO-only server-table and legacy index notices are tracked.
The linked database now reports complete local/remote
migration parity and a no-op migration dry run; direct verification confirmed both Account tables,
all three reserved usernames, RLS, the self-read policy, protected client grants, triggers, and private
authorization helpers. `/api/health` returned HTTP 200 with `database: ok` after deployment.

**Phase 17 floating-corner enhancement — COMPLETE (2026-09-05).** The Floating Spectator is now
pointer-draggable and keyboard-movable across all four safe-area-aware viewport corners while
preserving the existing single player, projection poll, and presentation lifecycle. Threshold,
containment, quadrant snapping, cancellation, accessibility, lifecycle, and reset behavior are
covered by 1,091 passing tests. The TypeScript production build, ESLint, and a live 1280×720
instructor room with real pointer and keyboard movement all pass with clean browser logs.

**Operational health check — CORRECTED (2026-09-05).** `/api/health` now checks the protected
`sessions` table with the server-only Supabase secret client. It no longer depends on the deliberately
revoked anonymous table grant, and route regressions cover healthy, degraded, and configuration-error
responses without exposing the secret or reopening room-code reads. The live local endpoint returns
HTTP 200 with `database: ok`; all 1,140 tests, TypeScript, and ESLint pass.

**Phase 17 presentation-mode enhancement — COMPLETE (2026-09-04; corners updated 2026-09-05).** The
Embedded Spectator switches among Docked, a movable corner-pinned Floating mini-player, and
browser-native Fullscreen while
preserving one selected-only polling path and an inert uniformly scaled monitor. Permanent accessible
controls, return-mode and focus restoration, failure feedback, responsive safe-area sizing, reduced
motion, and Stop from every mode are verified by tests and a real instructor/trainee browser flow.

**Phase 17 — Instructor Spectator View — COMPLETE (2026-09-03).** The silent, inert Wagami X/Z
semantic projection, standalone route, and Embedded Spectator are complete. The Instructor Console
replaces Live Evaluation with one transiently selected, uniformly contained spectator beside a
half-width room-control panel. Selected-only polling, safe switching, waiting/offline/ended states,
and the retained standalone route are verified.

**Phase 10 enhancement — folder scrolling and persistent folder order — COMPLETE AND DEPLOYED
(2026-09-03).** Expanded scenario folders grow the library without a nested scrollbar. Folders now
support persistent drag/drop and Up/Down ordering with alphabetical backfill, append-on-create,
rename stability, delete compaction, rollback, and active-attempt locking.

> **Deployed:** On 2026-09-03 the linked database migration history was reconciled after direct schema
> verification, then `20260902160000_strip_history_route_geometry.sql` and
> `20260903222810_instructor_spectator_and_folder_order.sql` were applied. Post-deployment queries
> confirm complete migration parity, non-null unique folder positions, the reorder RPC, the RLS-secured
> projection table, no anonymous projection access, and zero remaining historical route polylines.
> The live `/api/scenario-folders` endpoint returns HTTP 200 with ordered folders and positions.

**Phase 15 — Instructor Change Expansion — CODE COMPLETE (2026-09-03).** Every instructor change in
the Report tab opens. The opening change shows the whole scenario as sent, grouped Dispatch / Patient
/ Device with empty fields absent; every later change shows only the fields that Send moved, before
→ after. The diff now covers everything the instructor sets: waveforms, defibrillator model, the
dispatch card field by field, route addresses, and response time. Summary lines stay one line, with
the dispatch card and route collapsed to a count. Stacked on Phase 14 (PR #77).

**Phase 14 — Sync & Queue — COMPLETE (2026-09-03), MIGRATION APPLIED.** A trainee action
pressed during a wifi drop now waits on the device and lands in the evaluation record at the moment
it was pressed, against the state version the monitor was showing, flagged `← n behind` when that
trailed what the instructor had sent. The trainee's poll names the version it holds and an unchanged
room answers in ~300 bytes instead of the whole blob. `docs/adr/0003` and `docs/adr/0004`.

> Migration `20260903120000_trainee_action_clock.sql` is applied (verified 2026-09-03). Live check
> against the running app and the live database: `?since=` answers an unchanged poll in 315 bytes
> against 13,676; a claim at the older version is stored as claimed while the room is ahead; a
> claim ahead of the room gets its 400; a press replayed after a later Send renders at its press
> time on the trainee's clock and carries `← 1 behind`.

**Phase 13 — Evaluation report tab — COMPLETE (2026-09-02).** The Instructor Console has a fifth
tab rendering one chronological stream of an attempt: each trainee action with its payload against the
patient state in force when it was taken, with the instructor's own changes interleaved as diffs of
consecutive sent states, and any row whose patient was in alarm outlined in red. Scoring stays with
the evaluator. Reads the `/review` poll the console was already running, so no new endpoint and no
extra request on the hot path.

> **Migrations `006` and `007` are applied** (verified against the live project on 2026-09-02:
> `session_state_history` holds 255 rows, `student_events.state_version` exists and is stamped on
> current runs, `vitals_snapshots` is dropped, and `anon` is refused on `sessions`/`scenarios`).
> Drills recorded before those migrations keep a null `state_version` — 588 of 795 events — and
> render `[dispatch]`, which is correct rather than a fault.

**Phase 12 — Evaluation record & database hardening — COMPLETE, MIGRATIONS APPLIED.**
Drills now store a reviewable per-trainee, per-attempt timeline: every instrumented action with a
millisecond timestamp, joined to the patient state in force when it was taken. Scoring/rubric logic
is deliberately out of scope — the evaluator reads the timeline and judges.

> **Deployed.** Migrations `006_close_legacy_policies.sql` and `007_evaluation_record.sql` are live,
> confirmed by direct schema probe on 2026-09-02: history rows are being written, `state_version` is
> stamped at insert, and the new event kinds pass the check constraint.

**Wagami Z responsive visual redesign — COMPLETE.** The accepted code-native shell and live touchscreen now follow the approved reference on supported landscape displays, with safe-area-aware fixed-aspect scaling at usable CSS viewports of at least 1024×700. Portrait and undersized windows receive exact, state-preserving French blocking guidance. The power-only functional boundary, two-second centered-WAGAMI boot, live waveforms/vitals, PI and shock-count decoration, and inert non-power controls are preserved. iPad mini receives no special code or QA and is not certified, although it may render when it passes the same capability rule.

> Note: PLAN.md phases were re-scoped on 2026-05-10. The user opted to defer sessions and realtime to the end and start with a static monitor at `/` that has working menu navigation. Phases 2 (session routing), 7 (realtime), and 10 (scenarios) are deferred. The work below corresponds to a focused subset of PLAN.md phases 3 (static UI), 6 (defib only), and 9 (patient mode popup only).

---

## Completed
- [x] **Attempt names (2026-09-04):** each attempt can be named; the number stays and the name sits
      beside it in the Report tab picker, header, copied text, and console status line. New
      `session_attempts` table, `PATCH /attempt/[version]`, host-only rename field. 14 tests; 1085
      pass. Migration `20260904120000_attempt_names.sql` not yet applied
- [x] **Report BP fidelity (2026-09-04):** the patient-state column shows BP only once the trainee has
      taken a reading, holds it until the next one, clears it on a monitor reset, and raises no BP alarm
      without one. Reconstructed from `nibp_result` events, since the displayed value is trainee-local.
      8 tests; 1071 pass
- [x] **End Room feedback (2026-09-04):** a failed End Room request now shows why instead of leaving the
      console silently on the admin page; an already-ended room shows a `Room ended` notice with a way
      to create a new one; Sends and trainee actions on an ended room return 410. 4 tests; 1024 pass
- [x] **Phase 17 foundation — Spectator projection and standalone presentation — COMPLETE AND DEPLOYED:**
  - [x] Added a standalone host-authorized Spectator presentation without putting secrets in the URL
  - [x] Added versioned semantic monitor projections for dispatch, Wagami X/Z, power/boot, menus,
        modals, selections, defibrillation, NIBP, calibration, timers, and logs
  - [x] Added latest-only projection storage with per-page stream IDs, monotonic sequence rejection,
        immediate coalesced publishing, retry, one-second reads, attempt clearing, and room cleanup
  - [x] Added an isolated silent renderer with an inert pointer/keyboard/touch/focus boundary,
        spectator-fitted device layout, and status handling for waiting, trainee offline, spectator
        connection loss, new attempts, and ended rooms while preserving the latest valid frame
  - [x] Added ADRs 0005/0006, domain terminology, typed service/API routes, migration coverage, and
        explicit regressions for a 30-trainee roster and eight independently polling spectator views
- [x] **Phase 10 enhancement — folder scrolling and persistent folder order — COMPLETE AND DEPLOYED:**
  - [x] Removed the scenario library's fixed-height nested scrollbar so expanded folders grow into the
        Instructor Console's outer document scroll
  - [x] Added global persistent folder drag/drop and Up/Down controls, optimistic rollback,
        alphabetical migration backfill, append-on-create, rename stability, delete compaction, and
        active-attempt locking
  - [x] Added generated types, a service-role-only reorder RPC, typed service/API coverage, and UI,
        migration, rollback, and active-attempt tests
  - [x] Full verification: 992 tests, TypeScript, Supabase schema lint, ESLint with 0 errors and the
        12 pre-existing warnings, and the Next.js production build pass
- [x] **Phase 15 — Instructor Change Expansion — CODE COMPLETE:**
- [x] **Phase 15 — Instructor Change Expansion — CODE COMPLETE:**
  - [x] 15a `normalizeHistoryState` reads the waveforms, defibrillator model, every dispatch card
        field, the route addresses, and the response time; `diffStates` returns structured
        `FieldChange`s by explicit allowlist and never compares the dispatch clock's ids and
        deadlines, the route polyline / status / coordinates, the trainee's stamps, or the legacy
        CPR mirror. Extra slots count only once named. Dispatch fields use the console's own labels
        from `CALLER_INFO_FIELDS`; waveform names are defined in the timeline because the console
        has none
  - [x] 15b `summarizeChanges` names clinical, care, scenario, device, and timing changes and
        collapses the dispatch card to `dispatch card · n fields` and the route to
        `route · destination`, ending in `+n more` past six clauses. `sent (no clinical change)`
        becomes `sent (no change)`
  - [x] 15c `describeState` lays the opening state out by group with empty fields absent; the panel
        gives each instructor change with content a native disclosure button with `aria-expanded`,
        held per row id so it survives the poll. Action rows and no-change Sends have no disclosure.
        Copy is unchanged
  - [x] 16 new tests (8 diff groups and exclusions, 3 summary, 2 snapshot, 3 panel). All 1020 tests
        and TypeScript pass; ESLint 0 errors with the 12 pre-existing warnings; production build
        passes

- [x] **Phase 14 — Sync & Queue — CODE COMPLETE:**
  - [x] 14a `GET /state?since=<version>`: `getSessionStatus` reads only the version when the monitor
        names the one it holds and answers `{ unchanged: true }` without the blob; the sync hook sends
        `since` on every poll after the first and skips apply on an unchanged answer. Measured live:
        13,677 → 315 bytes per unchanged poll
  - [x] 14b `src/lib/actionQueue.ts` + `useStudentActionQueue`: replaces the fire-and-forget POST in
        `monitor/page.tsx`. Enqueue stamps press time, a monotonic sequence, the on-screen state
        version, and the last measured clock offset; drain is in order with 1s→30s backoff; network
        and 5xx retry forever, 4xx drops and logs so one bad action cannot jam the rest
  - [x] 14c three nullable columns on `student_events` (`occurred_at_client`, `capture_sequence`,
        `clock_offset_ms`); `recordStudentEvent` stores them, `getReview` returns them, the generated
        Supabase types know them
  - [x] 14d a claimed `stateVersion` is accepted at or below the current version and rejected with
        400 above it or before any Send; older clients that claim nothing are stamped as before
  - [x] 14e the timeline orders by corrected client clock when present (client + offset), falls back
        to `occurred_at`, tiebreaks on `capture_sequence`, and marks each action with how many Sends
        the monitor had missed; the panel renders `← n behind` in amber and copies it
  - [x] `useSessionMonitorSync` now returns `{ vfDisplaySync, getClock }` and measures the clock
        offset on every poll rather than only when state changes
  - [x] 38 new tests (7 queue, 3 queue hook, 3 sync hook, 10 service, 3 state route, 3 student-event
        route, 9 timeline, 1 panel). All 1004 tests and TypeScript pass; ESLint 0 errors with the 12
        pre-existing warnings; production build passes. Live, after the migration: `?since=`, the
        bounded claim, the 400 on a claim ahead, and the `← 1 behind` marker all verified end to end

- [x] **Phase 13 — Evaluation report tab — COMPLETE:**
  - [x] `src/lib/evaluationTimeline.ts` assembles the review payload into one ordered stream: `t+`
        offsets from `participant_attempts.started_at` (falling back to the first recorded row),
        each action resolved to its `session_state_history` state via `state_version`, and alarm
        channels per row from the existing `getActiveAlarms` thresholds
  - [x] Instructor rows interleaved from diffs of consecutive sent states — rhythm, numeric vitals,
        channel toggles, CPR mode, monitor reset — so an action's position relative to a change is
        visible rather than remembered
  - [x] `EvaluationReportPanel` renders the monospace stream with red-outlined alarm rows, the
        alarming channel in alarm red, an attempt selector, a truncation banner, and copy-to-clipboard
  - [x] Fifth `Report` tab in `AdminPage`; the existing 2.5s `/review` poll now keeps `stateHistory`,
        `attempts`, and `truncated` instead of discarding them. Past attempts are read once on
        selection so the live roster keeps tracking the run in progress
  - [x] Extracted `RHYTHM_LABELS` into `src/lib/rhythmLabels.ts` so the report and the rhythm
        selector name rhythms identically
  - [x] **13f finish work** (decided in the 2026-09-02 grill): `updateSessionState` strips the
        route polyline from the history write — the live `session_state` keeps it for the trainee's
        map; `/review?include=history` and the console sends it only while the Report tab is open;
        `getReview` issues its four reads with `Promise.all`; migration
        `20260902160000_strip_history_route_geometry.sql` clears the polyline from the 261 existing
        rows. Undoes the 823 KB/poll the Report tab had added to the console's 2.5s poll
  - [x] 54 new tests (32 timeline units, 11 panel components, 2 admin tab, 7 service, 2 route).
        All 944 tests and TypeScript pass; ESLint reports 0 errors with the 12 pre-existing
        warnings; the Next.js production build passes. Rendered browser QA is still outstanding —
        jsdom needed ~3.5 min to initialise on this host, so the suite was run under
        `--pool=vmThreads`, and no browser pass was made

> **Migration not yet applied:** `20260902160000_strip_history_route_geometry.sql` is written but
> has not been run against the live project. New history rows are already lean; the 261 rows from
> before carry the polyline until it runs.

- [x] **Expanded Instructor Console width — COMPLETE (2026-09-02):** Widened all four tabs with 24px side gutters, retaining the current main layout with Vitals on the left, equal-height SAMPLE/OPQRST stacked on the right, existing control sizing, column proportions, and compact height-based spacing. All 62 targeted tests pass. Rendered laptop checks confirm the column geometry and no horizontal overflow; 1080×700 compact geometry also passes. The expanded controls retain vertical scrolling when the viewport is shorter than the approximately 829px content bottom.
- [x] **State-driven Wagami X vital placement — COMPLETE:**
  - [x] Removed the idle `APPL ELECT.` banner, its three lower boxes, and the dormant Apply Electrodes component/rendering path from Wagami X
  - [x] Added the resting vital layout: FC, PNI, EtCO2, and SpO2 render as four equal, full-featured cells in the fixed 110px bottom region before the first accepted physical Analyze or Charge action
  - [x] Analyze, CPR, result, Charge, charged, shock, and delivered states use the existing 96px right vital column; Charge preserves both the energy scale and readable defib status content beside the vitals
  - [x] Power-off/on, monitor reset, and New Attempt restore resting placement; the minus control, 12-lead, overlays, navigation order, Enter-on-PNI, shell controls, and Wagami Z behavior remain unchanged
  - [x] Added ADR 0002, glossary definitions, component contracts, and monitor integration regressions; all 898 tests and TypeScript pass, ESLint reports 0 errors with 12 pre-existing warnings, and the Next.js webpack production build passes
  - [x] Rendered QA passes at `1280×720` and `1024×768`: resting, Analyze, Charge, collapse/restore, and 12-lead transitions have no clipping or viewport overflow, and the browser console is clean
- [x] **Expanded Instructor Console Monitor & Patient SNS — COMPLETE:**
  - [x] Added a centered Monitor-only breakout up to approximately `1152px` at landscape viewports of at least `1280×800`, using an approximately `8:5` split that grows Vitals to about `700px` while SAMPLE/OPQRST remains about `438px`; other tabs retain the existing console width
  - [x] Horizontally centered and enlarged Vitals inputs/toggles, ECG, CPR, timed-vitals buttons, SNS cards/options, checklist buttons, textareas, text, and icons, with 44px checklist/CPR targets, 56px timed-vitals buttons, and 96px SNS surfaces at the expanded breakpoint
  - [x] Preserved compact complete-tab fit at `1080×700` and `1280×720`, the landscape-iPad behavior, equal-height checklist panels, bounded overflow, and the sub-1024/portrait stacked fallback; tightened outer spacing through 900px height so `1440×900` also fits completely
  - [x] All 890 tests and TypeScript pass; ESLint reports 0 errors with 12 pre-existing warnings; the Next.js webpack production build passes; Playwright Chrome QA passes at `1440×900`, `1280×720`, `1080×700`, and stacked `900×900` with no horizontal overflow, framework overlay, or console errors
  - [ ] Default Turbopack production build — blocked on the host environment because its spawned PostCSS process receives `EPERM` while resolving `C:\Users\Jeremy`; webpack production build passes
  - [ ] Real iPad 8th-generation Safari device pass — pending device availability; compact browser-viewport behavior is unchanged and passes
- [x] **Calibrated Wagami X EtCO2 channel semantics — COMPLETE:**
  - [x] Calibrated instructor-Off EtCO2 displays numeric `0` and keeps the selected normal or expanded EtCO2 row visible with the standard dashed disconnected trace
  - [x] Calibrated instructor-On EtCO2 displays the configured value and live capnogram, including a connected configured value of `0`
  - [x] Instructor On/Off and value changes apply immediately after calibration without another loading pass; changes during calibration resolve from the latest confirmed state at completion
  - [x] Vital Log samples the trainee-visible calibrated EtCO2 value: `0` while instructor-Off and the configured value while On
  - [x] All 889 tests, TypeScript, ESLint (0 errors; 12 pre-existing warnings), and the Next.js production build pass; rendered Off→On→Off browser interaction QA confirms `0`/dashed and `35`/live transitions with no recalibration, console errors, or framework overlay
- [x] **Compact two-column Instructor Console Monitor & Patient SNS — COMPLETE:**
  - [x] Split the local and live Instructor Console tab into an approximately 55/45 Vitals and SAMPLE/OPQRST composition, with equal-height right panels, compact fixed-height fields, bounded note/result overflow, and a stacked portrait/sub-1024 fallback
  - [x] Compressed Vitals without changing its clinical grouping, and tightened the shared console shell for supported short MacBook/desktop and iPad landscape heights
  - [x] Replaced always-visible Pulse/Respiratory measurement actions with full-card hover, focus, and single-card pinned-touch disclosure; countdowns reuse the same surface with persistent amber styling and reduced-motion support
  - [x] Fixed Tap so a first activation reveals a fresh snapshot and a second activation hides that result without clearing its confirmed state
  - [x] All 882 tests, TypeScript, ESLint (0 errors; 12 pre-existing warnings), and the Next.js production build pass; rendered `1080×700`, `1280×720`, `1440×900`, iPad 8 landscape `1024×768`, and portrait-stack QA pass with no horizontal overflow or browser-console errors
  - [ ] Real iPad 8th-generation Safari device pass — pending device availability; the exact `1024×768` browser viewport passes
- [x] **Instructor Console scenario safety and row actions — COMPLETE:**
  - [x] Renamed the visible console, removed obsolete local-monitor guidance, Supabase subtitle, and Caller Info Analyse/action copy
  - [x] Moved Save/Delete onto every saved row with loaded-and-dirty Save gating, isolated unloaded-row deletion, and retained loaded-scenario values as a draft after deletion
  - [x] Added explicit selected scenario drafts, virtual empty-library Folder 1 behavior, title-only dirty support, and local confirmed draft deletion
  - [x] Replaced every Scenarios-tab browser confirmation with the reusable amber/dark/cyan accessible dialog, including backdrop/Escape cancellation and focus containment/restoration
  - [x] Locked folder and scenario mutations during active attempts and confirmed the row layout has no horizontal overflow at the 1024px minimum
  - [x] All 869 tests, TypeScript, ESLint (0 errors; 12 pre-existing warnings), and rendered 1366×768/1024×768 browser QA pass with a clean console
- [x] **Phase 12 — Evaluation record & database hardening — COMPLETE (migrations applied):**
  - [x] Added append-only `session_state_history` written beside (never on) the student poll path, so the patient state behind every action survives the next Send
  - [x] Stamped `student_events.state_version` at insert, linking each trainee action to the exact state it was taken against
  - [x] Instrumented the 11 remaining trainee controls, including the BP button, which had only ever written to the trainee's local store
  - [x] Pinned `student_events.kind` with a DB check constraint and server-side validation; it was free text from the request body
  - [x] Collapsed duplicate participants, added `unique (session_id, lower(nickname))`, and made `joinSession` reclaim by nickname (trade-off recorded in PLAN.md 12e)
  - [x] Scoped `getReview` by attempt with a truncation-reporting limit and a covering index; began writing `participant_attempts.completed_at`
  - [x] Dropped the seven anon-readable policies left by migration 001 and the unused `vitals_snapshots` table; health check repointed onto `sessions`
  - [x] All 851 tests, TypeScript, ESLint (0 errors; 12 pre-existing warnings), and the Next.js production build pass
  - [ ] **Migrations 006 and 007 applied to the live Supabase project** — outstanding
- [x] **Wagami Z responsive visual redesign — COMPLETE:**
  - [x] Rebuilt the shell, faceplate, bezel, controls, lower body, speaker, and touchscreen from normalized reference landmarks using one uniformly contained fixed-aspect composition
  - [x] Added safe-area and live visual-viewport fitting for landscape iPads and the 1920×1080 development target, plus exact state-preserving French fallbacks for portrait and undersized viewports
  - [x] Preserved live clinical semantics and power behavior while aligning the French navigation, four waveform/vital rows, PI, shock count, status decoration, and bottom action grid to the approved reference
  - [x] All 822 tests pass; TypeScript and the production build pass; ESLint has zero errors (12 existing warnings); rendered 1024×768 and 1180×820 landscape QA, portrait/narrow fallback QA, power cycling, inert controls, live-value rendering, and state restoration pass
- [x] **Wagami Z live monitor surface — COMPLETE:**
  - [x] Replaced the post-dispatch placeholder and `/?dev=2` shortcut with one production Wagami Z component, keeping normal dispatch entry powered off and the direct shortcut powered on
  - [x] Added the complete WAGAMI/Z shell, French DEA monitoring screen, live ECG/EtCO2/SpO2 and FC/EtCO2/SpO2/PNI presentation, visual-only alarms, fixed lanes, and immediate confirmed PNI
  - [x] Added the repeatable two-second centered-WAGAMI boot cycle and made every non-power touchscreen/physical control accessible, visibly interactive, and inert
  - [x] Added component and route regressions; all 817 tests pass with four workers, TypeScript and the production build pass, ESLint has zero errors (12 existing warnings), and rendered 1242×736 browser QA has a clean console and no framework overlay
- [x] **Wagami Z visual/workflow reference research — COMPLETE:**
  - [x] Captured and inspected representative frames across power, manual energy/charge/shock/disarm, AED analysis/CPR/pause, advanced monitoring, and mode switching
  - [x] Identified AED-paused advanced monitoring as the supplied still image's baseline state and documented the current inert-control boundary versus future workflows
  - [x] Preserved the captured frames locally under `screenshots/wagami-z-video/`, excluded source/reference media from version control, and retained the findings as timestamped original writing in `docs/research/wagami-z-defibrillation-video.md`
- [x] **Wagami defibrillator model selection — COMPLETE:**
  - [x] Added a fourth Defibrillators tab with accessible Wagami X/Z choices, Wagami X defaults, dirty/pending/confirmed styling, Start gating, active-attempt locking, and New Attempt preservation
  - [x] Added backward-compatible scenario and shared-session model state without a database migration; Wagami Z alone is meaningful scenario content and active attempts block scenario load/unload
  - [x] Preserved the full caller-info dispatch flow for Wagami Z before its centered black Work In Progress screen, while `/?dev=1` remains Wagami X and `/?dev=2` opens Wagami Z directly
  - [x] All 811 tests, TypeScript, ESLint (0 errors; 12 pre-existing warnings), the Next.js 16.3 webpack production build, and rendered 1366×768 browser QA pass with clean consoles and no framework overlays
- [x] **Independent scenario folders and SNS active styling — COMPLETE:**
  - [x] Decoupled folder expansion from the selected save destination, with all-collapsed startup, independent multi-open toggles, closed-target highlighting, tab-switch persistence, new-folder opening, and deletion fallback
  - [x] Isolated scenario lists and reorder/move operations per folder so simultaneous expansions remain consistent without API, database, snapshot, or realtime changes
  - [x] Replaced confirmed SNS solid-green fills with black surfaces and exact ECG-green borders, masked icons, and labels while preserving inactive, amber pending, and slider behavior
  - [x] All 794 tests, TypeScript, ESLint (0 errors; 12 pre-existing warnings), the Next.js 16.3 webpack production build, and rendered 1366×768 browser QA pass with clean console/framework state
- [x] **Dev console actions and automatic VF/VT heart rate — COMPLETE:**
  - [x] Moved the shared Save/Send row immediately above the three-tab strip and preserved the existing staged Save → Send workflow
  - [x] Centralized VF/VT enforcement across direct, batch, timed, scenario, reset, and hydration paths, including FC activation, locked controls, interaction-scoped manual restoration, and 80 fallback
  - [x] Added visible-only inclusive VF randomization on the 1.9-second flash cadence, deterministic room synchronization from version/server time, fixed underlying consumers, CPR precedence, and fixed VT 220 behavior
  - [x] All 791 tests, TypeScript, ESLint (0 errors; 13 pre-existing warnings), the Next.js 16.3 webpack production build, and rendered desktop browser QA pass with clean admin/monitor consoles and no framework overlays
- [x] **Combined Monitor & Patient SNS admin tab — COMPLETE:**
  - [x] Renamed Monitor to Monitor & Patient SNS, removed the Patient Information tab, and placed SAMPLE/OPQRST immediately below Vitals
  - [x] Moved Pulse, Respiratory, and Skin/Extremities into an equal-width horizontal row inside Vitals while retaining Scene/Environment with the body map
  - [x] Preserved the remembered ECG rhythm and menu highlight while off, removed Normal and the shared Reset control, and retained New Attempt as the full live-session reset
  - [x] All 76 focused tests and 774 full-suite tests, ESLint, production build, and rendered admin interaction QA pass with a clean browser console
- [x] **Caller Info minimized default — COMPLETE:**
  - [x] Caller Info now starts collapsed on each mount/page load, expands through the existing accessible `+` control, and remains non-persistent
  - [x] Component and admin integration regressions cover the collapsed default and explicit expansion before editing
  - [x] Focused tests and rendered 1280×720 reload/interaction QA pass with a clean browser console
- [x] **Scenario reorder constraint-resolution hotfix — COMPLETE:**
  - [x] Schema-qualified the deferrable folder-position constraint inside the empty-search-path reorder RPC
  - [x] Deployed migration `20260820194954`, verified matching local/remote history, and exercised the real API with a no-op reorder returning 200 and all four positions intact
  - [x] Focused migration/service/API tests pass; linked schema lint has no errors and Supabase advisors report no error-level issues
- [x] **Scenario library organization update — COMPLETE:**
  - [x] Retired General's protected status while preserving its data; every folder can be renamed or deleted, with confirmation for non-empty cascade deletion and an empty-library state
  - [x] Added atomic, service-role-only reorder, cross-folder append, and empty-library `Folder X` save operations with persisted per-folder positions
  - [x] Replaced Load buttons with accessible row load/unload toggles, added drag/drop plus Up/Down ordering with optimistic rollback, and made the complete Caller Info editor collapsible
  - [x] All 770 tests, TypeScript, Supabase schema lint/advisors, ESLint, production build, and rendered 1024×768/1366×768 interaction QA pass; migration `20260820192736` is deployed and verified remotely
- [x] **Vercel scenario-service test type fix — COMPLETE:**
  - [x] Removed the unsupported explicit generic from Vitest's `toMatchObject` matcher and the now-unused test import
  - [x] Focused service tests, `tsc --noEmit`, and the complete Next.js production build pass
- [x] **Folder-based Supabase scenario library — COMPLETE:**
  - [x] Renamed Caller Info to the default Scenarios tab and added the fixed-height folder accordion above the preserved Caller Info editor
  - [x] Added immutable General behavior, custom folder CRUD, updated-first rows, drag/drop plus accessible moves, and atomic move-to-General folder deletion
  - [x] Added versioned full-authoring snapshots, direct stage-only restoration across all four tabs, dirty/reverted comparisons, and green Save/red Delete scenario actions
  - [x] Added RLS-protected `scenario_folders` and `saved_scenarios` tables, concurrency-safe number allocation, typed server-only CRUD APIs, and a centralized future authorization gate
  - [x] All 757 tests, Supabase schema lint, ESLint, production build, and rendered 1024px admin QA pass; migration `005` is deployed and verified remotely
- [x] **Two-stage NIBP focus and consistent monitor modal styling — COMPLETE:**
  - [x] Every NIBP data row moves from its label to a combined right-side value focus; Enter/Back returns to the label before Back can close the modal
  - [x] Alarm limits and SmartCuf remain read-only, Mode toggles with either arrow, and Interval moves larger/smaller with wrapping while scheduler changes stay live
  - [x] Patient Info, NIBP, and Event Log share white headers, the green modal surface, centered value cells, blue focus, and boxed Exit/pagination actions without changing Vital Log
  - [x] All 730 tests, ESLint, production build, and rendered 1024×768/1366×768 physical-control and visual QA pass; all eight Event Log rows remain visible at the minimum viewport
- [x] **NIBP settings modal and automatic cuff mode — COMPLETE:**
  - [x] Selecting PNI with the outer-shell navigation cluster and pressing Enter opens a reference-matched NIBP modal with cyclic physical navigation and Back/Exit closure
  - [x] SYS/DIA/MAP limits and SmartCuf On are read-only; Mode cycles Manual/Automatic and Interval cycles 1, 2, 5, 15, 30, and 60 minutes
  - [x] Automatic mode reuses the Patient event cuff sequence on a recurring start-to-start schedule with manual deadline resets, busy-reading skips, inactive-BP dormancy, and power/reset cleanup
  - [x] Component, hook, controller, and full monitor-flow regressions pass; production build and rendered 1024×768/1366×768 browser QA pass
- [x] **Home toggle, chronological Event Log, and manual vital switches — COMPLETE:**
  - [x] Physical Home toggles Vital Log closed without weakening its mutual exclusion or changing the underlying monitor mode
  - [x] Call, medication, and Analyze rows form one oldest-first stream with exact capture ordering for new events and stable visible-time fallback for legacy rows
  - [x] Direct, universal auto-sort, and timed numeric edits preserve manual channel state through Save and Send, including SpO2/EtCO2 waveform connectivity
  - [x] Full unit/integration coverage, production build, and rendered monitor/admin browser QA pass
- [x] **Home Vital Log — COMPLETE:**
  - [x] Physical Home opens an Event Log-sized Vital Log containing immutable five-minute snapshots of trainee-visible FC, PNI SYS/DIA, EtCO2, and SpO2 values
  - [x] Missing values render as `-`; skipped timer boundaries catch up with the freshest snapshot, while power-off and refresh reset the timer-bound history
  - [x] Eight-row pages use cyclic Exit → Prev → Next navigation, physical Back closes the modal, and all competing monitor overlays are mutually exclusive
  - [x] Timer, sampling, component, controller, physical-button, and monitor-flow tests cover the feature; production build and rendered desktop browser QA pass
- [x] **Cyclic modal navigation and Exit controls — COMPLETE:**
  - [x] Patient Info cycles Age → Sex → Exit in both directions; its former arrow now reads Exit and Enter closes only the panel
  - [x] Event Log opens on Exit, cycles Exit → Prev → Next with wrap-around, keeps disabled page actions selectable no-ops, and preserves medication mode when Exit closes the log
  - [x] Single-page logs expose Exit as their sole selection; multi-page logs place Exit directly above Prev
  - [x] Controller, component, and physical-button page-flow tests plus rendered desktop browser QA cover both modal flows
- [x] **Medication and event-log navigation restoration — COMPLETE:**
  - [x] Right-side Move up / Move down / Enter controls retain normal monitor selection behavior while medication mode is open
  - [x] Open event logs temporarily own the navigation cluster: arrows select Prev/Next, Enter pages, single-page logs remain isolated, and first/last-page actions clamp safely
  - [x] Pagination uses the merged dispatch, medication, and analyze event count; closing the log restores normal navigation without leaving medication mode
  - [x] Controller, modal, and monitor-page regression tests plus rendered browser QA cover the complete flow
- [x] **Leaflet CSS Turbopack build fix — COMPLETE:**
  - [x] Moved the packaged Leaflet stylesheet import out of Tailwind-processed `globals.css` and into the root app layout
  - [x] Kept local Leaflet monitor theme overrides in `globals.css`
- [x] **Fresh admin state on room creation — COMPLETE:**
  - [x] Creating a room resets the persisted admin console (vitals, caller info, dispatch countdown, armed gate) before redirecting to the instructor page
  - [x] Prevents a previous drill's countdown/state from leaking into a new room
  - [x] Landing page test covers the reset
- [x] **Host token removed from instructor URL — COMPLETE:**
  - [x] The instructor page moves the `?host=` token into localStorage on first load and rewrites the address bar to the clean route
  - [x] Refreshes and revisits resume from localStorage, matching the student participant-token pattern
  - [x] Projected screens, browser history, and screenshots no longer expose room control
  - [x] Page tests cover URL-token capture/strip, storage resume, and the access-required screen
- [x] **Session expiry enforcement — COMPLETE:**
  - [x] Sessions past `expires_at` now read as `ended` everywhere via `applySessionExpiry` in the central session lookup
  - [x] Expired rooms get the existing ended-room UX for free: waiting-room notice, join rejection, monitor stops applying state, instructor status shows ENDED
  - [x] Start / Dispatch and New Attempt reject ended (including expired) rooms with 410
  - [x] Unit coverage for expiry mapping, boundary time, null/malformed `expires_at`, and already-ended sessions
- [x] **Session table RLS lockdown — COMPLETE:**
  - [x] Migration `004_drop_public_read_policies.sql` removes the anon-key public-read policies on `session_state`, `participants`, `participant_attempts`, and `student_events`
  - [x] RLS stays enabled; all session traffic continues through the service-role API routes, so no behavior changes
- [x] **Live student roster with heartbeat — COMPLETE:**
  - [x] Student monitor and waiting-room polls send the participant token as a presence heartbeat; the server stamps `last_seen_at` on each poll
  - [x] Participant lookups (join resume, event auth, heartbeat) go through an indexed `token_hash` equality query instead of scanning all participants (migration `003_participant_token_index.sql`)
  - [x] Instructor Students panel shows a connected/offline dot per student (8s window) plus per-attempt progress: Ack/Arr/Txp milestones and shock/medication counts
  - [x] Added `src/lib/sessionRoster.ts` helpers with tests, heartbeat-header hook coverage, and an admin roster rendering test
- [x] **Instructor New Attempt flow — COMPLETE:**
  - [x] Added host-token-protected `POST /api/session/[code]/attempt` that bumps `active_attempt_version`
  - [x] Instructor panel shows the current attempt number and a New Attempt button while the room is active
  - [x] Student monitors detect the attempt change, reset their local drill state, remount the monitor, and re-apply the latest shared snapshot
  - [x] Student events keep recording against the new attempt version, so per-attempt logs stay separated
  - [x] Route, hook, and admin page coverage added for the new-attempt flow
- [x] **Immediate session pushes for CPR override and Reset — COMPLETE:**
  - [x] In session mode, toggling CPR override pushes the shared state right away instead of waiting behind a disabled Send button
  - [x] Monitor-tab and Caller-Info-tab Reset push immediately via the shared `monitorResetVersion` bump, so student monitors clear without a Send
  - [x] Failed background pushes surface in the instructor session error banner
  - [x] Admin page tests cover CPR-toggle and Reset-triggered state POSTs
- [x] **Session shared-state stomping fix — COMPLETE:**
  - [x] `SharedMonitorState` now carries only instructor-authoritative fields; trainee-local progress (patient info, dispatch Acknowledge/Arrival/Transport, EtCO2 calibration, accepted BP layer) is excluded from shared snapshots
  - [x] `applySharedState` preserves trainee dispatch progress for the same run, clears Ack/Arrival on a new dispatch run, and fully clears the gate when it disarms
  - [x] Instructor resets propagate via `monitorResetVersion` in the shared snapshot, clearing trainee-local calibration/accepted-BP layers when it changes
  - [x] Student monitor polling moved into `useSessionMonitorSync`, which applies snapshots only when the state version changes and survives failed polls
  - [x] Store and hook regression coverage added for shared-state semantics and version-gated polling
- [x] **Instructor end-room control — COMPLETE:**
  - [x] Added an instructor-only end-room API route that switches the session status to `ended`
  - [x] Added an End Room control to the session instructor panel
  - [x] Ending a room redirects the instructor back to the lobby
  - [x] Waiting-room students see a Room ended state and can return to the lobby
- [x] **Session room code copy affordance — COMPLETE:**
  - [x] Instructor and student waiting-room views show a selectable room code with a Copy button
  - [x] Copy action writes the normalized uppercase room code to the clipboard
  - [x] Added focused component coverage for room-code copy behavior
- [x] **Session room vertical slice — COMPLETE:**
  - [x] Default `/` page is now a create/join room lobby, with `/?dev=1` preserving the local monitor
  - [x] Session creation returns a private instructor host link and creates secure hashed host credentials
  - [x] Student join uses room code + nickname and stores a participant token for refresh resume
  - [x] Added waiting room route that holds students until instructor Start/Dispatch
  - [x] Session instructor route wraps the existing admin console and shows room status, waiting students, and live evaluation log
  - [x] Admin Send can push the latest confirmed monitor state to session shared state
  - [x] Session monitor route applies shared instructor state and records per-student Acknowledge/Arrival/Transport, meds, Analyze, Charge, and Shock events
  - [x] Added Supabase migration for session hosts, session state, participants, participant attempts, and student events
  - [x] Added focused coverage for session token hashing/verification and create/join lobby behavior
- [x] **Local developer setup helper — COMPLETE:**
  - [x] Dependencies installed with a project-local portable Node.js runtime because system `npm` was unavailable
  - [x] Added `start-local.ps1` for launching the Next.js dev server with the portable runtime
  - [x] Ignored local portable runtime/cache/log artifacts in `.gitignore`
- [x] **Admin waveform option cleanup — COMPLETE:**
  - [x] Removed `Weak` from the admin SpO2 waveform selector
  - [x] Removed `Hypo` and `Obstr.` from the admin EtCO2 waveform selector
  - [x] Removed the visible `Normal` buttons so SpO2 and EtCO2 graph controls are toggle-only
  - [x] Hid visible `dirty` badges for ECG, SpO2, and EtCO2 graph controls while preserving draft Save/Send behavior
  - [x] Removed the right-side SpO2 and EtCO2 graph rows and moved graph on/off staging into the left vital toggles
  - [x] Added regression coverage for SpO2/EtCO2 graph On and Off behavior after Save → Send
  - [x] Updated selector coverage so the removed admin options stay hidden
- [x] Requirements gathering (Phases 1–2 of project planning)
- [x] **Admin vital zero-focus input polish — COMPLETE:**
  - [x] FC, SpO2, BP sys, BP dia, and EtCO2 inputs clear a visible `0` on focus
  - [x] Focus-only clearing does not dirty the vital; blur restores untouched zero values
  - [x] Non-zero values remain visible on focus and typed values still strip leading zeroes
- [x] **Admin vitals auto-sort paste box — COMPLETE:**
  - [x] Moved Vitals auto-sort input into the single Caller Info scenario auto-sort box
  - [x] Labelled French/English vital lines update only matching draft values
  - [x] Combined BP values parse any systolic/diastolic numbers around `/`, with separate BP sys/dia labels also supported
  - [x] Unit/notes formats such as `HR: 124 bpm`, `SpO₂: 92% on room air`, and `EtCO₂: 48 mmHg` are accepted
  - [x] Pulse summary lines such as `Pulse: 136 bpm, Regular, Weak` fill only FC/HR with the first number
  - [x] T1/T2/T3 and U1/U2/U3 buttons stage timed Treated/Untreated vitals from the Caller Info scenario auto-sort text without Save/Send
  - [x] Timed vitals buttons update draft numbers without turning Off vitals back On
  - [x] Timed vitals buttons use larger click targets for easier admin use
  - [x] Timed vitals buttons fill fixed-height grid cells so the entire outlined rectangle is clickable
  - [x] Timed vitals buttons use an explicit two-row grid with full-cell pointer targets
  - [x] ECG selector beside FC stays compact instead of stretching to the timed vitals button height
  - [x] FC, SpO2, BP sys, BP dia, and EtCO2 align in one left Vitals column beside the right ECG/timed-buttons column
  - [x] Large scenario pastes parse only the origin vitals section when present and ignore later serial vitals
  - [x] Repeated vitals keep the first valid value per field so treated/untreated vitals do not overwrite origin values
  - [x] Universal scenario auto-sort fills origin vital numbers while keeping those vitals Off until manually toggled On
- [x] **SpO2 monitor pulse fill icon — COMPLETE:**
  - [x] Numeric SpO2 values render a small yellow outlined fill bar beside the number
  - [x] Fill animation samples the selected SpO2 pleth waveform shape and timing
  - [x] SpO2 OFF/disconnected state does not render the pulse icon
- [x] **Monitor SpO2/EtCO2 graph visibility — COMPLETE:**
  - [x] Normal monitor mode shows one secondary graph slot at a time
  - [x] The CO2 soft key switches the secondary graph slot between SpO2 and EtCO2
  - [x] Typing SpO2 or EtCO2 numbers in admin stages the matching graph connection for Save → Send
  - [x] ECG and SpO2 graph erase/update sweep lines are synchronized to the same wall-clock phase
  - [x] EtCO2 number and graph stay hidden until the monitor CO2 soft key completes the 10-second calibration
  - [x] Admin Vitals shows a pink EtCO2 indicator when calibration is complete
  - [x] Monitor reset returns the selected secondary graph slot to SpO2 after EtCO2 use
  - [x] Bottom-panel-hidden expanded mode shows both SpO2 and EtCO2 rows, with Off rows disconnected
- [x] **Dispatch map runtime stability — COMPLETE:**
  - [x] Delayed Leaflet size invalidation is cancelled/guarded so unmounted maps do not crash with `_leaflet_pos` errors
- [x] **Call assignment display cleanup — COMPLETE:**
  - [x] Removed decorative icons from the New Assignment title and assignment detail rows while preserving labels and values
  - [x] Automatic call assignment display plays the provided alert sound and shows a 4-pulse gentle flash for each new dispatch run
  - [x] Manual caller-info reopening from the monitor sidebar does not replay the assignment alert
- [x] **Admin CPR ECG override — COMPLETE:**
  - [x] Admin Vitals includes side-by-side, mutually exclusive Regular CPR and Weak CPR toggles in the ECG column
  - [x] Regular CPR displays FC 120 and drives ECG/SpO2/pulse-bar cadence at 120/min; Weak CPR displays FC 90 and drives the same traces at 90/min
  - [x] Clicking the active mode turns CPR off, while clicking the other mode switches directly without activating both
  - [x] CPR Off/Regular/Weak switching preserves the existing ECG canvas so old trace history remains behind the black sweep line
  - [x] Turning CPR off restores the previously saved/sent FC and ECG rhythm graph without changing EtCO2 or defibrillator CPR behavior
  - [x] Persisted and shared-session CPR state uses a typed mode, migrates the legacy boolean to Regular/Off, and emits the legacy active flag for mixed-version compatibility
- [x] **Admin patient information checklist — COMPLETE:**
  - [x] Added a third admin tab named Patient Information
  - [x] Added side-by-side Sample and OPQRST square checklist panels
  - [x] Letter buttons toggle an ECG-green selected state independently
  - [x] Letter buttons now render as compact left-aligned vertical columns
  - [x] Each letter has a page-only auto-growing textarea beside it for SAMPLE/OPQRST notes
  - [x] Single Caller Info scenario auto-sort fills `Letter: value` notes, routing repeated S/P labels to SAMPLE first and OPQRST second
  - [x] SAMPLE M auto-sort collects medication lines, strips parenthesized descriptions, and stores medication names as a comma-separated list
  - [x] Checklist and text state is page-only, survives tab switching during the session, and does not use Save/Send
- [x] **Admin patient physical body map — COMPLETE:**
  - [x] Added a Patient Physical admin tab with the newer supplied front/rear body outline image on a transparent/dark background
  - [x] Added tight inside-body selectable head, upper chest, abdomen, rear back, and front/rear pelvic trunk regions
  - [x] Added front and rear neck selections between the head and shoulder areas
  - [x] Split shoulders, arms, hands, legs, and feet into anatomical patient left/right regions on both body outlines
  - [x] Rebuilt overlay coordinates so selected regions stay inside the newer body outlines
  - [x] T1/T2/T3/U1/U2/U3 timed vitals update Pulse and Respiratory icon findings while preserving manual selections
  - [x] Moved chest, abdomen, pelvic trunk, arm/hand, and upper/lower leg zones higher with tighter inside-body selections
  - [x] Raised upper-leg overlays again on both outlines while leaving lower-leg and foot placements stable
  - [x] Single Caller Info scenario auto-sort fills Patient Physical findings with amber review markers, click-to-show selected-panel text, and click-to-confirm green behavior
  - [x] Added Head / Face / Neck auto-sort support for front head and front neck findings
  - [x] Added Back / Spine and Thoracic auto-sort aliases so those sections no longer attach to previous leg findings
  - [x] Fixed Patient Physical map sizing so long Selected-panel findings do not stretch the body outline or overlays
  - [x] Selected Patient Physical entries display in the order body parts are clicked
  - [x] Refined respiratory and pulse Patient Physical icons so each icon is the only toggle and opens a combined slider with missing-field notes
  - [x] Patient Physical auto-sort parses comma-separated Pulse and Respirations summaries into rate, rhythm, and strength
  - [x] Added a Skin/Extremities icon after Pulse and Respiratory that auto-sorts skin findings into one icon-only slider note
  - [x] Added a Scene/Environment icon after Skin/Extremities that auto-sorts scene findings into one icon-only slider note
  - [x] Selected body regions highlight ECG green and stay page-only without Save/Send or monitor effects
  - [x] Patient Physical Reset clears only the local body-map selections
- [x] **Caller info auto-sort paste box — COMPLETE:**
  - [x] Added a single admin-only scenario auto-sort textarea above the Caller Info fields
  - [x] Unified scenario auto-sort updates Caller Info, origin Vitals, Patient Information, and Patient Physical state from one paste
  - [x] Labelled French/English lines fill the six main caller-info draft fields, including label-on-next-line and dash-separated formats
  - [x] Added Call #, Priority, and MPDS Code fields that appear on admin and trainee caller-info views after Save → Send
  - [x] Dispatch-format labels map into their matching fields, with patient/details/units combined into Information and DETAILS appended without a heading prefix
  - [x] Address labels support `ADDRESS`, `Adresse`, and `Addresse`, including values on the following line
  - [x] Time Received keeps only the time value and stops before later scenario sections like Patient Presentation
  - [x] Removed the legacy Intervention prioritaire code field and reordered Caller Info so Dispatch countdown appears before Call / Priority / MPDS
  - [x] Assignment caller-info screen keeps the large Priority badge without a duplicate Priority details row
  - [x] Matching fields overwrite immediately while preserving the existing Save → Send workflow
- [x] Zoll X Series UI reference documented (`screenshots/SCREENSHOTS_SUMMARY.md`)
- [x] Architecture designed (layers, component tree, state, realtime, ECG strategy)
- [x] `PLAN.md` — full development plan with 11 phases
- [x] `AGENTS.md` — role definitions, conventions, data flow contracts
- [x] `STATUS.md` — this file
- [x] `CHANGELOG.md` — history log
- [x] **BP alarm suppression during NIBP reading — COMPLETE:**
  - [x] BP/PNI alarm visual styling and audio contribution are suppressed during Please Wait, Reading in Progress, and count-up
  - [x] Cancelling restores the old accepted BP alarm state; completion resumes BP alarm behavior with the final accepted BP
  - [x] HR and SpO2 alarms remain active while BP reading suppresses only the BP channel
- [x] **Settled PNI sys/dia display — COMPLETE:**
  - [x] NIBP count-up remains single-number during counting
  - [x] Completed readings settle to stacked systolic/diastolic PNI with the existing divider
  - [x] Partial-active BP readings still show both sys and dia once the reading completes
- [x] **Gated BP readings + EtCO2 loading — COMPLETE:**
  - [x] Admin-sent BP/PNI changes remain pending until the outer-shell BP reading completes; cancellation keeps the old accepted BP
  - [x] BP alarms and BP Off now follow the accepted BP reading state instead of changing immediately on Send
  - [x] First ETCO2 toggle after monitor reset runs a 10-second purple calibration trace that shrinks from large to small; incomplete calibrations restart and completed calibrations are not repeated until reset
  - [x] Medication/analyze event-log rows use real Eastern HH:MM:SS time instead of the session timer
- [x] **Jumpscare playback removal — COMPLETE:**
  - [x] Commented out FNAF/its_me/Golden Freddy/Chica jumpscare video and audio pathways in monitor shell, boot screen, page overlay, and controller trigger
  - [x] Left existing jumpscare assets in `public/` but removed active app references/playback
  - [x] Normal simulator audio remains active; vital alarms now use `/audio/alarm.mp3`
  - [x] Regression tests updated so old random rolls/triggers do not render prank media
- [x] **Randomized off-state its_me playback — COMPLETE:**
  - [x] Powered-off screen is now black by default instead of looping `its_me` continuously
  - [x] While powered off, `its_me` has a 1/100 per-second chance to play for a random 500-5000ms burst, with rolls paused during playback
  - [x] Active bursts cancel on power-on and when Golden Freddy appears; focused `DeviceShell` tests cover the timing and cancellation behavior
- [x] **Phase 1 — Scaffolding complete:**
  - [x] Next.js 16.2.4 app scaffolded (TypeScript, Tailwind, App Router, src/ dir)
  - [x] Dependencies installed: `@supabase/supabase-js`, `@supabase/ssr`, `zustand`, `nanoid`, `clsx`, `tailwind-merge`
  - [x] Vitest + React Testing Library configured (`vitest.config.ts`, `src/__tests__/setup.ts`)
  - [x] `.env.local.example` created
  - [x] `supabase/migrations/001_initial_schema.sql` created (sessions, vitals_snapshots, scenarios + RLS)
  - [x] All 59 source stub files created per PLAN.md folder structure
  - [x] Types implemented: `vitals.ts`, `session.ts`, `scenario.ts`
  - [x] Utilities implemented: `lib/utils.ts` (cn + COLORS), `lib/session.ts` (nanoid code gen)
  - [x] Supabase clients: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/types.ts`
  - [x] Realtime events: `lib/realtime/events.ts` (BroadcastEvent union type)
  - [x] API route stubs: `POST /api/session/create`, `GET /api/session/join`
  - [x] Page shells: `/session/[code]/monitor/page.tsx`, `/session/[code]/instructor/page.tsx`
  - [x] TypeScript: 0 errors (`tsc --noEmit` passes)
  - [x] Dev server: starts and serves at `localhost:3000` in <300ms
- [x] **Monitor base UI + menu navigation — COMPLETE:**
  - [x] Monitor lives at `/` (boilerplate replaced); session routes parked as stubs
  - [x] Zoll palette added to Tailwind theme via `@theme inline` in `globals.css`
  - [x] Reusable atoms: `VideoWaveform`, `SidebarButton`, `VitalBox`, `LeadCell`
  - [x] Layout: `MonitorLayout` (CSS Grid), `TopStatusBar`, `SubBar`, `BottomStatusBar`
  - [x] Main panels: `WaveformPanel`, `ECGCanvas` (placeholder), `SecondaryChannel`, state-driven `VitalsStrip`, `LeftSidebar`, `RightNavCluster`
  - [x] Overlays: `TwelveLeadPage`, `PatientModeModal`
  - [x] Defib state machine: `useDefibSequence` + `DefibButtonRow` (ANALYSE → CHARGE → SHOCK), shared `ProgressBar`
  - [x] Wired interactions: 12-lead toggle, EtCO2 channel swap, patient mode dropdown, energy ▲▼, full defib sequence
  - [x] Tests: 21 passing (MonitorLayout, LeftSidebar, PatientModeModal, useDefibSequence)
  - [x] TypeScript clean; dev server serves at `localhost:3000`
- [x] **Dispatch lock + countdown startup gate — COMPLETE:**
  - [x] Monitor boots locked-off for normal users; admin caller-info Send arms a lock + ETA countdown on first send (minutes + seconds fields), later Sends only update content; admin Reset = full reset to locked-off
  - [x] Unlock = Acknowledge → countdown 0 → Arrival → Go to Monitor; Transport enabled only after power-on; Ack/Arrival/Transport record EST wall-clock time, merged into the event log
  - [x] Assignment dashboard timers now split correctly: Response Timer counts up from dispatch Send, while ETA counts down to the configured scene-arrival countdown
  - [x] Gate state persisted (store version 7, absolute response start timestamp, absolute countdown end-timestamp, per-dispatch run id) so refresh resumes; `?dev=1` bypasses the gate; pre-dispatch standby screen, inert blocked power button
  - [x] New `useCountdown` + `useElapsedTimer` hooks and `formatEstTime` util; caller-event state moved from controller to store; `initialPoweredOn` controller option; tests across store/hook/util/modal/controller + page flow tests run with `?dev=1`
- [x] **Dispatch locked/off hardware silence — COMPLETE:**
  - [x] While powered off or dispatch-locked, hardware controls are inert and do not play button audio; only the dispatch touchscreen buttons remain interactive on the locked caller-info screen
  - [x] Locked caller-info now fills the monitor screen as a touchscreen; both locked caller-info and the in-monitor Call Info view use a distinct dispatch-tablet/iPad visual treatment so they do not look like native monitor UI
  - [x] Caller-info A/B test added: default icon-led `assignment` dashboard for fast parsing, with the previous tablet layout available via `?callerInfoVariant=classic`
  - [x] Assignment dashboard icon/action colors now follow the reference palette, and all three action buttons stay visible on the monitor
  - [x] Assignment dashboard Response Timer, Call Assignment, and priority block now use white text, while all standard and custom detail labels consistently use dispatch blue; the classic variant remains unchanged
  - [x] The seven standard assignment-detail labels and values now match the 18px Call Assignment size; headers have stronger 900-weight/stroke emphasis and all assignment-detail lists use the preferred uniform `gap-3` spacing, including optional/custom rows
  - [x] Completed caller action buttons gray out after they are clicked/logged
  - [x] Caller info now renders outside the Zoll shell: pre-Arrival it owns the full page, after Arrival the Zoll appears powered off, and in-monitor CALL INFO opens a full-page iPad surface with Back
  - [x] Arrival now only enables Go to Monitor; every dispatch run, including after admin Reset, must be entered explicitly before the Zoll appears
  - [x] Full-page caller info keeps an iPad-oriented 4:3 frame and mimics the reference assignment dashboard layout
  - [x] Assignment iPad location area now shows a route map: admin Caller Info has Geoapify address autocomplete, John Abbott College as default start, OSRM route lookup, countdown-driven route progress, and a real-time moving unit marker
  - [x] Caller-info iPad map supports user pan/zoom controls and preserves the user's viewport while the moving unit marker updates
  - [x] Map has a "Track unit" toggle: default route overview vs. follow mode that keeps the moving unit centered and zoomed in close; toggling back refits the route
  - [x] Dispatch countdown changes after the initial route Send follow strict Save -> Send: editing re-enables Save, Save re-enables Send
  - [x] A Send carrying a changed (saved) countdown re-dispatches: it restarts the gate countdown and the map ETA from that send and clears the trainee's Acknowledge/Arrival; a Send that keeps the same countdown only updates content and leaves the gate/ETA running
- [x] **Disconnected startup vitals/graphs — COMPLETE:**
  - [x] Monitor vital numbers start/reset blank while inactive, with SpO2 rendering `SpO2 OFF`
  - [x] Admin vitals panel rows ordered FC → SpO2 → BP sys/dia → EtCO2
  - [x] Admin vital rows expose a right-side Off/On toggle; clicking anywhere in the toggle rectangle flips that specific vital on/off
  - [x] Admin vital number fields use narrow, right-aligned console slots with unit labels embedded inside the field
  - [x] Monitor SpO2 uses a slightly smaller value font, with a smaller `SpO2 OFF` disconnected display for fit
  - [x] Admin graph controls now sit beside their matching vital rows: ECG beside FC, SpO2 beside SpO2, and EtCO2 beside EtCO2
  - [x] ECG, SpO2, and EtCO2 graph connection state reuses the same Off/On toggle treatment as numeric vitals
  - [x] ECG rhythm selection uses a compact picker button that shows the selected rhythm label and removes the extra `Rhythm:` display pill
  - [x] Replaced the completed `NSR` / regular sinus 12-lead capture strip with the supplied ECG image
  - [x] Added `1st Degree` under the admin ECG `Heart Block` category with long-PR live ECG and 12-lead morphology
  - [x] Replaced the completed `1st Degree` 12-lead capture strip with the supplied ECG image
  - [x] Added `2nd Degree Type 1` under the admin ECG `Heart Block` category with Wenckebach live ECG and 12-lead morphology
  - [x] Replaced the completed `2nd Degree Type 1` 12-lead capture strip with the supplied ECG image
  - [x] Added `2nd Degree Type 2` under the admin ECG `Heart Block` category with Mobitz II live ECG and 12-lead morphology
  - [x] Replaced the completed `2nd Degree Type 2` 12-lead capture strip with the supplied ECG image
  - [x] Added `3rd Degree` under the admin ECG `Heart Block` category with complete heart block live ECG and 12-lead morphology
  - [x] Replaced the completed `3rd Degree` 12-lead capture strip with the supplied ECG image and reshaped its live ECG escape complexes
  - [x] Rebuilt VF with a dedicated irregular fibrillation generator instead of the torsades-style twisting envelope
  - [x] Completed VF 12-lead captures show the supplied VFib strip image
  - [x] Rebuilt VT as a monomorphic tachycardia waveform with tall repeated complexes, sloped descent, and rounded troughs
  - [x] Added `Anterior MI` and `Inferior MI` under the admin ECG `MI` category with canvas-rendered monitor and 12-lead morphology
  - [x] Rebuilt the live Anterior MI and Inferior MI ECG monitor strips with clean reference-strip templates to better match the supplied reference videos
  - [x] Rounded and widened the live Anterior MI ECG T wave to better match the supplied example
  - [x] Moved the live Anterior MI ECG P wave closer to the QRS complex
  - [x] Moved the live Inferior MI ECG P wave closer to the QRS and reshaped it with a slightly widened QRS, a raised scooped ST segment, plus a rounded slow T-wave ramp and softened peak at about half the QRS height
  - [x] Completed Anterior MI and Inferior MI 12-lead captures show their supplied strip images while other rhythms keep the default printout
  - [x] Vital alarms stay inactive for Off startup/reset vitals until each specific vital is turned On through Save → Send; numeric `0` is treated as a real alarmable value when On
  - [x] ECG, SpO2, and EtCO2 graph channels start as spaced dashed disconnected traces; switching the graph toggle On makes that graph live after Save → Send
- [x] **Context-aware admin reset — COMPLETE:**
  - [x] Monitor tab Reset clears only monitor vitals/rhythm/waveform state back to the disconnected blank startup state
  - [x] Caller Info tab Reset remains the full drill reset, clearing caller info, dispatch gate/countdown, logs, and vitals
- [x] **Caller info call-milestone buttons — COMPLETE:**
  - [x] Acknowledge / Arrival / Transport buttons at the bottom of `CallerInfoModal` (now gated/logged via the dispatch store; superseded by the gate work above)
- [x] **Caller info Back-to-close fix — COMPLETE:**
  - [x] Back now closes the Call Info panel (controller `back` reducer handles `callerInfoOpen`); the merged modal has no in-panel close button
  - [x] Stale `CallerInfoModal` close-button test replaced; controller test added; full suite green (241 tests)
- [x] **Medication event log back fix — COMPLETE:**
  - [x] Med "BACK" now closes the open event log first (staying in medication mode), then exits medication mode on the next press — restoring pre-refactor two-step behavior
  - [x] Fixed in `useMonitorController` `exitMedicationMode`; controller test added
- [x] **ECG renderer dimension self-heal fix — COMPLETE:**
  - [x] Fixed the ECG trace being erased in chunks (until a manual window resize) when the cached canvas size drifted from the real size after a layout change
  - [x] `resize()` is idempotent + client-size-rounded; the loop self-heals size a few times per second instead of relying solely on `ResizeObserver`
  - [x] Renderer regression test added; confirmed via instrumentation there were no duplicate render loops
- [x] **Page composition cleanup — COMPLETE:**
  - [x] Extracted `useMonitorClock` (ticking clock) and `useDefibAudio` (charge/shock-ready beeps) from `MonitorPage`
  - [x] `MonitorPage` is now pure wiring (selectors, hooks, render tree); hook tests added; behavior unchanged
- [x] **Defib state machine split — COMPLETE:**
  - [x] Added pure `src/lib/defib/defibMachine.ts` (state enum, guards, energy math, charge/shock transition classifiers)
  - [x] `useDefibSequence` keeps timers/rAF/audio, delegates decisions to the machine; `DefibState` re-exported for compat
  - [x] Reducer-level tests added; charge/analyze/shock/audio behavior unchanged
- [x] **Waveform renderer hook refactor — COMPLETE:**
  - [x] Added `src/hooks/useWaveformRenderer.ts` (canvas ref + latest-value sync + `startRenderer` lifecycle)
  - [x] `ECGCanvas`, `LeadCell`, `SecondaryChannel` rewired to the hook; per-view options unchanged
  - [x] Generators/renderer math untouched; rendered waveforms unchanged; hook test added
- [x] **Shared soft-key model refactor — COMPLETE:**
  - [x] Added `src/lib/monitor/medications.ts` + `src/lib/monitor/softKeys.ts` as the single source of truth for medication pages and the 7 per-view physical soft keys
  - [x] Removed duplicate medication tables from `DeviceShell`/`LeftSidebar` and the duplicate next-page map from `useMonitorController`
  - [x] Collapsed the ~40-prop `DeviceShellProps` into grouped objects (`defib`, `softKeys`, `nav`, `meds`, `power`, `audio`); `LeftSidebar` markup unchanged
  - [x] Added soft-key model tests; behavior and rendered output preserved
- [x] **Monitor interaction controller refactor — COMPLETE:**
  - [x] Extracted monitor-page local UI state into `useMonitorController`, backed by a reducer
  - [x] Controller owns view/channel mode, modal state, patient-info editing, medication log/flash, mute/power flags, selection cursor, 12-lead capture, latest-print preview, and Back precedence
  - [x] `MonitorPage` now focuses on rendering/wiring while keeping defib sequence, alarms, session timer, and screen composition in place
  - [x] Tests added for controller initial state, selection toggle, patient-info drafts, capture timers, Back precedence, and power-off cleanup
- [x] **Vitals alarm system — COMPLETE:**
  - [x] Confirmed client thresholds: HR <40/>140 bpm; BP systolic <90/>200 mmHg; BP diastolic <25/>225 mmHg; SpO2 <90%; no EtCO2 threshold
  - [x] `getActiveAlarms` centralizes alarm evaluation for HR, BP, and SpO2
  - [x] `useAlarm` starts one looping alarm sound while any vital is alarming, and stops it when all vitals normalize
  - [x] Alarm MP3 copied to `public/audio/alarm.mp3`
  - [x] Alarming vital boxes render white background, red header, white header text, and red number text; either BP value alarms the whole PNI box
  - [x] Alarming vital values fade between visible and hidden over a 1.9s loop; non-alarming vitals remain steady
  - [x] Tests added for thresholds, hook play/stop behavior, and alarm visual styling; full suite passes (111 tests)
- [x] **Admin vitals normal reset — COMPLETE:**
  - [x] Added a top-of-vitals `Normal` button in the admin dashboard
  - [x] `resetVitalsToNormal` resets draft HR/BP/EtCO2/SpO2 values to `DEFAULT_VITALS`
  - [x] Rhythm and waveform selections are preserved; confirmed monitor values are not changed until Save → Send
  - [x] Tests added for the store action and `VitalsControls` button behavior
- [x] **Asystole ECG reference tuning — COMPLETE:**
  - [x] Tuned the asystole rhythm against `/Users/zaidtabana/Downloads/RPReplay_Final1778567841.mov`
  - [x] Asystole now renders as a thin pads baseline with very slight low-amplitude slopes/waves and tiny deterministic monitor noise instead of a mathematically perfect zero line
  - [x] Tests verify asystole stays near-flat, low-amplitude, smooth, and free of QRS-like spikes
- [x] **PEA ECG option removed — COMPLETE:**
  - [x] Removed PEA from the ECG rhythm type, synthesized rhythm table, and admin ECG selector
  - [x] Persisted legacy PEA rhythms normalize back to NSR during store hydration
  - [x] Updated tests so the admin ECG selector exposes NSR, VF, VT, Torsades, and Asystole only
- [x] **VFib ECG reference tuning — COMPLETE:**
  - [x] VFib now uses the torsades-style polymorphic waveform pattern by request
  - [x] VFib shares the 15-beat/3900ms generated template family: cycle-to-cycle variants, active first-pass activity, low-amplitude waist waves, and exaggerated rounded oval packets
  - [x] Tests verify VFib follows the same torsades-style waveform contract and generates new variants across cycles
- [x] **Torsades ECG reference tuning — COMPLETE:**
  - [x] Tuned torsades against `/Users/zaidtabana/Downloads/RPReplay_Final1778567085.mov`, the three 2026-05-30 Pads screenshots, and the 2026-05-31 hand-drawn/pink-strip oval packet references
  - [x] Torsades now renders as organized fast polymorphic VT: 15 rounded oval complexes over 3.9s, exaggerated small-hump-to-large-oval spindle packets, active low-amplitude humps, deterministic packet variation, and multiple generated pattern families across cycles
  - [x] Added `TORSADES_TUNING`; tests verify beat count/rate, exaggerated packet growth, active low-amplitude humps, rounded oval morphology, organized zero-crossing bounds, non-artifact contour, and per-cycle pattern changes
- [x] **ECG rhythm-switch artifact fix — COMPLETE:**
  - [x] Fixed torsades → NSR switch artifact where torsades could briefly render at NSR speed as a rapid up/down buzz
  - [x] Renderer signal keys now refresh waveform data and reset phase immediately when rhythm/channel shape changes
  - [x] Added regression coverage for immediate waveform refresh on signal-key changes
- [x] **Patient Info menu (12-lead) — COMPLETE:**
  - [x] Second left soft key (12-lead view only) opens a `PatientInfoPanel` overlaying the bottom 2/3 of the screen
  - [x] Edits Patient Age (clamp 0–120, default 40) and Patient Sex (M/F), driven by the right cluster's Move up/down arrows + center dot (Enter)
  - [x] Two-step edit with a draft: Enter starts editing, arrows change the draft, Enter commits to the store; Back cancels the edit, closes the panel, then exits 12-lead
  - [x] `patientInfo` persisted in `monitorStore` (`setPatientAge`/`setPatientSex`, persist v3); 12-lead left menu = Patient Info (slot 2) + Back, aligned on-screen and on the physical shell
  - [x] Tests: patientInfo helpers, store, panel, DeviceShell keys/nav, and an end-to-end page flow
- [x] **12-lead Capture — COMPLETE:**
  - [x] Capture soft key (slot 1, 12-lead only) freezes the current rhythm/HR and shows a centered "Acquiring 12-Lead" card with a green progress bar that fills over ~4s (`AcquiringDialog`)
  - [x] On completion a static ECG-paper image **takes over the entire monitor display** using `/public/images/twelve-lead-capture.svg` (`TwelveLeadPrintout`)
  - [x] During capture **only Back works** — all other controls inert via `captureLock` on `DeviceShell` (defib row disabled, handlers no-op)
  - [x] Transient (no persistence) — Back cancels an in-progress acquisition or dismisses the printout back to the live 12-lead grid; every press is a fresh capture of the current state
  - [x] Acquire color remains in `COLORS` (`utils.ts`) + `@theme` (`globals.css`) for the progress bar
  - [x] Tests: capture flow (acquire → printout → dismiss, mid-acquire cancel, lock-to-Back), `DeviceShell` captureLock, static capture image, acquiring dialog
- [x] **Print latest 12-lead (main view) — COMPLETE:**
  - [x] Main-view PRINT soft key (slot 6) reprints the most recent completed capture as a full-screen `TwelveLeadPrintout`; inert until a 12-lead has been acquired
  - [x] Latest capture kept in session-only page state (`lastCapture`), recorded when an acquisition completes; cleared on power-off (no store persistence)
  - [x] While the reprint is up only Back works (`captureLock` extended with `printPreviewOpen`); Back dismisses it; sidebar PRINT label highlights while open
  - [x] Tests: `printFlow` (inert with no capture, reprint + Back dismiss + lock-to-Back, forgotten after power cycle), `DeviceShell` printer key fires `onPrint`
- [x] **Caller info on ANALYZE — COMPLETE:**
  - [x] Admin dashboard includes a separate Caller Info tab with fields: Dispatch countdown, Call #, Priority, MPDS Code, Adresse, Probleme, Information, Mise a jour, Heure, plus an `Add extra` button capped at three optional title/input rows
  - [x] Caller info uses draft/saved/confirmed state and the existing Save → Send workflow
  - [x] Monitor shows the sent caller info when the bottom physical ANALYZE button is clicked
  - [x] Left-side menu ANALYSE soft key (and matching physical left soft key) opens caller info modal only; it does not start the defib analyze sequence
  - [x] Tests added for form input, admin tab switching, Save/Send enablement, store flow, modal rendering, and MonitorPage ANALYZE display
- [x] **Monitor clock hydration fix — COMPLETE:**
  - [x] Monitor top bar renders a stable SSR/client placeholder before mount
  - [x] Real local date/time starts after hydration, avoiding server/client second mismatches
  - [x] `monitorClock` tests cover placeholder and timezone formatting behavior
- [x] **Physical shell refinement — COMPLETE:**
  - [x] `DeviceShell` outer frame rebuilt with blue rim, rounded grey face, recessed screen, top power button, and subtler ZOLL branding
  - [x] Left grey physical soft keys aligned with the inner screen's left sidebar labels; 12-lead, EtCO2, and back soft keys wired to existing navigation/channel behavior
  - [x] Inner dark left sidebar labels changed to display-only controls
  - [x] Right physical controls changed from a uniform grid to an irregular recessed navigation cluster with bell/camera/patient-event icon details
  - [x] Bottom defib bay resized/repositioned to better match the reference: smaller ANALYZE / ENERGY SELECT / CHARGE, red step numbers, large round SHOCK
  - [x] PACER button restored as an inert clickable physical button
  - [x] Top white bar and green/red power toggle moved onto the blue outer rim
  - [x] Right-side buttons standardized to rounded-square shapes with curved arrow glyphs; defib labels repositioned outside controls
  - [x] Tests updated for inert PACER, physical EtCO2 soft key, and non-clickable inner sidebar labels; full tests, lint, TypeScript, and production build pass
- [x] **Live waveform graphs + vitals layout refinement — COMPLETE:**
  - [x] Canvas overwrite-scroll renderer in `src/lib/ecg/renderer.ts` (rAF, DPR-aware, ResizeObserver, beat-boundary waveform swap)
  - [x] Synthesized waveform data in `src/lib/ecg/rhythms.ts` (NSR/VF/VT/Torsades/Asystole, SpO2 pleth normal/weak/off, EtCO2 normal/hypoventilation/obstructed/off)
  - [x] `ECGCanvas` and `SecondaryChannel` rewritten to use the renderer; `VideoWaveform` retained only for 12-lead view
  - [x] Vital numbers shrunk `text-5xl` → `text-4xl`; PNI rendered as stacked sys/dia with horizontal divider (`text-3xl`)
  - [x] Right vitals column narrowed `220px` → `180px` to give waveforms more horizontal space
  - [x] Dead `src/lib/waveformPaths.ts` removed
  - [x] Tests added: `rhythms.test.ts`, `renderer.test.ts`, `VitalBox.test.tsx`, `VitalsStrip.test.tsx`
- [x] **Physiologically reactive waveforms + rhythm fidelity — COMPLETE:**
  - [x] EtCO2 plateau height tracks the EtCO2 mmHg vital (0-63 mmHg scale): sending 35 plateaus at the "35" tick on the on-screen axis
  - [x] EtCO2 trace renders as a filled purple area (matches Zoll capnograph reference video) — new `fillStyle: 'area'` option on renderer
  - [x] SpO2 pleth amplitude scales with SpO2 %: full at ≥95, progressively shrinks, floors at 0.25× under 70
  - [x] Decoupled `sweepMs` (paper speed) from `cycleMs` (cardiac cycle) — multiple beats now visible across the screen at typical Zoll speeds (ECG/SpO2 4s, EtCO2 15s)
  - [x] VT shape rewritten to wide rounded peaks matching real-life monomorphic VT (no longer a sine wave)
  - [x] VF tuned to the pads reference as fast repeated coarse waves with small imperfections
  - [x] Right vitals column further narrowed `180px` → `140px` to remove leftover empty space
  - [x] Reactivity tests added: EtCO2 plateau scaling, SpO2 amplitude scaling, VT/VF shape sanity
- [x] **Reference-guided admin rhythm graph pass — COMPLETE:**
  - [x] User-supplied rhythm references reviewed for the currently exposed admin rhythm buttons
  - [x] NSR template sharpened with narrower QRS, subtle ST segment, and small baseline motion
  - [x] VT template rebuilt as a wide-complex monomorphic rhythm with a dominant broad peak and terminal trough
  - [x] VF template rebuilt as a coarse repeated pads trace with tall peaks, deep troughs, and uneven shoulders
  - [x] Asystole tuned to a near-flat pads baseline with tiny slopes/waves
  - [x] `PLAN.md` updated to lock vitals to the right column and keep bottom space for status/defib controls
  - [x] Tests strengthened for VT trough/width and VF chaos
- [x] **Rhythm + EtCO2 scale + vitals width polish — COMPLETE:**
  - [x] ECG templates retuned closer to supplied monitor rhythm videos while remaining canvas/admin controlled
  - [x] Default pads ECG adjusted to match the reference image: `Pads 1.0 cm/mV`, smaller R peak, and no deep downward S spike
  - [x] EtCO2 graph scale updated to the reference video's `0-150 mmHg` range with `150 / 75 / 0` axis labels
  - [x] EtCO2 instructor input max raised to `150`
  - [x] Right vitals column narrowed to `96px`; vitals remain on the right side only
  - [x] Right-side vital numbers centered within the narrowed column
  - [x] Tests updated for 150 mmHg scale, mid-height 75 mmHg plateau, clamping, VT shape, and VF chaos
- [x] **VFib/VTach video reference match — COMPLETE:**
  - [x] Confirmed provided VFib and VTach reference files exist under `/Users/zaidtabana/Downloads/Monitor videos/Graphs/12 lead graphs/Completed/`
  - [x] VFib template changed from noisy artifact-style jitter to coarse rolling fibrillation matching the video direction
  - [x] VTach template corrected to broad rounded box-like monomorphic complexes with soft tops and rounded low segments matching the latest screenshot reference
  - [x] Rhythm tests updated to guard VFib against returning to artifact/noise behavior
- [x] **VT negative-dominant + per-beat variation attempt — SUPERSEDED:**
  - [x] `synthVT` rewritten as pre-spike bump → deep negative dominant gaussian spike → positive rebound → notch → tail, with baked-in low-amp noise + slow wander
  - [x] New `getEcgRhythm(rhythm)` factory: VT returns a freshly-seeded synth each cycle so beat-to-beat amplitude/width/centroid vary visibly; other rhythms still return their stable static entry
  - [x] `ECGCanvas` switched to the factory; `ampJitter` 0.08 → 0.14, `cycleJitter` 0.04 → 0.07
  - [x] Tests updated: negative-dominant (|trough| > peak·1.4), noise-present (maxAdjacentDelta 0.02–0.2), beat-to-beat variation across two factory calls
  - [x] Type-check + 99/100 tests green (preexisting DeviceShell power-button failure unrelated)
- [x] **VTach rounded screenshot correction — COMPLETE:**
  - [x] Negative-dominant/noisy VTach attempt replaced with a rounded-box complex matching the screenshot silhouette
  - [x] VT now uses soft rise, broad rounded top, smooth fall, and rounded low segment with only subtle beat-to-beat variation
  - [x] ECG timing fixed so `getCycleMs` no longer regenerates a new VT waveform every animation tick
  - [x] ECG amplitude/cycle jitter reduced to keep VT from drifting away from the reference shape
  - [x] Tests updated to guard rounded VT shape and reject artifact-noisy adjacent jumps
- [x] **Compact Pads-style VT tuning — COMPLETE:**
  - [x] VT requirement updated from isolated upward complexes to the latest Pads screenshot style: continuous plateau-and-sharp-V trough rhythm
  - [x] `VT_TUNING` added to centralize cycle speed, plateau height/wobble, trough depth/center/width, V sharpness, and jitter constants for easier fine-tuning
  - [x] VT cycle tightened to `340ms` to show more beats across the ECG sweep, with varied upper plateaus and clean downward V troughs
  - [x] Trough center, width, depth, and sharpness vary per beat so some V's are sharper and others are longer/wider
  - [x] Rhythm tests updated to guard fast cycle timing, variable clean V troughs, non-flat plateau wobble, bounded beat-to-beat variation, and artifact-free adjacent deltas
- [x] **VTach plateau smoothing — COMPLETE:**
  - [x] VT plateau requirement refined to keep the rise/fall geometry but remove jagged plateau wobble
  - [x] `synthVT` plateau contour changed from layered sine wobble/noise to a rounded, gently downward-sloping shelf
  - [x] VT plateau apex shifted earlier in the rounded arc so the rest of the top slopes down toward the trough
  - [x] Rhythm tests updated to guard an early-peaking rounded non-jagged plateau plus the existing deep sharp V trough
- [x] **Right shell monitor selection controls — COMPLETE:**
  - [x] Right physical Move up / Move down / Enter buttons now drive a monitor selection cursor
  - [x] Selection starts on the combined date/time region and cycles through the requested header, vitals, graph title metadata, ECG label, and minus-toggle targets
  - [x] Selected regions use the new blue selection highlight; right vital selection highlights the value area while leaving the label row unchanged
  - [x] Added the header beacon icon, selectable battery/date/patient regions, and the subbar minus + empty rectangle controls
  - [x] Added `SpO2 1x` and displayed `EtCO2 0 to 60 mmHg` graph metadata without changing the EtCO2 renderer scale
  - [x] Enter is inert except on the minus toggle, which hides/restores the bottom status/defib/CPR panel
  - [x] When the bottom panel is hidden, the main waveform area expands to ECG / EtCO2 / SpO2 while right-side vitals remain in place
  - [x] Tests added for shell nav handlers, monitor selection flow, bottom-panel toggle, vital selection styling, and graph metadata
- [x] **NIBP reading animation (Patient Event button) — COMPLETE:**
  - [x] Patient Event button (💪, outer shell right cluster) now triggers a 5-phase NIBP reading sequence
  - [x] Phase flow: idle → Please Wait (3s) → Reading in Progress (0.5s) → ascending count 0→bpSys+30 (~8s) → settled at bpSys indefinitely
  - [x] Ascending sequence pre-generated via Fisher-Yates shuffle of evenly-distributed steps; guarantees exact endpoints and ~333ms per step
  - [x] Clicking during any active phase cancels and returns to idle (showing confirmed store bp_sys/bp_dia again)
  - [x] Clicking during settled phase starts a fresh reading
  - [x] `useNibpReading` hook (new) manages all phase transitions and timer cleanup
  - [x] `VitalsStrip` conditionally renders text slot (please_wait/reading) or single-value VitalBox (counting/settled) or normal stacked VitalBox (idle)
  - [x] `DeviceShell` wired with `onPatientEvent` prop threading through `RightControlCluster`
  - [x] Tests: 14 passing — full phase transition coverage, cancel scenarios, endpoint/monotone sequence validation for low/normal/high BP values

---

## Recently Completed
- [x] **Phase 16 — Instructor-Recorded Actions — CODE COMPLETE, MIGRATION NOT APPLIED (2026-09-07):**
  - [x] Med grid as the middle column of Monitor & Patient SNS: all twelve meds unpaged, derived
        from the monitor's `MED_PAGES` so the console and the monitor cannot drift
  - [x] Per-med tally of doses given this attempt, counting the whole run rather than only console
        presses, incremented optimistically and rolled back on a failed write
  - [x] SAMPLE and OPQRST presses logged in both directions, reading as a sentence a debrief quotes
  - [x] Both credited to the trainee and marked `by instructor`, not split into a second stream
  - [x] Controller-authorized `POST /api/session/[code]/instructor-event`; participant scoped to the
        room, `source` stamped server-side, insert path shared with the monitor, no false `behind`,
        and a read-only second device refused with 409
  - [x] Credit resolved against the live roster each render, so a leaver or New Attempt cannot
        strand a stale id; picker only when there is a choice; disabled with a stated reason
  - [x] SAMPLE/OPQRST answers and Pulse/Respiratory/Skin findings reach the report, stripped from
        the `session_state` the trainee polls and kept only in `session_state_history`
  - [x] Carries into persistent Evaluation reports for free: Phase 5 snapshots whole
        `student_events` rows, and `ReportsPage` renders through the same panel
  - [x] Verified 1,293 tests passing, TypeScript clean, ESLint 0 errors and 12 pre-existing
        warnings (none in the changed files), production build clean with the new route registered
  - [ ] **Apply `20260908120000_instructor_recorded_actions.sql`** — until it runs, the live
        `student_events_kind_check` rejects `sample_ask` and `opqrst_ask`, so every checklist press
        fails with a 400 while the med grid works
  - [ ] Visual check of the three-column tab in a signed-in console (invite-only sign-in put this
        out of reach of automated browser verification)
- [x] **Vercel spectator test type-check fix — COMPLETE:**
  - [x] Remove the retired `hostToken` prop from the restartable Floating Spectator test harness
  - [x] Verify the focused spectator tests, full suite, TypeScript, ESLint, and production build
- [x] **Phase 17 floating-corner enhancement — COMPLETE:**
  - [x] Add a primary-pointer drag grip with a 6px threshold, viewport containment, target preview,
        player-center quadrant selection, four safe-area anchors, and reduced-motion-aware snapping
  - [x] Add adjacent-corner arrow-key movement, accessible naming, focus treatment, and live position
        announcements while preserving the inert monitor surface
  - [x] Preserve the selected corner across console, trainee, attempt, dock, and fullscreen changes;
        cancel interrupted gestures and reset to bottom-right on Stop Spectating or reload
  - [x] Verify 1,091 tests, TypeScript production build, ESLint, and a live 1280×720 instructor room
        with exact 16px corner geometry, full 360×280 size, real pointer drag, and clean browser logs
- [x] **Phase 17 presentation modes — COMPLETE:**
  - [x] Record the confirmed Docked, fixed Floating, and native Fullscreen behavior and lifecycle
  - [x] Implement persistent accessible controls, mode return state, fullscreen rejection status,
        safe-area-aware mini-player sizing, uniform fullscreen scaling, and reduced-motion handling
  - [x] Preserve one projection hook while switching presentation modes and trainee identity
  - [x] Complete integration, accessibility, full-suite, build, and rendered-browser verification:
        1,059 tests, TypeScript, ESLint with 0 errors and 12 pre-existing warnings, production build,
        and a live instructor/trainee Floating + Fullscreen browser flow with clean console logs
- [x] **Phase 17 presentation enhancement — Embedded Spectator — COMPLETE:**
  - [x] Replace Live Evaluation with equal 480px-high room-control and Embedded Spectator columns
  - [x] Define vertically stacked room controls, bounded Students scrolling, and two-line roster rows
  - [x] Define single transient selection, direct switching, Stop Spectating, selected-only polling,
        stable roster order, and selected-row styling
  - [x] Define safe frame clearing on switch, enabled offline/waiting selection, lifecycle behavior,
        compact status metadata, and uniformly contained black-background rendering
  - [x] Preserve the standalone route for a possible different future use
  - [x] Receive final confirmation of the complete design
  - [x] Implement one abortable selected-only polling path shared with the standalone route
  - [x] Keep full-screen dispatch overlays inside the preview and uniformly scale the complete
        simulator canvas with black letterboxing and no crop/reflow
  - [x] Keep the final frame after End Room by removing the instructor redirect
  - [x] Verify 999 tests, TypeScript, ESLint with zero errors and 12 pre-existing warnings, the
        production build, and a real instructor/trainee browser flow with clean console logs

---

## Blocked / Needs Input
- [ ] **12-lead waveform assets** — User to provide gif/mp4 12-lead waveforms in `/public/waveforms/12lead/<rhythm>/<lead>.gif` for each rhythm × lead (I, II, III, aVR, aVL, aVF, V1–V6). ECG/SpO2/EtCO2 are now canvas-rendered and no longer need assets.
- [ ] **Supabase credentials** — Needed for deployed sessions. Copy URL + anon key + service role key into Vercel/local env, run migrations `001` through `003`, and enable Realtime on session tables if replacing polling with subscriptions.
- [ ] **Paramedic-supplied waveform videos** — Real ECG/SpO2/EtCO2/12-lead videos for production fidelity (later phase).
- [ ] **Neonate joule default** — Set to 10J. Confirm with paramedic friend.

---

## Architecture Decisions (locked)
| Decision | Value |
|----------|-------|
| Main ECG | Canvas + requestAnimationFrame |
| SpO2 / EtCO2 | Canvas + requestAnimationFrame (shared renderer) |
| 12-lead | `<video loop muted autoplay>` |
| CPR visual | Blue banner + CPR timer |
| Language | English |
| Session routing | `/session/[code]/instructor` vs `/session/[code]/monitor` |
| Realtime | Polling with `?since=` is the guarantee; Supabase Realtime is a nudge only (`docs/adr/0003`) |
| Post-shock | Instructor controls manually |
| Send behavior | Staged commit (pending state → Send → broadcast) |

---

## Next Steps (for whoever picks this up)
1. **Admin/instructor dashboard** — build the controls panel (vitals inputs with pending/Send flow, rhythm selector, defib panel, scenario builder skeleton). Components already scaffolded in `src/components/instructor/`. State via Zustand `instructorStore`. Local-only first; realtime wires in the next phase.
2. **Realtime wiring** — Supabase Broadcast for instructor → monitor sync (vitals_update, defib_event, cpr_toggle).
3. **Sessions** — restore `/session/[code]/...` routes; connect landing page (Create / Join).
