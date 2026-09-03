# CHANGELOG.md — Paramedic Monitor

> Append-only. Add a new entry at the TOP when completing work. Never edit past entries.
> Format: `## [YYYY-MM-DD] [role] — description`

---

## [2026-09-02] [planning/instructor] — Define automatic Asystole FC lock

- Required active Asystole in the Instructor Console to set and save FC at `0 bpm`, automatically turn FC On, and disable both the FC number editor and FC On/Off toggle.
- Required every direct, auto-sort, timed-vitals, scenario, and hydration path to preserve the automatic zero, while leaving Asystole or switching its ECG Off restores the interaction's prior manual FC and unlocks both controls.
- Extended the existing automatic VF/VT testing contract to cover Asystole store, component, scenario, and hydration behavior. No ADR was added because this extends the existing automatic-FC mechanism without changing its architecture.

## [2026-09-02] [planning/monitor] — Add state-driven Wagami X vital placement

- Replaced the Wagami X resting `APPL ELECT.` banner and its three lower boxes with four equal-width, full-featured FC, PNI, EtCO2, and SpO2 cells in the existing 110px bottom region. Removed the dormant Apply Electrodes component and kept the existing vital data, units, alarms, PNI phases, SpO2 pulse bar, French labels, selection identifiers, and navigation behavior.
- Made the first accepted physical Analyze or Charge action move vitals instantly to the existing 96px right column for the remainder of the attempt. Charge-family states now retain the energy scale and readable defib-status content beside the right vital column; power-off/on, monitor reset, and New Attempt restore the resting layout.
- Preserved the minus control's expanded-waveform behavior by temporarily moving resting vitals right while collapsed. The left Call Info/Analyse soft key, 12-lead and overlay layouts, outer-shell control order/functionality, Enter-on-PNI behavior, and Wagami Z remain unchanged.
- Documented the state contract in `PLAN.md`, `CONTEXT.md`, and ADR 0002. Added component and monitor integration regressions; all 898 tests and TypeScript pass, and ESLint reports 0 errors with 12 pre-existing warnings. The Next.js webpack production build passes; the default Turbopack build remains blocked by the known host `EPERM` failure in its spawned PostCSS process.
- Rendered browser QA passes at `1280×720` and `1024×768` for resting, Analyze, Charge, collapse/restore, and 12-lead transitions. The 1024px resting region measures 541×110px with four 135×109px cells; both tested viewports have no clipping or horizontal/vertical overflow, and the browser console is clean.

## [2026-09-01] [instructor] — Expand and center Monitor & Patient SNS controls

- Added the centered Monitor-only `1152px` breakout and approximately `8:5` large-landscape split, growing Vitals to about `700px` while keeping SAMPLE/OPQRST near `438px` and leaving other instructor tabs at the existing width.
- Enlarged and horizontally centered the Vitals inputs/toggles, ECG, CPR, timed-vitals buttons, SNS cards/options, checklist buttons, fields, text, and icons at the `1280×800` capability breakpoint; compact short landscapes and the sub-1024 stacked fallback remain unchanged.
- Tightened outer console spacing through `900px` height so the enlarged `1440×900` tab fits completely without reducing the approved control targets. Added component/page regressions; all 890 tests and TypeScript pass, ESLint reports 0 errors with 12 pre-existing warnings, and the Next.js webpack production build passes. Playwright Chrome QA passes at `1440×900`, `1280×720`, `1080×700`, and stacked `900×900` with correct geometry, interaction state, viewport fit, no horizontal overflow, no framework overlay, and no console errors. The default Turbopack build remains unverified because its spawned PostCSS process hit a host `EPERM` path restriction.

## [2026-09-01] [planning/instructor] — Define expanded Monitor & Patient SNS layout

- Approved a Monitor-only centered breakout up to approximately `1152px` at landscape viewports of at least `1280×800`, with an approximately `8:5` Vitals-to-SAMPLE/OPQRST split that grows Vitals by roughly one third without widening other instructor tabs.
- Required horizontally centered contents and larger interaction targets across Vitals, SNS, SAMPLE, and OPQRST at the expanded breakpoint, while preserving equal checklist-panel heights, bounded note/result overflow, and the clinical grouping.
- Preserved compact complete-tab fit at `1080×700` and `1280×720`, full enlargement at `1440×900`, the landscape iPad compact layout, and the sub-1024/portrait stacked fallback. No ADR was added because the change is a reversible presentation rule without architectural lock-in.

## [2026-09-01] [monitor] — Show calibrated disconnected EtCO2 baseline

- Changed the calibrated Wagami X EtCO2 display to show numeric `0` and preserve the selected row with the standard dashed disconnected trace whenever the instructor-confirmed channel is Off.
- Preserved instructor-On behavior with the configured value and live capnogram, including connected zero, and made later instructor changes apply immediately without another calibration pass.
- Aligned Vital Log sampling with the trainee-visible calibrated value and kept Wagami Z, reset, cancellation/restart, and the 45-second calibration flow unchanged.
- Added normal/expanded waveform component coverage and monitor integration regressions for instructor-Off, post-calibration changes, mid-calibration changes, connected zero, and Vital Log output. All 889 tests, TypeScript, ESLint (0 errors; 12 pre-existing warnings), and the production build pass; rendered browser QA confirms the live `0`/dashed ↔ `35`/waveform transition with a clean console.

## [2026-09-01] [planning/monitor] — Define calibrated EtCO2 channel semantics

- Distinguished trainee-local Wagami X EtCO2 calibration from the instructor-confirmed EtCO2 channel state: calibration remains valid through instructor changes until monitor reset.
- Defined calibrated instructor-Off output as numeric `0` plus the standard dashed disconnected trace, and instructor-On output as the configured value plus live waveform, including a connected configured value of `0`.
- Required immediate post-calibration instructor changes, latest-state resolution for changes made during calibration, consistent normal/expanded waveform behavior, and Vital Log sampling of the trainee-visible value.
- Reconciled the documented calibration duration and progress direction with the existing 45-second left-to-right runtime; no ADR was added because this display rule is local, reversible, and does not create architectural lock-in.

## [2026-08-31] [instructor] — Implement compact two-column Monitor & Patient SNS

- Split the local and live Instructor Console tab into an approximately 55/45 Vitals-left and SAMPLE/OPQRST-right grid, kept the two right panels equal-height, compressed the existing clinical controls, bounded unusually long notes/results internally, and added a stacked sub-1024/portrait fallback.
- Changed Pulse and Respiratory to show only their icon/title at rest, transform the complete card surface into equal `15s`, `30s`, and `Tap` actions on hover, keyboard focus, or pinned touch, and reuse that surface for persistent amber countdown state. Added outside-click/Escape dismissal, one-card touch pinning, focus restoration, and reduced-motion behavior.
- Fixed Tap measurement toggling: revealing takes a fresh snapshot, while activating Tap again hides the visible result without undoing the confirmed finding.
- Added hook, component, and admin-page regressions. All 882 tests, TypeScript, ESLint (0 errors; 12 pre-existing warnings), and the Next.js production build pass; rendered QA passes at `1080×700`, `1280×720`, `1440×900`, iPad 8 landscape `1024×768`, and the portrait stacked fallback with no horizontal overflow or browser-console errors. A real iPad 8th-generation Safari pass remains pending device availability.

## [2026-08-31] [planning/instructor] — Complete responsive SNS design decisions

- Defined the sub-1024/portrait stacked fallback, short-viewport console spacing, unchanged global maximum width, approximately 36–40px checklist density, and at-least-44px SNS options.
- Required persistent amber pending, green confirmed, and amber countdown styling across each fixed-size card transformation, plus reduced-motion behavior and deterministic keyboard-focus restoration.
- Made automated interaction tests and rendered checks at all accepted viewports mandatory, with a real iPad 8th-generation Safari checklist that must be reported as pending when the device is unavailable.
- Completed the design-tree interview without selecting an ADR: this responsive component treatment is reversible, unsurprising outside its documented requirements, and does not introduce an architectural lock-in.

## [2026-08-31] [planning/instructor] — Define compact-layout acceptance and SNS result behavior

- Set rendered acceptance at `1080×700`, `1280×720`, and `1440×900`, with no horizontal overflow and complete ordinary-content tab fit at each viewport.
- Kept Vitals' internal clinical organization while requiring compressed fixed dimensions; defined equal-height stacked SAMPLE/OPQRST panels with approximately 36px controls, stable two-line fields, and bounded note scrolling.
- Capped independent Pulse/Respiratory results at approximately three visible lines, limited pinned touch disclosure to one idle card, and made Tap hide a visible result without unconfirming while taking a fresh snapshot whenever it reveals a hidden result.
- Added the corresponding component, page, interaction, and rendered-layout testing requirements to Phase 6.

## [2026-08-31] [planning/instructor] — Define compact two-column Monitor & Patient SNS layout

- Replaced the vertically stacked Instructor Console composition with an approximately 55/45 layout: compact Vitals on the left and compact SAMPLE above OPQRST on the right, shared by local and live-room instructor views.
- Recorded MacBook/desktop as the primary instructor display, landscape iPad 8th generation as a supported secondary instructor display, and iPad 8th generation as the ordinary trainee display for Wagami X and Wagami Z.
- Defined no horizontal scrolling on supported layouts, tab-level fit for ordinary content, bounded overflow for unusually long notes/results, and allowance for live-room content above the tabs to extend the page vertically.
- Replaced always-visible Pulse/Respiratory measurement rows with an icon/title surface that transforms into three equal options on hover, keyboard focus, or pinned touch disclosure; countdowns occupy that surface, results remain below it, and a repeated Tap action hides the visible result for that group.

## [2026-08-29] [planning/instructor] — Define timed Pulse and Respiratory measurements

- Replaced the planned immediate Pulse/Respiratory icon-toggle interaction with icon-contextual `15s`, `30s`, and `Tap` measurement options, cancellable timed rows, completion-only confirmation, and exact snapshot-based result semantics.
- Defined display-only nearest-whole derived counts, canonical respiratory-effort terminology, missing-data behavior, independent simultaneous countdowns, tab-surviving absolute timing, and cancellation boundaries for scenario changes, refresh, and New Attempt.
- Defined fully independent Pulse/Respiratory countdowns and result visibility, non-interaction with Skin/Extremities and Scene/Environment, and real-deadline off-tab completion that confirms and dirties the scenario draft. Added the domain terms SNS measurement option, SNS measurement countdown, SNS measurement result, and respiratory effort.

## [2026-08-29] [instructor] — Add safe scenario row actions and styled confirmations

- Renamed the surface to Instructor Console and removed the obsolete local-only/waiting-tab guidance, Supabase-library subtitle, Caller Info Analyse label, and Caller Info Save/Delete controls.
- Added Save/Delete to every saved-scenario row. Save is enabled only for the loaded dirty scenario; deletion works without loading and preserves any different loaded editor, while deleting the loaded scenario retains its values as a selected local draft.
- Added `New Scenario` with selected local draft rows, live `Untitled Scenario`/title labels, title-only dirty support, confirmed local deletion, selected-folder expansion, and virtual `Folder 1` behavior until the first save.
- Replaced every Scenarios-tab native confirmation with a reusable accessible amber/dark/cyan dialog. Backdrop clicks, Escape, and Cancel are non-destructive; focus is trapped and restored. Empty folder deletion now confirms, and all folder/scenario mutations lock during active attempts.
- Added component and integration regressions for copy removal, row action gating, loaded/unloaded deletion, draft creation/save/delete, empty-library behavior, unconditional folder confirmation, active-attempt locking, and dialog styling/focus/dismissal. All 869 tests, TypeScript, ESLint (0 errors; 12 pre-existing warnings), and rendered 1366×768/1024×768 browser QA pass with no horizontal overflow or console errors.

## [2026-08-27] [session/db] — Store the drill evaluation record and close legacy anon access

- Added `session_state_history`: an append-only row per instructor Send carrying the attempt, version, and full shared state. `session_state` is still upserted unchanged, so the 1.5s student poll never reads history — it is written beside the hot path, not on it, and a failed history write logs rather than costing the room a Send.
- Stamped `student_events.state_version` at insert from the live state version, so every trainee action joins back to the exact patient state it was taken against. An evaluator can now answer whether a shock matched the rhythm on screen, which no stored data supported before.
- Instrumented the remaining trainee controls: `nibp_start`, `nibp_result`, `power_on`, `power_off`, `twelve_lead`, `twelve_lead_capture`, `print`, `etco2_toggle`, `energy_change`, `treatment_menu`, `patient_info`. The BP button previously wrote only to the trainee's local store and never reached the server. CPR stays out — it is instructor-driven and captured by state history. `kind` is now pinned by a DB check constraint and validated server-side; it was free text taken straight from the request body.
- Collapsed duplicate participants and added `unique (session_id, lower(nickname))`; `joinSession` now reclaims an existing row by nickname instead of inserting a second one. A cleared `localStorage` or a second device used to split a trainee's events across two ids. Accepted trade-off recorded in PLAN.md 12e: room code plus nickname is now enough to assume an identity.
- Scoped `getReview` to a single attempt (`?attempt=N` or `all`), added an explicit limit that reports truncation instead of hiding it, and indexed `(session_id, attempt_version, occurred_at)`. The old unscoped ascending query let PostgREST's 1000-row cap silently drop the newest rows, so the instructor's live roster could stop updating with no error. Also began writing `participant_attempts.completed_at`, which nothing had ever set.
- Dropped the seven RLS policies migration 001 left open to the anon key and dropped the unused `vitals_snapshots` table. `sessions: public read` exposed every room code, and a room code is the entire join credential. Repointed the health check off `scenarios` onto `sessions`.
- Added a recording Supabase query stub plus 40 regressions across the service, review route, and monitor instrumentation. All 851 tests, TypeScript, ESLint (0 errors; 12 pre-existing warnings), and the Next.js production build pass. Migrations 006 and 007 have not been applied to a live project yet.

## [2026-08-27] [monitor] — Complete the responsive Wagami Z reference redesign

- Rebuilt the Wagami Z shell and touchscreen from measured reference landmarks, including the faceplate, bezel, right controls, lower body, speaker, fixed clinical lanes, French mode/action labels, PI, shock count, and device-status decoration.
- Added safe-area-aware live visual-viewport fitting for supported landscape displays, exact state-preserving French portrait/undersized fallbacks, and a Wagami-Z-only escape from the existing desktop minimum-width rule.
- Preserved live instructor-driven waveforms/vitals, the repeatable two-second centered-WAGAMI power cycle, immediate PNI, and accessible but inert non-power controls.
- Added hook and component regressions. All 822 tests, TypeScript, ESLint (0 errors; 12 existing warnings), and the production build pass; rendered 1024×768 and 1180×820 landscape QA plus portrait/narrow, power, inert-control, live-data, and restoration checks pass.

## [2026-08-27] [planning/monitor] — Complete Wagami Z responsive design discovery

- Set measurable ±2% primary and ±4% decorative landmark tolerances, with visual review for material rendering and antialiasing.
- Required live Safari visual-viewport refitting, fixed simulated-device typography, and a pure-black state-preserving unsupported-display surface.
- Made automated and rendered QA completion requirements and added a non-blocking real-iPad validation checklist; recorded the capability-based fixed-aspect decision in ADR 0001.

## [2026-08-27] [planning/monitor] — Resolve Wagami Z iPad mini semantics

- Defined the device surface by a landscape safe CSS viewport of at least 1024×700 rather than by iPad model detection.
- Excluded iPad mini from testing, certification, optimization, and dedicated layouts without actively blocking a mini that happens to satisfy the general capability rule.
- Preserved the non-mini iPad QA matrix and removed the contradictory requirement for a guaranteed mini-only fallback.

## [2026-08-27] [planning/monitor] — Define Wagami Z fit and responsive acceptance

- Selected exact French portrait and unsupported-viewport copy, a Wagami-Z-only exception to the desktop minimum width, uniform desktop/iPad fit targets, and no cropping or axis distortion.
- Defined PI and shock-count decoration from existing monitor state, a four-viewport rendered QA matrix, and measured Image #1 landmark acceptance instead of visual inspection alone.
- Kept iPad mini exclusion open because its landscape CSS viewport can pass the proposed `1024×700` capability threshold; implementation remains blocked on the intended exclusion semantics.

## [2026-08-27] [planning/monitor] — Define Wagami Z fidelity and unsupported displays

- Explicitly excluded iPad mini, portrait, and narrow iPad windows from the rendered monitor surface and selected a minimal French blocking screen rather than clipping or compact reflow.
- Selected a fully code-native rebuild of the reference shell, physical controls, materials, lower body, bezel, touchscreen proportions, density, scales, status decoration, and copy without committing the raster concept.
- Preserved live instructor-driven waveform/rhythm semantics and the existing power-only functional boundary while permitting larger invisible touch targets around visually faithful controls.

## [2026-08-27] [planning/monitor] — Define the Wagami Z training-display contract

- Made the iPad training display primary over the occasional 1920×1080 development display and limited the simulator to landscape orientation.
- Selected full-screen Safari and standalone/PWA support with safe-area-aware uniform scaling of one fully visible fixed-aspect shell; narrow multitasking windows and portrait compositions will not compress or crop the device.
- Required visually faithful controls with enlarged invisible touch targets and an explicit iPad mini support attempt governed by readability and touch criteria.

## [2026-08-27] [planning/monitor] — Expand Wagami Z display support to iPad

- Reopened the Wagami Z visual composition after the implemented render diverged from the approved reference and identified viewport aspect ratio as distinct from physical monitor resolution.
- Defined the occasional 1920×1080 development display and the multi-resolution iPad training display as separate domain terms.
- Replaced the desktop-only composition assumption with a pending two-display contract; orientation, Safari/standalone/window behavior, safe areas, minimum viewport, scaling, and fidelity remain to be resolved before implementation.

## [2026-08-27] [repository] — Keep Wagami Z source media local-only

- Added ignore rules for the captured source-video frames, original reference-image convention, transcript exports, and reference-derived Wagami Z concept PNGs so they cannot be added to the public repository accidentally.
- Kept the original research document tracked while replacing local frame links with source-video timestamps and recording the public-repository media policy in the plan and status.

## [2026-08-27] [monitor] — Implement the Wagami Z live monitor surface

- Replaced the Wagami Z post-dispatch placeholder and `/?dev=2` screen with one full-shell production component that consumes live instructor vitals, waveforms, CPR/VF/VT display semantics, fixed channel state, patient category, device timer, and energy.
- Added the French DEA touchscreen, WAGAMI/Z branding, right-side CHOC/CHARGE/rotary controls, complete blue-and-silver shell depth, visual-only alarms, immediate PNI, and accessible inert feedback for every non-power control.
- Added a repeatable off → two-second centered-WAGAMI boot → on power cycle, with timer reset and off/boot/on indicator states; the video-derived manual/AED workflows remain deliberately deferred and documented.
- Added component and route regressions; all 817 tests pass with four workers, TypeScript and the production build pass, ESLint has zero errors (12 existing warnings), and rendered 1242×736 browser QA confirms the live and boot states with a clean console and no framework overlay.

## [2026-08-27] [research/monitor] — Document the Wagami Z video reference

- Inspected the complete 4:08 manual/AED defibrillation video, exported its transcript, and captured representative frames for power, manual energy/charge/shock/disarm, AED analysis/CPR/pause, advanced monitoring, and mode switching.
- Identified AED-paused advanced monitoring as the supplied still's baseline state and documented the device anatomy, screen hierarchy, workflow states, and project-specific branding/language/boot overrides.
- Preserved the frame set under `screenshots/wagami-z-video/`, added `docs/research/wagami-z-defibrillation-video.md`, and explicitly kept the discovered defibrillation workflows outside the current power-only functional boundary.

## [2026-08-27] [planning/monitor] — Complete Wagami Z power-state definition

- Defined repeatable shutdown and reboot behavior, with immediate black-screen power-off and timer reset.
- Defined the timer as stopped at `00:00:00` while off/booting and running only after the two-second boot completes.
- Limited boot visuals to a large centered white `WAGAMI` wordmark on black and defined dark-green, pulsing-amber, and bright-green power indicators for off, booting, and on.

## [2026-08-27] [planning/monitor] — Define Wagami Z power behavior

- Corrected the inert-control boundary: power is functional on Wagami Z, while every other outer-shell and touchscreen control remains an accessible visual no-op.
- Defined normal dispatch entry as powered off, followed by the existing two-second power-button boot with a large centered `WAGAMI` wordmark; `/?dev=2` remains an already-on direct-development shortcut.
- Required Wagami X parity for automatic VF/VT display behavior, CPR overrides, channel activation, and rhythm disconnection.

## [2026-08-27] [planning/monitor] — Define Wagami Z monitoring behavior

- Defined fixed live ECG, EtCO2, and SpO2 lanes plus FC, EtCO2, SpO2, and PNI values, with stable geometry for inactive channels.
- Made immediate confirmed PNI an explicit temporary exception until a separately specified Wagami X-equivalent cuff interaction replaces it.
- Defined fixed DEA presentation, live confirmed patient category/date/time/timer/energy, static healthy device indicators, visual-only alarm flashing, and the canonical French control labels including `PNI` and `12 LEAD`.

## [2026-08-27] [planning/monitor] — Define the Wagami Z live monitor surface

- Replaced the temporary post-dispatch Wagami Z placeholder requirement with a distinct full-screen device that consumes the attempt's live confirmed waveforms and vitals.
- Defined WAGAMI/Z branding, French clinical and control labels, a complete uncropped front shell without external cables, and the reference-derived physical and touchscreen control placement.
- Defined all Wagami Z controls as accessible inert controls with hover, focus, and press feedback but no audio, navigation, state change, or trainee event; implementation remains pending the rest of the design interview and explicit approval.
## [2026-08-26] [instructor/monitor] — Add Wagami defibrillator model selection

- Added a fourth Defibrillators tab with staged Wagami X/Z selection, Wagami X defaults, Save → Send integration, Start gating, active-attempt locking, and New Attempt preservation.
- Extended version-1 scenario snapshots and shared session state with backward-compatible model normalization; Wagami Z alone is saveable scenario content and scenario load/unload is blocked during active attempts.
- Kept the existing student caller-info, acknowledgement, countdown, arrival, and Go to Monitor flow for Wagami Z, then replaced the device with a centered black Work In Progress screen. Added `/?dev=2` for the placeholder while preserving `/?dev=1` as Wagami X.
- Added store, scenario, component, admin, and monitor regressions. All 811 tests, TypeScript, ESLint (0 errors; 12 pre-existing warnings), and the Next.js 16.3 webpack production build pass; rendered 1366×768 in-app browser QA verified the selector stages and both development shortcuts with clean consoles and no framework overlays.

## [2026-08-26] [scenarios/ui] — Support independent folders and black SNS active controls

- Decoupled scenario-folder expansion from the selected save destination: all folders start closed, any number can remain open, all can be closed, expansion survives admin-tab switches, and closed save targets remain highlighted. New folders open automatically and selected-folder deletion falls back without disturbing other expansions.
- Reworked the scenario panel around per-folder lists so simultaneous folders retain correct row loading, accessible regions, ordering, drag/drop, and cross-folder updates without changing APIs, database schema, saved snapshots, or realtime state.
- Changed confirmed Pulse, Respiratory, and Skin/Extremities controls from solid green to black fills with ECG-green borders, exact-color masked icons, and green labels while preserving pending amber states and slider confirmation behavior.
- Added component and admin integration regressions. All 794 tests, TypeScript, ESLint (0 errors; 12 pre-existing warnings), and the Next.js 16.3 webpack production build pass; rendered 1366×768 in-app browser QA verified initial/multiple/all-closed folder states, tab persistence, computed SNS colors, clean console output, and no framework overlay.

## [2026-08-25] [instructor/monitor] — Move actions and automate VF/VT heart rate

- Moved the shared Save/Send controls into a left-aligned row immediately above the admin tab strip while preserving staged Save → Send behavior.
- Centralized automatic rhythm handling: VF activates and locks underlying FC at 190 while showing `AUTO 190–220`; VT activates and locks FC at 220. Direct, batch, timed-vitals, scenario, reset, and hydration paths cannot overwrite these values, and leaving an automatic rhythm restores the interaction's previous manual FC or the 80 fallback.
- Added visible-only inclusive VF digit changes on the existing 1.9-second flash cadence, deterministic room alignment from the shared state version and server timestamps, fixed underlying cadence/alarm/log/capture consumers, CPR precedence, and fixed VT 220 display behavior without changing shared payloads or scenario schema version.
- Added server-time metadata to session-state GET responses, synchronization timing output, Next.js 16-compatible route wrappers, and store/component/page/hook/API regressions. All 791 tests, TypeScript, ESLint (0 errors; 13 pre-existing warnings), and the webpack production build pass; desktop browser QA confirmed placement, locking, Save/Send, VF cycling, CPR suppression, VT stability, clean consoles, and no framework overlays.

## [2026-08-20] [ui] — Combine Monitor and Patient SNS controls

- Renamed the admin Monitor tab to Monitor & Patient SNS, removed the Patient Information tab, and moved its preserved SAMPLE/OPQRST editor directly below Vitals.
- Extracted Pulse, Respiratory, and Skin/Extremities into a dedicated three-column Patient SNS row inside Vitals; Patient Physical now contains only Scene/Environment, the body map, and selected findings.
- Made an off ECG retain and expose its remembered rhythm as `Rhythm (Off)` with the matching category and option highlighted, while rhythm selection still turns ECG on.
- Removed the Vitals Normal control and shared admin Reset control without changing stores, realtime payloads, saved-scenario schemas, API formats, or the successful live-session New Attempt reset.
- Added component and integration regressions. All 76 focused tests and 774 full-suite tests pass; ESLint has no errors, the production build succeeds, and rendered localhost admin QA confirms the layout and interactions with a clean console.

## [2026-08-20] [scenarios] — Start Caller Info minimized

- Changed the Caller Info editor to initialize collapsed on every mount/page load while retaining its accessible `+`/`−` toggle and non-persisted state.
- Updated component and admin integration regressions so editing flows explicitly expand Caller Info and the default-state test verifies hidden Title, auto-sort, fields, and scenario actions.
- Verified all 22 focused tests and rendered 1280×720 collapsed, expanded, and reload states with no browser console warnings, errors, or framework overlay.

## [2026-08-20] [scenarios] — Fix scenario reorder constraint resolution

- Fixed `reorder_saved_scenarios` failing with `constraint "saved_scenarios_folder_position_key" does not exist` by schema-qualifying the constraint while retaining the function's secure empty search path.
- Added a forward-only migration and regression assertion, preserved service-role-only execution, and deployed migration `20260820194954` to the configured Supabase project.
- Verified 14 focused migration/service/API tests, matching local/remote migration history, error-free linked schema lint, no error-level advisor findings, and a live no-op reorder returning 200 with the existing Medical scenario order intact.

## [2026-08-20] [scenarios] — Implement and deploy scenario library organization update

- Removed General's schema and UI protections while preserving its folder and scenarios as ordinary data; all folders are renameable/deletable, non-empty deletion warns once and cascades, and deleting the active scenario clears authoring drafts without changing confirmed student-visible state.
- Added persisted per-folder positions with atomic service-role-only reorder, append-on-move, and empty-library `Folder X` creation/save operations; exposed typed APIs for auto-create saves and complete folder ordering.
- Replaced per-row Load buttons with accessible row load/unload toggles, added above/below drag targets and compact Up/Down controls with optimistic rollback, retained cross-folder moves, and made the entire Caller Info editor collapsible.
- Added migration, service, API, component, and admin integration regressions. All 770 tests, TypeScript, Supabase schema lint/advisors, ESLint, production build, and rendered 1024×768/1366×768 QA pass; migration `20260820192736` is deployed and its columns, constraints, indexes, functions, grants, and preserved data were verified remotely.

## [2026-08-18] [scenarios] — Fix Vercel TypeScript build failure

- Removed the unsupported explicit type argument from the scenario-service test's Vitest `toMatchObject` assertion and cleaned up its unused import.
- Verified all six focused service tests, `tsc --noEmit`, and the full Next.js production build, including the scenario API routes.

## [2026-08-18] [scenarios] — Deploy and verify scenario-library migrations

- Reconciled the existing remote schema with local migration history by recording migrations `001` and `002`, then deployed migrations `003`, `004`, and `005` to the configured Supabase project.
- Verified matching local/remote versions `001`–`005`, no pending dry-run migrations, the participant token index, removed public-read policies, both RLS-enabled scenario tables, the single General seed row, all three triggers, and service-role-only scenario RPC access.
- Confirmed the service role has complete CRUD privileges on both scenario tables. Supabase advisors report two non-blocking mutable-search-path warnings on the trigger functions for follow-up hardening.

## [2026-08-18] [scenarios] — Implement folder-based Supabase scenario library

- Made Scenarios the default first admin tab, preserved the full Caller Info editor, and added the Title field, fixed-height folder accordion, inline folder management, highlighted updated-first scenario rows, drag/drop and accessible moves, and green Save/red Delete actions.
- Added versioned full-authoring snapshots with direct stage-only restoration across monitor, caller info, patient information, and patient physical drafts; manual edits, dirty/reverted disabling, discard confirmation, blank-title numbering, and delete-retain-draft behavior are covered.
- Added RLS-protected folder/scenario tables, protected General behavior, transactional number allocation and folder deletion, typed service-role APIs, and a centralized future authorization boundary while leaving the legacy timed-state table unchanged.
- Added snapshot, store, service, API, component, and admin integration coverage; all 757 tests pass, Supabase schema lint reports no errors, ESLint has no errors (12 pre-existing warnings), the production build succeeds, and rendered 1024px QA confirms the new layout and tab interactions. Migration `005` remains to be deployed to the configured live Supabase project.

## [2026-08-18] [scenarios] — Define folder-based Supabase scenario library

- Replaced the deferred timed-state scenario-builder requirement with a global folder library for reusable full-draft scenario snapshots.
- Defined immutable General-folder behavior, custom folder CRUD, updated-first scenario rows, drag/drop moves with an accessible fallback, smallest-unused fallback numbering, and stage-only loading.
- Defined the snapshot boundary, typed server API and RLS architecture, dirty-state behavior, deletion behavior, and the required unit, integration, API, and rendered-browser coverage.

## [2026-08-18] [monitor] — Add Regular and Weak CPR override modes

- Replaced the single admin CPR toggle with mutually exclusive side-by-side Regular CPR and Weak CPR controls that switch directly and turn off when the active mode is pressed again.
- Regular CPR preserves FC/trace cadence at 120, while Weak CPR uses FC/trace cadence 90 with the same compression shape and amplitude; both drive monitor FC, alarms, ECG, SpO2 graph/pulse bar, and vital-log snapshots without changing saved vitals or EtCO2/defibrillator behavior.
- Added typed, persisted, and session-synchronized CPR modes with migration from the legacy boolean and mixed-version shared-state compatibility.
- Added store, instructor, monitor, waveform, persistence, and session regressions; all 737 tests pass, the production build succeeds, ESLint has no errors (12 pre-existing warnings), and rendered 1280×720 Browser QA confirmed layout, direct switching, Off behavior, FC 90, ECG/SpO2/pulse-bar HR 90, and clean console/framework state.

## [2026-08-18] [monitor] — Increase call-info row spacing

- Adopted the preferred uniform `gap-3` spacing for every assignment-detail header/value group, including lists with optional/custom fields.
- Updated the documented layout requirement and component regressions to match; the focused CallerInfoModal suite passes all 22 tests.

## [2026-08-18] [monitor] — Strengthen and space call-info rows

- Made the seven standard assignment-detail headers visibly heavier with a subtle 0.35px text stroke and added a 4px gap between each standard header/value group.
- Kept optional/custom assignments compact so extra rows continue to fit the fixed, non-scrolling desktop panel; values, classic caller info, and all behavior remain unchanged.
- Added focused emphasis and adaptive-spacing regressions; all 732 tests pass, ESLint has no errors (12 pre-existing warnings), and rendered 1280×720 Browser QA confirmed the computed stroke and gap, full panel containment, no page overflow, and correct Back/reopen behavior.

## [2026-08-18] [monitor] — Enlarge complete standard call-info rows

- Extended the 18px Call Assignment sizing from the seven standard labels to their values, including long Nature of Call, Caller Info, and Updates content; optional/custom rows remain compact.
- Tightened label line-height, removed redundant row gaps, and reduced title-to-list spacing so the enlarged wrapping content remains fully visible without adding scrolling or changing the classic variant.
- Updated regressions with the full supplied scenario text; all 732 tests pass, ESLint has no errors (12 pre-existing warnings), and rendered 1280×720 Browser QA confirmed exact 18px row text, 3.5px panel clearance, no horizontal overflow, Back/reopen behavior, and clean console/framework state.

## [2026-08-18] [monitor] — Enlarge standard call-info assignment labels

- Increased Call #, MPDS Code, Address, Nature of Call, Caller Info, Updates, and Call Received to the same 18px size as Call Assignment.
- Kept field values at 12px and optional/custom extra labels at 10px so the requested sizing change does not alter unrelated content or the classic variant.
- Expanded palette regressions with sizing boundaries; all 732 tests pass, ESLint has no errors (12 pre-existing warnings), and rendered 1280×720 Browser QA confirmed every label size, full panel fit, Back/reopen behavior, and clean console/framework state.

## [2026-08-18] [monitor] — Normalize call-info assignment label colors

- Changed the assignment dashboard Response Timer, Call Assignment, dynamic priority, and Lights & Sirens text to the same white treatment as New Assignment.
- Standardized every assignment-detail label, including optional custom rows, on the existing dispatch blue while leaving values, layout, behavior, and the classic variant unchanged.
- Added focused palette regressions; all 732 tests pass, ESLint has no errors (12 pre-existing warnings), and rendered 1280×720 in-app Browser QA confirmed the requested computed colors, Back/reopen behavior, and clean console/framework state.

## [2026-08-17] [monitor] - Implement two-stage NIBP focus and consistent monitor modal styling

- Added label/value NIBP focus with combined alarm-limit selection, read-only arrow no-ops, bidirectional Mode/Interval changes, Enter/Back focus precedence, and preserved live automatic-cuff scheduling.
- Added a shared boxed modal-action primitive and standardized Patient Info, NIBP, and Event Log around the Patient Info header, modal surface, centered value cells, selection color, and typography while keeping Vital Log unchanged.
- Preserved eight-row Event Log density at the minimum desktop viewport; all 730 tests pass, ESLint has no errors (12 pre-existing warnings), the production build passes, and rendered 1024×768/1366×768 physical-control QA completed without console, framework-overlay, clipping, or scrollbar issues.

## [2026-08-17] [monitor] - Define two-stage NIBP focus and consistent monitor modal styling

- Changed every NIBP data row to a Patient Info-style label-to-value hardware focus flow, with directional live editing only for Mode and Auto Mode Interval and read-only alarm/SmartCuf value regions.
- Standardized Patient Info, NIBP, and Event Log around white title bars, the shared green surface, centered value cells, blue active regions, and a shared boxed modal-action treatment while preserving each modal's geometry and behavior.
- Expanded the controller, component, monitor-flow, scheduler-integration, and rendered-browser testing contract; mouse interaction and Vital Log styling remain intentionally unchanged.

## [2026-08-17] [monitor] - Implement NIBP settings modal and automatic cuff mode

- Added a Zoll-style NIBP modal over the waveform column with exact alarm values, Manual/Automatic mode, six automatic intervals, SmartCuf On, cyclic physical navigation, and Back/Exit closure; TurboCuf, the ruler, alarm editing, and pointer interaction remain intentionally absent.
- Added a focused automatic scheduler that reuses the existing Patient event cuff sequence, waits a full interval, repeats start-to-start, resets after manual presses or interval changes, skips busy readings, stays dormant without active BP, and cleans up on power-off/reset.
- Added immutable NIBP types plus component, scheduler, reading-cleanup, controller, and physical-shell integration coverage; all 724 tests pass, lint has no errors, the production build passes, and rendered 1024×768 and 1366×768 in-app Browser QA completed without console warnings or errors.

## [2026-08-17] [monitor] - Define NIBP settings modal and automatic cuff mode

- Defined a Zoll-style NIBP modal opened from the selected PNI vital with cyclic physical navigation through read-only alarm values, Manual/Automatic mode, six automatic intervals, SmartCuf On, and Exit.
- Specified recurring start-to-start automatic cuff readings through the existing Patient event sequence, including manual deadline resets, busy-reading skips, dormant inactive-BP behavior, and power/reset defaults.
- Added the required component, controller, scheduler, integration, and rendered-browser testing contract while keeping MAP display-only and excluding TurboCuf, the ruler, mouse controls, persistence, and realtime changes.

## [2026-08-17] [monitor] - Implement Home toggle, chronological events, and manual vital switches

- Made physical Home close an open Vital Log and reset its page/selection on the next open while preserving all other modal lockouts and background state.
- Added hidden absolute capture time and same-millisecond sequence metadata for new Call, medication, and Analyze entries, then sorted the merged Event Log oldest-first before pagination with stable legacy fallback.
- Changed direct numeric fields, universal auto-sort, and timed updates to preserve manual On/Off state; inactive values now survive Save and Send without connecting SpO2/EtCO2 graphs.
- Added ordering, midnight, tie, legacy, controller, component, store, admin, and full monitor-flow regressions; all 708 tests pass, lint has no errors, the production build passes, and rendered desktop browser QA completed without console warnings or errors.

## [2026-08-17] [monitor] - Define Home toggle, chronological events, and manual vital switches

- Changed physical Home behavior so an open Vital Log closes on a second Home press while other modal lockouts remain intact.
- Defined one oldest-first Event Log stream across Call, medication, and Analyze entries, with exact hidden capture ordering for new rows and stable visible-time fallback for legacy rows.
- Changed all numeric vital-entry paths to preserve the instructor's manual On/Off state; values edited while Off remain inactive through Save and Send but stay available for later activation.
- Expanded the monitor testing contract to cover toggle closure, event ordering and pagination edge cases, and manual switch preservation across direct, auto-sort, timed, Save, and Send flows.

## [2026-08-17] [monitor] - Implement Home Vital Log

- Connected the physical Home button to a mutually exclusive Vital Log modal with Event Log geometry, matching vital colors, an empty state, `-` placeholders, and eight-row pagination.
- Added immutable five-minute snapshots driven by the session timer, including trainee-visible CPR FC, independent accepted PNI SYS/DIA values, calibrated active EtCO2, active SpO2, skipped-boundary catch-up, and timer-reset cleanup.
- Added cyclic Exit/Prev/Next navigation, disabled boundary no-ops, physical Back closure, modal lockout in both directions, and preservation of the underlying monitor, 12-lead, or medication state.
- Added hook, component, controller, physical-button, and full monitor-flow coverage; all 697 tests pass, lint has no errors, the production build passes, and rendered desktop browser QA completed without console warnings or errors.

## [2026-08-17] [monitor] - Define Home Vital Log behavior

- Specified five-minute trainee-visible vital snapshots beginning at `00:05:00`, with separate PNI SYS/PNI DIA columns and `-` for unavailable values.
- Defined eight-row pagination, Event Log-style cyclic Exit/Prev/Next navigation, Back closure, timer-bound history cleanup, and mutual exclusion with existing monitor modals.
- Added the required timer, sampling, component, controller, physical-button, integration, and rendered-browser test coverage to the monitor plan.

## [2026-08-17] [monitor] - Implement cyclic modal navigation and Exit controls

- Added wrap-around Patient Info browsing through Age, Sex, and Exit; replaced the left arrow with an Exit label that closes only the panel on right-cluster Enter.
- Added an Exit-first Event Log cursor, cyclic Exit/Prev/Next navigation for multi-page logs, Exit-only single-page navigation, and an Exit control positioned above Prev.
- Preserved Patient Info editing, physical Back precedence, disabled pagination boundary no-ops, and the underlying 12-lead or medication mode after Exit.
- Added controller, component, and full physical-button flow regressions; all 676 tests pass, lint has no errors, and rendered desktop browser QA completed without console warnings or errors.

## [2026-08-17] [monitor] - Define cyclic modal navigation and Exit controls

- Updated the monitor interaction requirements so Patient Info cycles Age → Sex → Exit and Event Log cycles Exit → Prev → Next, with reverse wrapping on Move Up.
- Specified that modal Exit closes only the active overlay, single-page event logs expose Exit as their sole selection, and disabled page actions remain selectable no-ops at their boundaries.
- Expanded the phase testing requirements to cover cursor wrapping, Exit activation, page clamping, and preservation of the underlying 12-lead or medication mode.

## [2026-08-17] [monitor] - Restore medication and event-log navigation

- Restored normal right-cluster Move up / Move down / Enter behavior while the medication soft-key menu is open.
- Reconnected event-log pagination to the right cluster: arrows select Prev/Next, Enter changes pages, single-page logs consume navigation without touching the background, and boundary actions remain disabled.
- Counted dispatch, medication, and analyze entries together for the 8-row pagination rule, reset to page 1 on every open, and restored normal navigation immediately after Back closes the log.
- Added controller, modal, and monitor-page regression coverage and verified the complete physical-button flow in the rendered monitor.

## [2026-07-05] [monitor] - Fix Leaflet CSS build import

- Moved the packaged Leaflet stylesheet import from `globals.css` to the root app layout so Next/Turbopack resolves it outside Tailwind's PostCSS import evaluation.
- Left the local Leaflet marker/control overrides in `globals.css`.

## [2026-07-04] [realtime] - Start new rooms with a blank admin console

- Creating a room now resets the persisted monitor store (vitals, caller info, dispatch countdown, armed gate) before redirecting to the instructor page, so a previous drill's state no longer leaks into a new room.
- Added landing-page coverage for the reset.

## [2026-07-04] [realtime] - Keep the host token out of the instructor URL

- The instructor page now stores the `?host=` token in localStorage on first load and strips it from the address bar via a route replace.
- Refreshes resume from storage; opening the clean URL without a stored token still shows the access-required screen.
- Added page tests for token capture/strip, storage resume, and missing-token handling.

## [2026-07-04] [realtime] - Enforce session expiry

- Sessions past their `expires_at` (24h default) now read as `ended` through the central session lookup, so stale room codes get the normal ended-room UX instead of staying live forever.
- Start / Dispatch now rejects ended (including expired) rooms with 410, matching the existing New Attempt guard.
- Added unit tests for the expiry mapping, boundary conditions, and malformed timestamps.

## [2026-07-04] [realtime] - Drop public-read RLS policies on session tables

- Added migration `004_drop_public_read_policies.sql`: the anon key can no longer read participants (nicknames/token hashes), student events, attempts, or shared state across rooms.
- RLS remains enabled on all session tables; API routes keep using the service-role key, so app behavior is unchanged.

## [2026-07-04] [realtime] - Add live student roster with presence heartbeat

- Student monitor and waiting-room polls now carry the participant token; the server stamps `last_seen_at` so the instructor roster shows connected/offline dots (8-second window).
- The instructor Students panel shows per-student, per-attempt progress: Acknowledge/Arrival/Transport milestones plus shock and medication counts derived from the existing event log.
- Participant lookups now query the deterministic `token_hash` directly (indexed via migration 003) instead of scanning and hash-comparing every participant per request.
- Added roster helper tests, heartbeat-header hook coverage, and an admin roster rendering test.

## [2026-07-04] [realtime] - Add instructor New Attempt flow

- Added `POST /api/session/[code]/attempt` (host token required) that increments the session's `active_attempt_version`.
- Instructor session header now shows the current attempt number and a New Attempt button while the room is active.
- Student monitors restart their drill on an attempt change: local store reset, monitor remount, and a forced re-apply of the latest shared snapshot; new student events record under the new attempt version.
- Added route, sync-hook, and admin page tests for the flow.

## [2026-07-04] [realtime] - Push CPR override and Reset to sessions immediately

- Session instructors now push shared state the moment CPR override toggles or a Reset bumps `monitorResetVersion`, since both bypass Save → Send and the Send button stays disabled without pending changes.
- Background push failures surface in the instructor session error banner.
- Added admin page coverage for CPR-toggle and Reset-triggered state POSTs.

## [2026-07-04] [realtime] - Stop session polling from wiping trainee progress

- Trimmed `SharedMonitorState` to instructor-authoritative fields only; patient info, dispatch Acknowledge/Arrival/Transport, EtCO2 calibration, and the accepted-BP layer stay trainee-local.
- `applySharedState` now keeps trainee dispatch progress for the same run, clears Acknowledge/Arrival on a new dispatch run, and clears the gate on disarm — matching the local re-dispatch Send contract.
- Instructor resets propagate through `monitorResetVersion`, clearing trainee-local reading/calibration layers when it changes.
- Extracted student polling into `useSessionMonitorSync`: snapshots apply only when the shared state version changes, and network failures no longer throw unhandled.
- Added store and hook regression tests for shared-state semantics and version-gated polling.

## [2026-06-27] [realtime] - Add instructor end-room control

- Added `POST /api/session/[code]/end` for host-token-protected room ending.
- Added an End Room button to the instructor session panel.
- Redirected instructors back to the lobby after a room is ended.
- Updated the student waiting room to show an ended-room state with a return-to-lobby action.

## [2026-06-27] [realtime] - Make session room codes copyable

- Added a reusable room-code copy control with selectable uppercase code text.
- Wired the copy control into instructor and student waiting-room session views.
- Added focused coverage for clipboard copy behavior.

## [2026-06-27] [realtime] - Add secure session room vertical slice

- Replaced the default entry point with a create/join room lobby while preserving `/?dev=1` for the local monitor.
- Added private host-token instructor rooms, nickname-based student join, waiting room flow, and Start/Dispatch release.
- Added session APIs and Supabase migration for shared instructor state plus per-student participants, attempts, and event logs.
- Wired session instructor Send to push confirmed monitor state and session monitors to record student Acknowledge/Arrival/Transport, meds, Analyze, Charge, and Shock events.
- Added focused coverage for token hashing/verification and create/join lobby behavior.

## [2026-06-19] [instructor] - Keep auto-sorted vitals Off

- Universal Caller Info scenario auto-sort now fills origin vital numbers without activating those vitals.
- SpO2 and EtCO2 auto-sorted values keep graph waveforms Off until manually toggled On.
- Manual vital typing and toggles keep their existing activation behavior.

## [2026-06-19] [instructor] - Preserve Off vitals for timed buttons

- T1/T2/T3/U1/U2/U3 now update draft vital numbers without turning inactive vitals On.
- SpO2 and EtCO2 timed values keep graph connections tied to their existing On/Off toggle state.
- Manual typing and universal scenario auto-sort keep their current number-entry behavior.

## [2026-06-19] [monitor] - Add caller assignment alert

- Added the provided caller assignment alert sound as `/audio/caller_info_alarm.mp4`.
- Automatic call assignment display now plays the alert and shows a gentle 4-pulse flash for each new dispatch run.
- Manual caller-info reopening from the monitor sidebar stays silent.

## [2026-06-19] [monitor] - Remove assignment detail icons

- Removed the decorative New Assignment bell and assignment detail-row icons from the call assignment screen.
- Kept assignment labels, values, priority badge, route map, and action controls unchanged.

## [2026-06-19] [instructor] - Sync Patient Physical icons from timed vitals

- T1/T2/T3/U1/U2/U3 timed vitals now update Patient Physical Pulse and Respiratory icon findings.
- Added timed Patient Physical parser and admin coverage for Pulse/Respiratory updates while preserving manual selections.

## [2026-06-19] [monitor] - Fix dispatch map stale resize crash

- Guarded delayed Leaflet map size invalidation so it does not run after the map unmounts.
- Added regression coverage for unmounting the dispatch route map before the delayed resize callback fires.

## [2026-06-19] [instructor] - Clean up ECG rhythm selector display

- Removed the separate `Rhythm:` display pill from the admin ECG selector.
- The rhythm picker button now shows the selected rhythm label after a rhythm is chosen.
- Updated ECG selector tests for the compact selected-rhythm button behavior.

## [2026-06-19] [monitor] - Reset secondary graph selector to SpO2

- Monitor reset now returns the visible secondary graph slot to SpO2.
- EtCO2 calibration timers are cleared on reset, and the CO2 soft key can start calibration again afterward.
- Added controller and monitor-page coverage for the reset behavior.

## [2026-06-19] [monitor] - Remake CPR compression graph as canvas

- Replaced the CPR override ECG video with a generated green canvas compression waveform.
- CPR override still displays FC 120 and restores the previous FC/rhythm when turned off.
- CPR On/Off switching now keeps the ECG canvas mounted so the existing trace stays behind the black sweep line.
- Added waveform and monitor coverage for the canvas CPR override.

## [2026-06-19] [monitor] - Replace Regular Sinus 12-lead strip image

- Added the supplied regular sinus 12-lead strip image.
- Updated completed `NSR` captures to use `/images/regular-sinus-strip.png`.
- Updated printout coverage for the new NSR strip asset.

## [2026-06-19] [monitor] - Replace 3rd Degree strip and refine ECG

- Added the supplied third-degree heart block 12-lead strip image.
- Updated completed `3rd Degree` captures to use `/images/third-degree-block-strip.png`.
- Reshaped the live 3rd Degree ECG with slower, wider ventricular escape complexes and independent smaller P waves.

## [2026-06-19] [monitor] - Replace 2nd Degree Type 2 12-lead strip image

- Added the supplied second-degree type 2 heart block 12-lead strip image.
- Updated completed `2nd Degree Type 2` captures to use `/images/second-degree-type-2-strip.png`.
- Updated printout and capture-flow coverage for the new strip asset.

## [2026-06-19] [monitor] - Replace 2nd Degree Type 1 12-lead strip image

- Added the supplied second-degree type 1 heart block 12-lead strip image.
- Updated completed `2nd Degree Type 1` captures to use `/images/second-degree-type-1-strip.png`.
- Updated printout and capture-flow coverage for the new strip asset.

## [2026-06-19] [monitor] - Replace 1st Degree 12-lead strip image

- Added the supplied first-degree heart block 12-lead strip image.
- Updated completed `1st Degree` captures to use `/images/first-degree-block-strip.png`.
- Updated printout and capture-flow coverage for the new strip asset.

## [2026-06-18] [monitor] - Add 3rd Degree heart block rhythm

- Added `3rd Degree` to the admin ECG Heart Block category.
- Added complete heart block live ECG and 12-lead waveform generation with independent P waves and slower ventricular escape QRS complexes.
- Added a custom completed 12-lead strip asset for third-degree captures.

## [2026-06-18] [monitor] - Add 2nd Degree Type 2 heart block rhythm

- Added `2nd Degree Type 2` to the admin ECG Heart Block category.
- Added Mobitz II live ECG and 12-lead waveform generation with fixed PR conducted beats and an intermittent dropped QRS.
- Added a custom completed 12-lead strip asset for second-degree type 2 captures.

## [2026-06-18] [monitor] - Add 2nd Degree Type 1 heart block rhythm

- Added `2nd Degree Type 1` to the admin ECG Heart Block category.
- Added Wenckebach live ECG and 12-lead waveform generation with progressive PR prolongation and a dropped QRS.
- Added a custom completed 12-lead strip asset for second-degree type 1 captures.

## [2026-06-18] [monitor] - Add 1st Degree heart block rhythm

- Added `1st Degree` to the admin ECG Heart Block category.
- Added long-PR first-degree AV block live ECG and 12-lead waveform generation.
- Added a custom completed 12-lead strip asset for first-degree heart block captures.

## [2026-06-18] [monitor] - Add VFib 12-lead strip

- Added the supplied VFib 12-lead strip image as a monitor printout asset.
- Updated completed VF 12-lead captures to show the VFib strip instead of the default printout.
- Added component and capture-flow coverage for the VF rhythm-specific printout.

## [2026-06-18] [monitor] - Redesign VT ECG waveform

- Rebuilt VT as a monomorphic tachycardia waveform with tall repeated complexes, sloped descent, and rounded negative troughs.
- Replaced the older plateau/deep-V rhythm tests with coverage for the new VT reference silhouette.

## [2026-06-18] [monitor] - Redesign VF ECG waveform

- Replaced VF's torsades-style source with a dedicated irregular fibrillation generator.
- Kept torsades unchanged while making VF generate moderate midline variants with uneven amplitude and spacing.
- Added waveform coverage for VF irregularity, smoothness, normalization, and variant generation.

## [2026-06-18] [monitor] - Shape Inferior MI ST scoop

- Reshaped the live Inferior MI ECG so the R wave drops into a raised scooped ST segment before the T-wave ramp.
- Added waveform coverage to keep the scooped ST segment elevated while remaining lower than the later T wave.

## [2026-06-18] [monitor] - Smooth Inferior MI R-to-ST transition

- Raised the live Inferior MI post-R transition so it flows directly into the elevated ST segment.
- Replaced the visible deep S/drop with only a slight downward curve before ST elevation.
- Tightened waveform coverage so the post-R segment stays elevated.

## [2026-06-18] [monitor] - Clarify Inferior MI ST elevation

- Removed the lower post-QRS dip from the live Inferior MI ECG so the elevated ST segment reads more clearly.
- Widened the Inferior MI QRS slightly while preserving the rounded T-wave shape.
- Tightened waveform coverage so the post-QRS segment stays above baseline.

## [2026-06-18] [monitor] - Preserve Inferior MI ST elevation

- Raised the live Inferior MI post-QRS ST segment so the ST elevation remains visibly present before the rounded T wave.
- Added waveform coverage that requires the Inferior MI ST segment to stay elevated.

## [2026-06-18] [monitor] - Round Inferior MI T wave ramp

- Reshaped the live Inferior MI monitor ECG T wave so the left-side ramp curves upward more smoothly.
- Softened the T-wave apex so it reads as a rounded triangular peak while staying near half the QRS height.
- Added waveform coverage for the rounded ramp and broad peak region.

## [2026-06-18] [monitor] - Refine Inferior MI P and T waves

- Shifted the live Inferior MI monitor ECG P wave later so it sits closer to the QRS complex.
- Reshaped the Inferior MI T wave with a slower ramp-up and a peak near half the QRS height.
- Added waveform coverage for the later P wave, slow T-wave rise, and T-to-QRS height relationship.

## [2026-06-18] [monitor] - Move Anterior MI P wave closer to QRS

- Shifted the live Anterior MI monitor ECG P wave later in the beat so it sits closer to the QRS complex.
- Added waveform coverage to keep the earlier segment flat and the P wave near the QRS.

## [2026-06-18] [monitor] - Add map unit-tracking toggle

- Added a "Track unit" toggle button to the dispatch route map. Default is the
  route overview; toggling switches to follow mode, which keeps the moving unit
  centered and zoomed in close and updates each tick. Toggling back refits the
  whole route.
- Added DispatchRouteMap component tests (Leaflet mocked) covering the default
  overview, the follow-mode camera, the return-to-overview refit, and the toggle
  staying hidden until a route is ready.

## [2026-06-18] [instructor] - Re-dispatch on changed countdown

- A Send carrying a changed (saved) dispatch countdown now re-dispatches instead
  of only updating content: the gate countdown and the map ETA both restart from
  that send on the new duration, and the trainee's Acknowledge/Arrival are
  cleared so the run must be re-acknowledged.
- Fixes the map ETA appearing frozen (or jumping straight to "Arrived") after a
  re-send, which happened because the route `startedAt` stayed pinned to the
  first arm. A Send that keeps the same countdown still only updates content and
  leaves the running gate/ETA untouched.
- Requirement change recorded in `PLAN.md`; store + new resend tests added.

## [2026-06-18] [monitor] - Enable iPad map interaction

- Enabled drag, wheel, double-click, box, keyboard, and zoom-control interaction on the caller-info iPad map.
- Stopped the moving unit marker from refitting the map viewport every second, so user zoom/pan choices are preserved while the route continues updating.

## [2026-06-18] [instructor] - Fix route countdown resend

- Fixed Send staying disabled when only the dispatch countdown changed after an initial route Send.
- Later Sends now update the confirmed route duration from the current dispatch countdown without restarting the dispatch gate timer.
- Dispatch countdown edits now follow the same strict Save -> Send workflow: editing unlocks Save, Save unlocks Send, and Send locks again until the next saved change.

## [2026-06-18] [dispatch] - Add iPad route map

- Added Geoapify-backed address autocomplete to the admin Caller Info address fields, with John Abbott College as the default response origin.
- Added persisted dispatch route state through the existing draft -> saved -> confirmed workflow, stamping route movement at Send time.
- Replaced the assignment iPad location placeholder with a Leaflet/OpenStreetMap route map, OSRM driving route, distance/ETA readouts, and real-time unit marker movement.
- Updated route movement to use the admin dispatch countdown duration; a zero countdown places the unit at the destination immediately.
- Added route helper, store, admin form, and caller-info modal coverage; full test suite passes under the bundled Node runtime.

## [2026-06-14] [instructor] - Add CPR ECG override

- Added an admin CPR toggle that immediately overrides the monitor ECG graph and FC display.
- CPR override shows the supplied compression video and displays FC 120 while preserving the saved rhythm and HR underneath.
- Turning CPR off restores the previous monitor FC and ECG graph.

## [2026-06-14] [monitor] - Sync ECG and SpO2 sweep lines

- Synchronized ECG and SpO2 canvas erase/update sweep positions to the same wall-clock phase.
- Left EtCO2 on its slower independent capnography sweep.

## [2026-06-14] [monitor] - Extend EtCO2 calibration timing

- Extended EtCO2 calibration from 8 seconds to 10 seconds.
- Updated the monitor calibration animation and regression tests for the longer timing.
- Adjusted the EtCO2 calibration trace so the moving segment shrinks from large to small.

## [2026-06-14] [monitor] - Gate EtCO2 display behind calibration

- Moved EtCO2 calibration status into shared monitor state.
- Hid EtCO2 number and live graph until the monitor CO2 soft key completes the 8-second calibration.
- Added a pink admin EtCO2 calibration-ready indicator and updated the calibration progress trace.

## [2026-06-14] [instructor] - Round Anterior MI T wave

- Rounded and widened the live Anterior MI ECG T wave after the deep S deflection.
- Added waveform coverage for the broader T crest and gradual return to baseline.

## [2026-06-14] [instructor] - Retune MI live ECG accuracy

- Rebuilt the live Anterior MI monitor ECG as a clean small-R, deeper-S reference-strip template.
- Rebuilt the live Inferior MI monitor ECG as a clean tall Lead II-style ST/T elevation reference-strip template.
- Added waveform tests that guard the distinct Anterior vs Inferior live ECG profiles.

## [2026-06-14] [instructor] - Add Inferior MI rhythm

- Added `Inferior MI` under the admin ECG `MI` rhythm category beside Anterior MI.
- Added canvas-generated Inferior MI ECG and 12-lead morphology, with inferior leads most affected.
- Added the supplied Inferior MI strip image for completed Inferior MI 12-lead captures.

## [2026-06-14] [instructor] - Add Anterior MI rhythm

- Added `Anterior MI` under the admin ECG `MI` rhythm category.
- Added canvas-generated Anterior MI ECG and 12-lead morphology, with anterior leads most affected.
- Added the supplied Anterior MI strip image for completed Anterior MI 12-lead captures.

## [2026-06-12] [instructor] - Align admin vitals beside ECG

- Refactored the admin Vitals panel into a left numeric-vitals column and a right ECG/timed-buttons column.
- Kept FC, SpO2, BP sys, BP dia, and EtCO2 aligned together while ECG stays beside the top of the vitals column.

## [2026-06-12] [instructor] - Shrink admin ECG selector rectangle

- Removed full-height stretching from the admin ECG selector so it stays compact beside FC.
- Kept the timed vitals buttons below ECG with their full-cell click targets unchanged.

## [2026-06-12] [instructor] - Fix timed vitals hitboxes

- Refactored T1/T2/T3 and U1/U2/U3 into an explicit two-row timed vitals grid.
- Made each timed vitals button a full-cell pointer target so the whole rectangle is clickable.

## [2026-06-12] [instructor] - Unify admin auto-sort on Caller Info

- Replaced separate Vitals, Patient Information, and Patient Physical auto-sort textareas with one Caller Info scenario auto-sort box.
- Universal scenario paste now fills caller-info drafts, origin vitals drafts, SAMPLE/OPQRST text, and Patient Physical findings.
- Kept timed vitals buttons in Monitor while reading Treated/Untreated sections from the shared Caller Info scenario text.

## [2026-06-12] [instructor] - Fix Patient Physical back and thoracic autosort

- Added Back / Spine, spine, lumbar, cervical spine, thoracic spine, posterior torso, and dorsal headings for Rear back.
- Added thoracic, thoracic area, anterior chest, and rib cage headings for Front chest.
- Added regression coverage so back/spine and thoracic sections stop previous leg findings instead of being appended to them.

## [2026-06-12] [instructor] - Add Patient Physical scene environment icon

- Added a Scene/Environment icon to the Patient Physical left rail using the supplied clapperboard image.
- Extended Patient Physical auto-sort so Scene / Environment sections fill one icon-only slider note.
- Kept Scene/Environment findings separate from body-map region markers.

## [2026-06-12] [instructor] - Add Patient Physical skin extremities icon

- Added a Skin/Extremities icon to the Patient Physical left rail using the supplied hand image.
- Reordered the icon rail to Pulse, Respiratory, then Skin/Extremities.
- Extended Patient Physical auto-sort so Skin / Extremities sections fill one icon-only slider note without marking body limbs.

## [2026-06-12] [instructor] - Stretch timed vitals click targets

- Made each timed vitals button fill a fixed-height grid cell so the whole outlined rectangle is clickable.
- Added coverage for the timed vitals grid stretch sizing.

## [2026-06-12] [instructor] - Make timed vitals buttons fully clickable

- Updated T1/T2/T3 and U1/U2/U3 buttons to fill their full rectangle with block-style click targets.
- Added coverage for full-width/full-height timed vitals button sizing.

## [2026-06-12] [instructor] - Enlarge timed vitals buttons

- Increased T1/T2/T3 and U1/U2/U3 button hit targets in the admin Vitals panel.
- Added coverage so timed vitals buttons keep the larger clickable sizing.

## [2026-06-12] [instructor] - Add timed vitals buttons

- Added T1/T2/T3 and U1/U2/U3 buttons under the admin ECG control.
- Timed buttons parse matching Treated/Untreated sections from Auto-sort vitals and stage draft vitals only.

## [2026-06-12] [instructor] - Parse pulse summary in vitals autosort

- Added `Pulse` and `Pulse rate` as Vitals auto-sort aliases for FC/HR.
- Summary text like `Pulse: 136 bpm, Regular, Weak` now fills only the numeric FC/HR value.

## [2026-06-12] [instructor] - Parse Patient Physical pulse respiratory summaries

- Added Patient Physical auto-sort support for comma-separated `Pulse:` and `Respirations:` summaries.
- Mapped the first, second, and third values into rate, rhythm, and strength for the icon sliders.

## [2026-06-12] [instructor] - Refine Patient Physical icon sliders

- Replaced separate respiratory/pulse Rate, Rhythm, and Strength toggles with one toggleable icon per category.
- Kept auto-sort extracting Rate/Rhythm/Strength internally while showing combined icon sliders with amber missing-field notes.

## [2026-06-12] [instructor] - Add Patient Physical pulse and respiratory icons

- Added left-side lung and pulse icon cards to Patient Physical with Rate, Rhythm, and Strength targets.
- Extended Patient Physical auto-sort to fill respiratory and pulse icon findings from explicit labels and clear broad-section lines.
- Added amber review markers, green confirmation, and inline finding popovers for icon targets.

## [2026-06-12] [instructor] - Order Patient Physical selections by click

- Updated the Patient Physical Selected panel to follow the order body parts are clicked.
- Added coverage for click-order rendering.

## [2026-06-12] [instructor] - Add Patient Physical head face neck autosort

- Added Patient Physical auto-sort support for `Head / Face / Neck` sections.
- Mapped head/face/neck findings to the front head and front neck review markers.

## [2026-06-12] [instructor] - Refine Patient Physical selected findings

- Kept auto-sorted Patient Physical findings out of the Selected panel until the body part is clicked green.
- Fixed the Patient Physical body map container so long selected findings do not stretch the outline or overlays.

## [2026-06-12] [instructor] — Add Patient Physical neck regions

- Added selectable Front neck and Rear neck regions to the Patient Physical body map.
- Covered the neck regions in Patient Physical render and toggle tests.

## [2026-06-12] [instructor] — Raise Patient Physical upper-leg overlays

- Moved front and rear upper-leg selection zones higher again.
- Left lower-leg and foot selection zones unchanged.

## [2026-06-12] [instructor] — Raise Patient Physical leg overlays

- Moved upper-leg and lower-leg selection zones higher on both front and rear outlines.
- Kept foot selections unchanged.

## [2026-06-12] [instructor] — Refine Patient Physical upper placement

- Moved chest, abdomen, and pelvic trunk selection zones moderately higher.
- Re-shaped upper arm, lower arm, and hand selections into shorter higher capsules on both outlines.

## [2026-06-12] [instructor] — Replace Patient Physical outline image

- Replaced the Patient Physical body map with the newer supplied front/rear outline image.
- Converted the new image background to transparent.
- Rebuilt selection overlays as tighter inside-body zones for the new image proportions.

## [2026-06-12] [instructor] — Reposition Patient Physical torso zones

- Moved Front chest higher on the body outline.
- Moved Front abdomen higher and changed Front/Rear trunk to smaller pelvic-section selections.

## [2026-06-12] [instructor] — Add Patient Physical trunk regions

- Tightened the Front chest selection to the upper chest area.
- Added independent overlapping Front trunk and Rear trunk selections.
- Added coverage for trunk selections staying independent from chest, abdomen, and rear back.

## [2026-06-12] [instructor] — Align Patient Physical arm overlays

- Tightened shoulder, upper-arm, lower-arm, and hand overlays to match the visible body outline.
- Added coverage to prevent arm and hand selection zones from drifting into lower-body areas.

## [2026-06-12] [instructor] — Split Patient Physical limbs by side

- Removed the white body-map background by converting the supplied outline image to transparent.
- Split shoulders, arms, hands, legs, and feet into anatomical patient left/right selections on both outlines.
- Kept head, chest, abdomen, and rear back as single selectable regions.

## [2026-06-12] [instructor] — Add Patient Physical body map

- Added a Patient Physical admin tab with the supplied front/rear body outline image.
- Added selectable body-region overlays with ECG-green selected highlighting.
- Kept body-map selections local to the admin page with tab-scoped Reset behavior.

## [2026-06-12] [instructor] — Remove Details prefix from caller info

- Caller Info auto-sort still fills Information from `DETAILS`.
- `DETAILS:` is no longer included in the Information text.

## [2026-06-12] [instructor] — Keep Time Received focused

- Caller Info auto-sort now stops Time Received after the actual time value.
- Later scenario sections such as Patient Presentation are no longer appended to Heure.

## [2026-06-12] [instructor] — Support Addresse caller-info alias

- Caller Info auto-sort now recognizes `Addresse` as an address label.
- Added coverage for dispatch `ADDRESS:` labels whose values appear on the following line.

## [2026-06-12] [instructor] — Auto-grow Patient Information notes

- SAMPLE and OPQRST letter note fields now use auto-growing textareas.
- Short notes stay compact while longer manual or auto-sorted notes grow taller for visibility.
- Added coverage for compact rows, manual long text, and auto-sorted long text.

## [2026-06-12] [instructor] — Clean SAMPLE medication auto-sort

- SAMPLE M auto-sort now collects medication lines after `M:`.
- Parenthesized medication descriptions are stripped from SAMPLE M only.
- Multiple medications are stored in the existing M text box as a comma-separated list.

## [2026-06-12] [instructor] — Keep first origin vitals in auto-sort

- Vitals auto-sort now parses only the origin vitals section when one is present.
- Without an origin heading, repeated vitals keep the first valid value per field instead of overwriting with later serial vitals.
- Added parser and admin VitalsControls coverage for origin-safe and first-value behavior.

## [2026-06-12] [instructor] — Add vitals auto-sort paste box

- Added an admin Vitals auto-sort textarea for FC/HR, SpO2/saturation, BP/TA, and EtCO2/CO2 labelled lines.
- BP labels now parse any slash-separated systolic/diastolic numbers, with separate BP sys/dia labels also supported.
- Vitals auto-sort accepts unit/notes formats like `HR: 124 bpm`, `SpO₂: 92% on room air`, and `EtCO₂: 48 mmHg`.
- Large scenario pastes now parse only the origin vitals section and ignore later serial vitals.
- Repeated vitals now keep the first valid value per field so treated/untreated vitals do not overwrite origin values.
- Auto-sort updates draft vitals only, preserving Save → Send and SpO2/EtCO2 graph staging.

## [2026-06-12] [instructor] — Add Patient Information auto-sort notes

- Added page-only SAMPLE/OPQRST text inputs beside each letter on the Patient Information tab.
- Added an auto-sort textarea for `Letter: value` patient notes, routing repeated S/P labels to SAMPLE first and OPQRST second.
- Kept green letter highlighting manual-only and reset scoped to the Patient Information tab.

## [2026-06-12] [instructor] — Clean up caller info priority layout

- Removed the legacy `Intervention prioritaire code` caller-info field from current data, admin UI, parser support, and display lists.
- Reordered admin Caller Info so Dispatch countdown appears before Call / Priority / MPDS.
- Assignment-style caller info now keeps the large Priority badge without showing a duplicate Priority row in the details list.

## [2026-06-12] [instructor] — Connect SpO2 and EtCO2 graphs from typed numbers

- Typing a SpO2 or EtCO2 value in admin now stages the matching graph waveform as `normal`.
- Save → Send now carries typed SpO2/EtCO2 numbers and graph connection state to the monitor together.
- Added coverage for typed zero values, unrelated vital edits, and the single secondary graph slot behavior.

## [2026-06-12] [monitor] — Restore CO2 secondary graph switching

- Normal monitor mode now shows only one secondary graph slot at a time.
- The CO2 soft key switches the secondary slot between SpO2 and EtCO2.
- Expanded waveform mode still shows both secondary rows when the bottom panel is hidden.

## [2026-06-11] [monitor] — Suppress BP alarms during NIBP reading

- BP/PNI alarm audio contribution and red/white visual styling are now
  suppressed while NIBP is actively reading: Please Wait, Reading in Progress,
  and count-up.
- Cancelling a reading restores the old accepted BP alarm state, while a
  completed reading resumes BP alarm behavior using the final accepted BP.
- HR and SpO2 alarms remain active during BP readings.

## [2026-06-08] [monitor] — Show settled PNI as sys/dia

- Completed BP readings now settle to the stacked PNI display with systolic on
  top, diastolic on bottom, and the existing divider line.
- The NIBP count-up remains a single-number systolic-style animation.
- Added regression coverage for counting, settled, and partial-active BP
  reading display.

## [2026-06-08] [monitor] — Gate BP readings and EtCO2 loading

- PNI/BP values now stay on the last accepted reading after admin Save → Send;
  new BP values, BP alarms, and BP Off apply only after the outer-shell BP
  reading sequence completes without cancellation.
- Added one-time EtCO2 graph loading: the first ETCO2 toggle after monitor reset
  shows an 8-second half-opacity purple loading line and only skips loading
  after a full completion.
- Medication and analyze event-log rows now use real Eastern HH:MM:SS time
  instead of the session timer.
- Added regression coverage for BP commit/cancel/off behavior, EtCO2 loading,
  reset behavior, and real-time event stamps.

## [2026-06-11] [monitor] — Show active SpO2 and EtCO2 graph rows

- Monitor waveform rows now follow confirmed SpO2 and EtCO2 waveform state after Save → Send.
- Active SpO2 and EtCO2 channels render live graph rows together while Off channels are hidden.
- Added coverage for graph rows appearing and disappearing from admin vital toggle state.

## [2026-06-11] [instructor] — Extend caller info dispatch auto-sort

- Added Call #, Priority, and MPDS Code fields to caller info draft/saved/confirmed data.
- Updated auto-sort to parse the dispatch label format in English and French.
- Displayed the new call identifiers on admin Caller Info and trainee caller-info views after Save → Send.

## [2026-06-11] [instructor] — Add caller info auto-sort paste box

- Added an admin Caller Info paste box that parses labelled lines into the existing draft fields.
- Supports French and English aliases for priority code, address, problem, information, update, and time, including label-on-next-line and dash-separated formats.
- Preserved Save → Send behavior; auto-sort updates drafts only until the instructor saves and sends.

## [2026-06-11] [instructor] — Compact patient information checklist buttons

- Changed SAMPLE and OPQRST letter buttons from large two-row grids to compact vertical columns.
- Kept the existing page-only green toggle behavior and independent checklist selections.
- Added coverage for the compact left-aligned checklist layout.

## [2026-06-11] [instructor] — Add admin patient information checklist

- Added a third admin tab, `Patient Information`, beside Monitor and Caller Info.
- Added page-only SAMPLE and OPQRST checklist panels with independent green letter toggles.
- Kept selections local to the admin page session and added focused page/component coverage.

## [2026-06-11] [monitor] — Add SpO2 pulse fill icon

- Added a yellow outlined pulse-fill bar beside numeric SpO2 values in the monitor vital box.
- The fill now samples the selected SpO2 pleth waveform shape while using the same pulse timing as the SpO2 graph.
- Added focused coverage for the pulse bar timing and SpO2 active/off rendering states.

## [2026-06-11] [instructor] — Clear zeroed admin vitals on focus

- Admin vital number inputs now clear a visible `0` when focused so typed values do not keep a leading zero.
- The focus clear is visual only; untouched fields restore `0` on blur and do not become dirty until typed.
- Added coverage for FC, SpO2, BP sys, BP dia, and EtCO2 input behavior.

## [2026-06-11] [instructor] — Verify SpO2/EtCO2 graph Save-Send flow

- Added admin-page coverage proving SpO2 and EtCO2 vital toggles turn their graphs on after Save → Send.
- Added coverage for turning those same graph states back off after a second Save → Send.

## [2026-06-11] [instructor] — Move SpO2/EtCO2 graph toggles into vitals

- Removed the right-side admin SpO2 and EtCO2 graph controls from the Vitals panel.
- Wired the left-side SpO2 and EtCO2 vital toggles to stage their matching graph waveform as `normal` or `off`.
- Preserved the Save → Send pipeline and kept ECG as the only right-side graph/rhythm control.

## [2026-06-11] [instructor] — Remove extra admin waveform choices

- Removed `Weak` from the admin SpO2 waveform selector.
- Removed `Hypo` and `Obstr.` from the admin EtCO2 waveform selector.
- Removed the visible `Normal` buttons so SpO2 and EtCO2 graph controls are toggle-only.
- Hid visible `dirty` badges for ECG, SpO2, and EtCO2 graph controls while preserving draft Save/Send behavior.
- Updated selector tests and project tracking for the reduced admin options.

## [2026-06-08] [instructor] — Add categorized ECG rhythm picker

- Replaced always-visible ECG rhythm buttons with a compact `Rhythm Options`
  picker in the ECG admin row.
- The opened picker shows rhythm category buttons first, then shows only the
  selected category's rhythm options underneath in the same style as the SpO2
  and EtCO2 option buttons.
- Added NSR and Cardiac Arrest rhythm options, with muted empty-category
  placeholders when Heart Block, Bundle Branch Block, or MI is selected.

## [2026-06-08] [instructor] — Sleeken admin vital number inputs

- Restyled admin vital number inputs as inset console fields with right-aligned
  tabular values and embedded unit labels.
- Tightened the number fields into compact value slots with subtle underline
  state instead of large rectangular input bars.
- Narrowed the admin number slots further so the rows leave more room for the
  paired graph controls.
- Dropped the monitor SpO2 value font slightly, with a smaller disconnected
  `SpO2 OFF` state so it fits the right-side vital box more comfortably.
- Removed browser number spinners from the admin vital fields while preserving
  the existing input, Off/On, Save, and Send behavior.

## [2026-06-08] [instructor] — Align graph controls with admin vitals

- Moved ECG, SpO2, and EtCO2 graph controls into the admin vitals panel so each
  graph control sits beside its matching vital row.
- Reused the same Off/On toggle component for numeric vitals and graph channel
  connection state, removing duplicate graph-level `Off` option buttons.
- Widened the admin console container so the paired rows stay readable on
  iPad-width instructor screens.

## [2026-06-08] [instructor] — Reorder admin vitals panel

- Reordered the admin vitals controls to FC → SpO2 → BP sys/dia → EtCO2.
- Kept the monitor-side vitals strip order unchanged.
- Updated the admin vitals controls test and project docs for the new panel order.

## [2026-06-08] [monitor] — Split response timer from ETA countdown

- Added a dispatch start timestamp and `useElapsedTimer` so the assignment
  dashboard Response Timer counts up from dispatch Send.
- Kept ETA tied to the existing countdown end timestamp so it counts down toward
  scene arrival instead of mirroring the response timer.
- Added hook, store, and caller-info modal tests for the split timer behavior.

## [2026-06-11] [setup] — Add local portable Node start helper

- Installed dependencies using a project-local portable Node.js runtime because system `npm` was unavailable.
- Added `start-local.ps1` so the app can be started locally with the portable runtime.
- Ignored portable Node, npm cache, downloaded zip, and dev-server logs.

## [2026-06-08] [monitor] — Require Go to Monitor after every dispatch

- Added per-dispatch run identity so the caller-info iPad does not reuse a prior
  Go to Monitor tap after admin Reset.
- Arrival now keeps the dispatch tablet visible and only enables Go to Monitor
  for the current dispatch run.
- Added regression coverage for completing a scenario, resetting the drill, and
  requiring Go to Monitor again on the next scenario.

## [2026-06-08] [monitor] — Remove jumpscare playback

- Commented out the FNAF/its_me/Golden Freddy/Chica jumpscare video and audio
  pathways while keeping the media files in `public/`.
- Battery selection, boot, powered-on/off idle states, and alarm acknowledge no
  longer render or play prank media.
- Kept normal simulator audio active and switched vital alarm playback to
  `/audio/alarm.mp3`.
- Updated tests and project tracking to treat jumpscare playback as removed.

## [2026-06-01] [monitor] — Move caller info outside Zoll shell

- Caller info now renders as a separate full-page iPad-style dispatch surface
  before Arrival, hiding the Zoll monitor entirely until Arrival is logged.
- After Arrival the Zoll monitor appears powered off; trainees still power it on
  themselves.
- Opening CALL INFO from the monitor now shows the same full-page caller-info
  surface with a tablet Back button, instead of embedding caller info inside the
  Zoll screen.
- The full-page caller-info tablet keeps a 4:3 iPad-style ratio and mimics the
  reference assignment dashboard layout, with the map area reserved for later.

## [2026-06-01] [monitor] — Gray completed caller action buttons

- Acknowledge, Arrival, and Transport buttons now turn neutral gray after they are
  clicked/disabled, while staying readable in the assignment caller-info footer.

## [2026-06-01] [monitor] — Add assignment-style caller info A/B variant

- Added an icon-led `assignment` caller-info variant inspired by ambulance
  dispatch assignment screens so address, call nature, times, caller notes, and
  extra fields are easier to parse at a glance.
- Tuned the assignment icon/action palette to match the reference colors more
  closely and made the Acknowledge/Arrival/Transport row fixed and high-contrast
  so all three options stay visible on the monitor.
- The assignment dashboard is now the default caller-info display; the previous
  tablet layout remains available for comparison with `?callerInfoVariant=classic`.
- Kept the same Acknowledge, Arrival, and Transport buttons and logging behavior.

## [2026-06-01] [monitor] — Remove caller tablet CAD badge

- Removed the small `CAD` label from the caller-info tablet header while keeping
  the separate dispatch-tablet visual treatment.

## [2026-06-01] [monitor] — Restyle caller info as dispatch tablet

- Restyled `CallerInfoModal` so the locked dispatch screen and the later
  in-monitor Call Info view look like an external tablet/iPad CAD handoff rather
  than native monitor UI.
- Added dispatch-tablet color tokens and kept the existing caller-info fields,
  countdown, and Acknowledge/Arrival/Transport interactions intact.

## [2026-06-01] [monitor] — Reconcile caller-info lock with off-state playback

- Updated the caller-info branch against `main` and resolved the `DeviceShell`
  overlap between dispatch-lock silence and randomized off-state playback.
- Dispatch-locked/off caller-info screens remain silent and inert; the randomized
  off-state playback applies only to the normal unlocked power-off screen.

## [2026-06-01] [monitor] — Split vital Off state from zero values

- Admin vital rows now have a right-side Off/On toggle. Clicking anywhere in the
  toggle rectangle flips that vital between disconnected/off and active/on.
- Startup/reset vitals begin Off, so stored `0` values stay hidden and silent
  until the admin turns that specific vital On through Save → Send.
- Numeric `0` is now a real active value when a vital is On; out-of-range alarms
  are evaluated per active vital instead of using one global vitals-on flag.

## [2026-06-01] [monitor] — Space disconnected graph dashes

- Disconnected ECG, SpO2, and EtCO2 graph traces now render as spaced static
  dash segments instead of tightly dotted lines, matching the monitor-off/probe
  disconnected look requested for training drills.

## [2026-06-01] [monitor] — Add disconnected graph startup controls

- Monitor startup/reset now renders inactive FC, PNI, and EtCO2 values blank on
  the trainee screen; SpO2 renders as `SpO2 OFF`.
- ECG, SpO2, and EtCO2 graphs now default to dotted disconnected traces, so the
  monitor visibly reads as not attached to the patient at drill start.
- Added `Off` as the ECG disconnected option. ECG, SpO2, and EtCO2 now use their
  existing option lists to control whether each graph is dotted/off or live, and
  those selections flow through Save → Send independently from vital numbers.

## [2026-06-01] [monitor] — Use inactive zero startup vitals

- Monitor and admin vitals now reset to numeric `0` values instead of the previous
  blank display state.
- Startup/reset zeroes stay inactive (`confirmedVitalsActive=false`), so they do
  not trigger red alarm boxes or alarm audio until instructor vitals are saved and
  sent.
- Monitor-tab Reset now returns admin vitals and monitor vitals to inactive zeroes
  while preserving caller info and dispatch state.

## [2026-05-31] [instructor] — Scope admin Reset by tab

- The admin **Reset** button is now tab-aware: on the Monitor tab it resets only
  monitor vitals/rhythm/waveform state back to the blank inactive startup state;
  it does not clear caller info or dispatch/drill state.
- On the Caller Info tab, **Reset** still performs the full drill reset, clearing
  caller info, dispatch gate/countdown, call milestone logs, and monitor vitals.
- Added store and admin page tests for both reset paths.

## [2026-05-31] [monitor] — Start monitor vitals blank

- Confirmed monitor vitals now start inactive/blank instead of showing the normal
  default numbers immediately. The underlying draft values still default to normal
  so instructors can activate a normal baseline through the existing Normal →
  Save → Send flow.
- Alarm evaluation is disabled while confirmed vitals are inactive, so blank
  startup vitals do not behave like zero HR/SpO2/BP and do not trigger alarm audio
  or red vital boxes.
- Added store, alarm, instructor button, and monitor page tests for the vitals
  activation pipeline.

## [2026-05-31] [monitor] — Tighten dispatch lock off-state behavior

- While the monitor is powered off or dispatch-locked, all hardware controls are
  inert and silent: left soft keys, nav cluster, alarm/patient-event buttons, and
  defib controls no longer fire handlers or button-click audio behind the locked
  screen.
- The initial dispatch caller-info view now renders as a full monitor-screen
  touchscreen, while the normal in-monitor Call Info panel keeps its shifted
  sidebar modal layout.
- Removed the power-off background audio so the off state remains silent.

## [2026-05-31] [monitor] — Dispatch lock + countdown startup gate

- Normal users now boot the monitor **locked and off**. The admin's caller-info
  **Send** doubles as a dispatch: the first Send arms a lock + ETA countdown
  (new whole-minutes field on the admin caller-info form) and pushes the caller
  info; later Sends only update content. The admin **Reset** does a full reset to
  locked-off.
- On the locked screen the trainee sees the caller info + a counting-down MM:SS
  timer. Unlock sequence: **Acknowledge** (clickable immediately) → countdown
  reaches 0 → **Arrival** (enabled only after Ack + countdown-done) → power button
  unlocks. **Transport** stays disabled until the monitor is powered on.
- Acknowledge/Arrival/Transport now record **EST** wall-clock time (`HH:MM:SS`,
  America/New_York) and are merged into the event log alongside meds/shocks.
- Gate state lives in the persisted store (version 3→4) so a refresh mid-drill
  resumes exactly (countdown via an absolute end-timestamp; ack/arrival flags
  persist). Cross-tab admin→monitor uses the existing storage-rehydrate path.
- `?dev=1` URL flag bypasses the whole gate (monitor boots on/unlocked) for quick
  iteration. Pre-dispatch shows a plain dark standby; the blocked power button is
  inert; the its_me power-off easter egg is preserved for normal post-unlock
  power-offs.
- Caller-event logging moved out of `useMonitorController` (added in the previous
  change) into the store; the controller gained an `initialPoweredOn` option so
  normal users start with alarms/timer off. New `useCountdown` hook and
  `formatEstTime` util. Tests added/updated across store, hook, util, modal,
  controller, and the page flow tests (which now render with `?dev=1`).

## [2026-05-31] [monitor] — Add Acknowledge / Arrival / Transport buttons to Caller Info

- Added three buttons to the bottom of the `CallerInfoModal`: Acknowledge, Arrival, Transport.
  Clicking one appends a session-timestamped entry to the shared `eventLog`
  (`Call - Acknowledge` / `Call - Arrival` / `Call - Transport`, mirroring the `Analyze - Shock`
  convention), then disables that button so each milestone logs only once.
- `useMonitorController` gained `callerEventsLogged` state, an `addCallerEvent` reducer action
  (no-op once logged), and an `onCallerEvent(key, time)` callback; the flags reset on power off
  alongside `eventLog`. `page.tsx` wires the handler with the existing `sessionTimer`.
- Buttons are placeholder for roleplay logic — they only log timestamps for now.
- Added `CallerInfoModal` tests (render, click fires correct key, disabled-when-logged) and a
  `useMonitorController` test (logs prefixed entry once, ignores repeat clicks).

## [2026-06-01] [monitor] — Randomize off-state its_me playback

- Replaced the powered-off screen's continuous `its_me` audio/video loop with a black idle screen
  that rolls a 1/100 chance once per second.
- Successful off-state rolls now play `/videos/its_me.mp4` with `/audio/its_me.mp3` for a random
  500-5000ms burst, pause further rolls while active, and cancel immediately on power-on or Golden
  Freddy.
- Added focused `DeviceShell` fake-timer tests for failed/successful rolls, auto-stop timing,
  paused rolls during playback, power-on cancellation, and Golden Freddy precedence.

## [2026-05-31] [monitor] — Fix caller info panel not closing on Back

- The Call Info panel (left CALL INFO soft key) had no way to close: the merged `CallerInfoModal`
  dropped its in-panel close button and the controller's `back` reducer never handled
  `callerInfoOpen`. Back now dismisses it, consistent with every other menu/overlay.
- Updated the stale `CallerInfoModal` test (no in-panel close button) and added a `useMonitorController`
  test for Back closing the caller info panel. Full suite is green again.

## [2026-05-31] [monitor] — Fix unable to close the medication event log

- The med "BACK" key (`onMedBack` → `exitMedicationMode`) cleared `medicationMode` but left
  `eventLogOpen` true, trapping the user in the event log with no soft keys to exit.
- Restored the pre-refactor two-step Back in `useMonitorController`: `exitMedicationMode` now closes
  the event log first when it is open, then exits medication mode on the next press.
- Added a `useMonitorController` test for open-log → Back closes log (still in meds) → Back exits.

## [2026-05-31] [monitor] — Fix ECG waveform erased in chunks until a window resize

- `startRenderer` (`src/lib/ecg/renderer.ts`) cached the canvas size from `ResizeObserver` only and
  re-cleared on every callback. When a layout change (e.g. defib state toggling the vitals/energy
  columns) was missed or coalesced by the observer, the cached size drifted from the real canvas, so
  the per-frame erase band and sweep math corrupted the trace — wiping drawn history in chunks —
  until a manual window resize re-synced it.
- `resize()` is now idempotent (returns early when size/DPR are unchanged, so it never needlessly
  wipes the trace) and rounds to the element's client size (no permanent 1px drift). The render loop
  also re-syncs size a few times per second as a self-heal, so it no longer depends solely on
  `ResizeObserver`.
- Added a renderer regression test (no re-clear while size is unchanged; self-heals a real size
  change without a manual resize). Diagnosed with temporary instrumentation that confirmed no
  duplicate render loops.

## [2026-05-31] [monitor] — Simplify page composition

- Extracted the ticking clock into `src/hooks/useMonitorClock.ts` and the two defib beep effects
  into `src/hooks/useDefibAudio.ts`. `MonitorPage` is now pure wiring (store selectors, hooks,
  render tree) with no inline clock timers or audio effects.
- Added focused tests for both hooks; page behavior unchanged.

## [2026-05-31] [defib] — Split defib sequence reducer

- Added `src/lib/defib/defibMachine.ts`: the pure `DefibState` enum, `SHOCKABLE_RHYTHMS`, phase
  durations / energy step, control guards (`canAnalyse`/`canCharge`/`canShock`/`canAdjustEnergy`),
  energy math (`resolveEnergy`/`energyUp`/`energyDown` with patient-mode re-base), and the
  charge/shock transition classifiers.
- `useDefibSequence` is now a thin wrapper that keeps the timed phases (`setTimeout` + `rAF`) and
  audio cues but delegates all state decisions and energy math to the machine. `DefibState` is
  re-exported from the hook so existing importers are unchanged.
- Added reducer-level transition/guard/energy tests; the existing hook behavior tests stay green.

## [2026-05-31] [waveforms] — Extract waveform renderer hook

- Added `src/hooks/useWaveformRenderer.ts` wrapping the shared React glue: the `<canvas>` ref, the
  latest-reactive-inputs ref synced every render, and the `startRenderer` start/cleanup lifecycle.
- `ECGCanvas`, `LeadCell`, and `SecondaryChannel` now call the hook instead of repeating the
  ref-sync effect + `startRenderer` boilerplate; each keeps its own per-view options (color, sweep,
  amplitude, jitter, getWaveform/getSignalKey/getCycleMs).
- Rhythm generators (`rhythms.ts`) and renderer math (`renderer.ts`) are untouched — rendered
  waveforms are unchanged.
- Added a hook test (mount start, latest-value reads without restart, deps-change restart, unmount
  cleanup).

## [2026-05-31] [monitor] — Extract shared soft-key model

- Added `src/lib/monitor/medications.ts` (`MED_PAGES`, `NEXT_MED_PAGE`, `MED_ABBREVS`,
  `MedicationPage`) and `src/lib/monitor/softKeys.ts` (per-view physical soft-key builders) as the
  single source of truth, removing the duplicate medication tables from `DeviceShell` and
  `LeftSidebar` and the duplicate next-page map from `useMonitorController`.
- Collapsed the ~40-prop `DeviceShellProps` interface into grouped objects (`defib`, `softKeys`,
  `nav`, `meds`, `power`, `audio`); updated the `page.tsx` call site to match.
- `LeftSidebar` keeps byte-identical markup, now sourcing its medication strings from the shared
  module.
- Added soft-key model tests; updated `DeviceShell`/page test wiring for the grouped props. Behavior
  and rendered output unchanged.

## [2026-05-31] [monitor] — Extract monitor interaction controller

- Moved monitor-page interaction state into `useMonitorController`, backed by a reducer, while
  keeping screen rendering, defib wiring, alarms, and session timing in `MonitorPage`.
- Centralized 12-lead capture, print preview, patient-info editing, medication events, modal
  state, mute/power flags, selected-control navigation, and Back precedence behind the controller.
- Added direct controller tests for initial state, selection toggling, patient-info drafts,
  capture timers, Back precedence, and power-off cleanup.
- Kept `useAlarm` backward-compatible for existing tests/callers by defaulting optional power/mute
  flags to powered-on and unmuted.
## [2026-05-31] [monitor] — NIBP reading animation via Patient Event button

- Created `src/hooks/useNibpReading.ts`: 5-phase state machine (idle → please_wait → reading → counting → settled) with pre-generated ascending sequence using Fisher-Yates shuffle for randomised-feeling ascent
- Wired `onPatientEvent` prop through `DeviceShell` → `RightControlClusterProps` → Patient Event `PhysicalButton` (previously had no onClick)
- Updated `VitalsStrip` to accept `nibpPhase` and `nibpDisplayValue` props; PNI box now renders conditionally: text slot during please_wait/reading, single-value VitalBox during counting/settled, normal stacked VitalBox when idle
- Updated `page.tsx` to call `useNibpReading(confirmed.bp_sys)`, pass `onPatientEvent` to DeviceShell, and pass `nibpPhase`/`nibpDisplayValue` to VitalsStrip
- Created `src/hooks/__tests__/useNibpReading.test.ts`: 14 tests covering all phase transitions, cancel mid-sequence, settled→new reading, and sequence endpoint/monotone validation for bpSys 5/60/110/180

## [2026-05-31] [monitor] — Retune torsades to exaggerated oval packets

- Retuned the shared torsades/VFib polymorphic waveform toward the new hand-drawn and pink-strip
  reference: small humps lead into larger rounded oval loops, then shrink back down in repeated
  spindle packets.
- Updated the torsades plan to replace the previous isolated-complex emphasis with an exaggerated
  continuous oval-loop packet contract.
- Added tests to guard the small-to-large-to-small packet envelope, active low-amplitude humps,
  rounded oval morphology, and cycle-to-cycle variant behavior.

## [2026-05-31] [monitor] — Make VFib use torsades-style pattern

- Changed VFib to use the current torsades-style polymorphic waveform pattern instead of the old
  coarse VFib pads trace.
- VFib now shares the 15-beat/3900ms generated template family with torsades, including
  cycle-to-cycle variants, active first-pass waveform content, low-amplitude waist activity, and
  varied complex sharpness.
- Updated rhythm tests so VFib is guarded by the torsades-style waveform contract.

## [2026-05-31] [monitor] — Fix ECG rhythm-switch compression artifact

- Fixed the torsades → NSR transition artifact where the old torsades waveform could be drawn at
  the new NSR cycle speed, creating a brief rapid up/down buzz.
- `startRenderer` now accepts a signal key and refreshes the active waveform immediately when the
  rhythm/channel shape changes, resetting phase so waveform data and cycle timing switch together.
- Wired signal keys through ECG, 12-lead cells, and secondary channels; added a renderer regression
  test for immediate waveform refresh on signal-key changes.

## [2026-05-31] [monitor] — Implement torsades ECG reference tuning

- Rebuilt torsades from the saved reference plan for `/Users/zaidtabana/Downloads/RPReplay_Final1778567085.mov`
  and the 2026-05-30 Pads screenshots.
- Replaced the compressed 12-beat/300ms torsades strip with a multi-second organized polymorphic
  VT template: 15 wide complexes over 3.9s, waxing/waning twist envelope, low-amplitude waist,
  rounded imperfect complexes, and deterministic beat-to-beat variation.
- Added cycle-to-cycle torsades variants so the rhythm no longer repeats the same overall pattern:
  generated templates rotate through multiple envelope families while preserving the organized
  polymorphic VT character.
- Kept the low-amplitude waist alive with small residual torsades waves, avoiding a long flat
  stretch while still preserving the visible wax/wane pattern.
- Added per-complex sharpness variation from the 2026-05-31 reference crop: some complexes now
  have faster upstrokes, sharper down-turns, rounded exits, or a small bottom hook before rising;
  the first visible torsades pass also starts with more activity before the early spike.
- Added `TORSADES_TUNING` and rhythm tests for beat rate/count, amplitude-envelope variation,
  waist depth, organized zero-crossing bounds, non-artifact contour, per-cycle pattern changes,
  first-pass activity, and variable segment sharpness.

## [2026-05-30] [monitor] — Document torsades ECG implementation plan

- Recorded the torsades reference-analysis plan from `/Users/zaidtabana/Downloads/RPReplay_Final1778567085.mov`
  and the three 2026-05-30 Pads screenshots.
- Planned implementation should treat torsades as organized fast polymorphic VT, not VFib noise:
  a multi-second twist envelope with waxing/waning amplitude, wide sloped complexes, rounded
  imperfect peaks/troughs, and strong beat-to-beat morphology variation.
- Added next-step test targets for torsades: beat count/rate, amplitude-envelope waist, greater
  morphology variation than VT, and more organization than VFib.

## [2026-05-30] [monitor] — Tune VFib ECG to pads screenshot

- Replaced the smooth VFib sine-blend with a screenshot-matched coarse pads waveform: fast
  repeated tall rounded peaks, deep troughs, uneven shoulders, and tiny deterministic line
  imperfections.
- Refined the VFib contour to keep one crest per wave, with no secondary/double peak on the
  drop-down; the descent still has slight slope variation rather than being perfectly smooth.
- Rounded the VFib lower trough slightly more so the bottom turn reads less sharp while preserving
  the same coarse rhythm and single-crest silhouette.
- Added `VF_TUNING` for VFib timing, amplitude, shoulder, wobble, and micro-noise controls.
- Updated rhythm tests, `PLAN.md`, and `STATUS.md` to guard the new VFib visual contract.

## [2026-05-30] [monitor] — Remove PEA from ECG rhythm options

- Removed PEA from the `Rhythm` union, synthesized ECG rhythm table, 12-lead lead-waveform branch,
  and the admin ECG selector. The active ECG choices are now NSR, VF, VT, Torsades, and Asystole.
- Persisted legacy PEA rhythm values now normalize back to NSR during store hydration.
- Updated selector, rhythm, and store tests so PEA is no longer expected or selectable.
- Updated `PLAN.md` and `STATUS.md` to stop listing PEA as an ECG rhythm.

## [2026-05-30] [monitor] — Tune asystole ECG from supplied pads video

- Replaced the mathematically perfect asystole zero-line with a deterministic pads baseline based
  on `/Users/zaidtabana/Downloads/RPReplay_Final1778567841.mov`: very slight low-amplitude
  slopes/waves plus tiny monitor noise, with no QRS-like spikes.
- Added `ASYSTOLE_TUNING` so the sweep timing, wander, and noise levels can be adjusted without
  rewriting the waveform generator.
- Updated rhythm tests, `PLAN.md`, and `STATUS.md` to reflect near-flat video-like asystole with
  tiny baseline variation instead of a strict flatline.

## [2026-05-30] [monitor] — Replace 12-lead capture result with static image

- `TwelveLeadPrintout` now displays the static ECG-paper capture asset at
  `/public/images/twelve-lead-capture.svg` instead of drawing a generated canvas printout from
  rhythm data.
- The existing flow is preserved: Capture still shows the ~4s acquiring card, then the image takes
  over the monitor display; Back still cancels acquisition or dismisses the result. The main-view
  PRINT preview uses the same image-backed component.
- Updated `PLAN.md`, `STATUS.md`, and the `TwelveLeadPrintout` test to reflect the image-backed
  requirement.

## [2026-05-29] [instructor] — Fix admin vital inputs forcing a leading zero

- `VitalInput` previously coerced an empty field back to `0` on every keystroke, so clearing a
  value and typing left entries like "020". It now keeps local text state: the field can sit
  empty mid-edit, leading zeros are stripped as you type ("020" → "20"), and the store still
  receives a number (empty = 0). External changes (save/send/reset, scenario load) resync the
  displayed text; blur normalizes an empty field back to the stored value.
- Tests: added cases for typing after a clear (no leading zero), leading-zero stripping, and
  resync-on-reset.

## [2026-05-29] [monitor] — Print button reprints the latest 12-lead capture

- The main-view **PRINT** soft key (slot 6) was previously inert. It now reprints the most
  recent completed 12-lead capture as a full-screen `TwelveLeadPrintout` overlay. It stays a
  no-op until at least one 12-lead has been acquired this session.
- Added session-only page state in `page.tsx`: `lastCapture` ({ rhythm, hr }) is recorded when
  an acquisition completes (in `startCapture`'s timer), and `printPreviewOpen` drives the
  main-view overlay. No store/persistence changes — both are cleared on power-off, so the
  capture does not survive a power cycle or reload.
- `captureLock` now also covers `printPreviewOpen`, so while the reprint is up every control
  except Back is inert (mirrors the 12-lead result behavior). Back dismisses the reprint.
- Wiring: new required `onPrint` prop on `DeviceShell` (passed through to `LeftSoftKeys`, wired
  to the `printer` soft key); `LeftSidebar` gained an optional `printActive` prop so the PRINT
  label highlights while the reprint is open.
- Tests: new `src/app/__tests__/printFlow.test.tsx` (inert with no capture; reprint over main +
  Back dismiss + lock-to-Back; forgotten after a power cycle); `DeviceShell` test now asserts
  the printer key fires `onPrint`.

## [2026-05-28] [monitor] — Add right-shell selection navigation

- Wired the physical Move up, Move down, and Enter buttons to cycle through selectable monitor regions with a blue highlight.
- Added selectable date/time, patient mode, beacon, battery, right vital boxes, waveform title metadata, ECG gain/Pads labels, and the minus toggle row.
- Added the subbar minus rectangle and adjacent empty rectangle, plus displayed `SpO2 1x` and `EtCO2 0 to 60 mmHg` graph metadata.
- Made Enter inert except for the minus toggle; the toggle hides/restores the bottom status/defib/CPR panel and expands the main area to ECG / EtCO2 / SpO2 when hidden.
- Fixed the blue highlight utility so the selected regions actually paint with the reference blue instead of carrying a non-emitted class.
- Added tests for shell nav handlers, monitor selection/toggle flow, vital selection styling, and secondary graph metadata.

## [2026-05-28] [monitor] — Implement 12-lead Capture (acquire dialog + printout)

- Pressing **Capture** in the 12-lead view now freezes the current rhythm/HR and shows a
  centered "Acquiring 12-Lead" card with a green progress bar that fills over ~4s
  (`AcquiringDialog`, `ACQUIRE_MS` in `page.tsx`).
- When the bar fills, a static **tan/salmon ECG-paper printout takes over the entire monitor
  display**: clinical 3×4 layout (I/aVR/V1/V4, II/aVL/V2/V5, III/aVF/V3/V6) + a Lead II rhythm
  strip (`TwelveLeadPrintout` + `lib/ecg/staticTrace.ts:drawLeadRow`). Each row is drawn as **one
  continuous trace** across its four leads (single full-width canvas) so the baseline connects
  with no seams; grid is a single uniform square pattern. Traces are rendered fresh from
  `getLeadWaveform(capturedRhythm, lead)` so morphology matches what was on screen.
- **During capture, only Back works** — every other physical control is inert via a new
  `captureLock` prop on `DeviceShell` (handlers no-op, defib row disabled). Back is a physical
  key outside the screen, so it still dismisses.
- **Back** precedence extended: cancels an in-progress acquisition (no printout) or dismisses
  the printout back to the live 12-lead grid. Captures are **transient** — nothing persisted;
  every press is a fresh capture.
- Added printout colors to `COLORS` (`utils.ts`) and `@theme inline` (`globals.css`): tan paper,
  uniform grid, dark ink, acquire green. Acquire bar is a slightly-rounded rectangle.
- Tests: `twelveLeadCaptureFlow` (acquire→printout→dismiss, mid-acquire cancel, lock-to-Back),
  `DeviceShell` (`captureLock`), `TwelveLeadPrintout` (12 leads + rhythm strip), `AcquiringDialog`.

## [2026-05-25] [monitor] — Add 12-lead Capture soft key (placeholder)

- Added a **Capture** key to slot 1 of the 12-lead left menu (on-screen `LeftSidebar`
  label + physical `LeftSoftKeys`), wired to a new `onCaptureTwelveLead` handler.
- The handler is a placeholder for now; it will later capture the current 12-lead graphs
  and render them as a printout (pink grid paper, 3×4 lead layout + rhythm strip).
- Tests: Capture key renders in 12-lead and fires its handler; remaining slots stay inert.

## [2026-05-25] [monitor] — Patient Info panel no longer covers the left menu

- The Patient Info overlay now starts after the 56px left sidebar (`left-[56px]` instead of
  `inset-x-0`), so the left soft-key menu stays visible while the panel is open.

## [2026-05-25] [monitor] — Patient Info: blue cursor moves between label and value

- The selection highlight is now a single blue cell that moves with the mode: while
  browsing, the current option's **left label** is blue; once you Enter to edit, the blue
  jumps to the **right value** cell.
- Labels no longer use a black background, and the `▲▼` arrows / amber editing outline are
  removed — the blue alone indicates position and edit state.
- Tests updated for the label-vs-value cursor and the removed arrows.

## [2026-05-25] [monitor] — Keep physical left soft keys always visible

- The physical left soft keys are fixed hardware and now render all 7 in every view; in
  12-lead they no longer collapse into empty spacers.
- The on-screen `LeftSidebar` still supplies the per-view label/action beside each key. A
  physical key with no on-screen counterpart in the current view is inert (no-op) — in
  12-lead that means slot 2 → Patient Info, slot 7 → Back, and the rest present-but-inert.
- Tests: assert all hardware keys stay visible in 12-lead and that unmapped keys do nothing.

## [2026-05-25] [monitor] — Fix persist migration error on store version bump

- Bumping the persist `version` 2 → 3 (Patient Info) without a `migrate` function made
  Zustand log "State loaded from storage couldn't be migrated…" — surfaced as a Next.js
  dev error overlay for anyone with previously-persisted state.
- Added a passthrough `migrate` to the `persist` options; the existing `merge` already
  seeds `patientInfo` and normalizes caller info, so old vitals/caller-info are preserved
  and `patientInfo` defaults are filled.
- Exported `STORAGE_KEY` and added a regression test that rehydrates a version-2 payload
  and asserts no migration error + seeded defaults.

## [2026-05-25] [monitor] — Patient Info menu in 12-lead view

- Added a **Patient Info** submenu, available only in the 12-lead view, opened by the
  second left soft key. It overlays the bottom 2/3 of the screen and edits two fields:
  **Patient Age** (clamp 0–120, default 40) and **Patient Sex** (M / F).
- Driven entirely by the right control cluster's three buttons: **Move up / Move down**
  arrows and the center **dot (Enter)**. Two-step model — browse highlights a field,
  Enter starts editing a draft, arrows change the draft, Enter commits to the store. Back
  cancels an in-progress edit (revert); Back again closes the panel; a final Back exits
  12-lead.
- Age/Sex persist in `monitorStore` (`patientInfo`, persist version bumped 2 → 3) via new
  `setPatientAge` / `setPatientSex` actions.
- 12-lead left menu now shows **Patient Info** (slot 2) + **Back** (bottom) on both the
  on-screen `LeftSidebar` and the physical `LeftSoftKeys`, kept aligned via empty spacers.
- New: `src/types/patientInfo.ts`, `PatientInfoPanel.tsx`. Tests added for the helpers,
  store, panel, `DeviceShell` keys/nav wiring, and an end-to-end page flow.

## [2026-05-25] [monitor] — Collapse left menu to BACK only in 12-lead view

- When the 12-lead view is active, `LeftSidebar` now hides the LUM / 12L / CO₂ / MED / ANALYSE / PRINT rows and shows only the BACK control, pinned to the bottom (aligned with the physical Back soft key).
- The full menu returns when leaving 12-lead view.
- Updated the `LeftSidebar` test to assert the collapsed 12-lead layout.

## [2026-05-25] [monitor] — Align physical left soft keys with on-screen menu rows

- The physical left soft keys did not line up in size or vertical level with the on-screen `LeftSidebar` menu rows (LUM / 12L / CO₂ / MED / ANALYSE / PRINT / BACK).
- Rebuilt `LeftSoftKeys` to mirror the sidebar's exact vertical math: same top offset (32px top bar + 24px sub bar + screen bezel), matching `pb-[54px]` (+ bezel), the same `h-[clamp(43px,6.2vh,68px)]` button height, and the same `justify-between` distribution over the shared device row — so the 7 keys land 1:1 on the 7 menu rows.

## [2026-05-25] [monitor] — Fix unclickable Back soft key in 12-lead view

- The left soft-key column reserved a `56px`/`54px` top/bottom spacer and sized 7 buttons up to `68px`, so on real viewport heights the bottom-most key (Back) overflowed its grid row and was painted over by `BottomDefibStrip`, intercepting its clicks — leaving no way out of the 12-lead view.
- Gave `LeftSoftKeys` `relative z-10`, dropped the unused bottom spacer (`grid-rows-[56px_1fr_54px]` → `[56px_1fr]`), and shrank the buttons (`clamp(43px,6.2vh,68px)` → `clamp(40px,5.4vh,60px)`) so all 7 fit within the column and stay clickable above the defib strip. No outer-grid restructure.
- Added a page-level regression test (`twelveLeadBackFlow.test.tsx`) using the real `DeviceShell`: entering 12-lead then clicking the physical Back returns to the main view.

## [2026-05-25] [monitor] — Wire left menu ANALYSE soft key to caller info modal

- Added a dedicated `onLeftAnalyse` action on `DeviceShell` and mapped it to the left-side ANALYSE soft key (the key aligned with the monitor menu ANALYSE row).
- Wired the monitor page to open `CallerInfoModal` from that left soft key without starting the defib analyse sequence.
- Kept the bottom defib `ANALYZE` button behavior unchanged (still runs analyse sequence and opens caller info).
- Added tests for left soft-key ANALYSE behavior and for keeping non-mapped left soft keys inert.

## [2026-05-16] [instructor] — Refine caller info extras

- Changed the Caller Info tab so extra rows are not shown by default.
- Added an `Add extra` button at the bottom of the form that reveals one optional title/input row at a time and caps at three extras.
- Kept existing saved extra values visible when reopening the Caller Info form.
- Updated caller-info form tests for progressive extra-row behavior.

## [2026-05-16] [instructor+monitor] — Add caller info display on ANALYZE

- Added caller-info draft/saved/confirmed state to the monitor store so dispatch details follow the existing Save → Send admin workflow.
- Added `CallerInfoForm` to a separate admin dashboard tab with fields for Intervention prioritaire code, Adresse, Probleme, Information, Mise a jour, optional nameable extra rows added one at a time, and Heure.
- Added `CallerInfoModal` on the monitor and wired the physical ANALYZE button to show the sent caller info while preserving the existing defib analyse sequence.
- Updated Save/Send buttons so caller-info edits enable the same staged workflow as vitals/rhythm changes.
- Added tests for caller-info form input, admin tab switching, store flow, Save/Send enablement, modal rendering, and MonitorPage ANALYZE display.

## [2026-05-16] [ui+alarm] — Flash alarming vital values

- Added a value-only flash animation for alarming vitals, alternating the displayed number between full opacity and 0 opacity.
- Slowed the value fade cycle to 1.9s so the alarm transition is smoother and less abrupt.
- Kept the alarm header and box styling stable so only the affected vital value flashes.
- Updated `VitalBox` tests to verify flashing is applied only when a vital is alarming.

## [2026-05-16] [ui] — Fix monitor clock hydration mismatch

- Changed the monitor top-bar clock to render a stable placeholder during SSR and the first client render, then start the real local clock after mount.
- Added `src/lib/monitorClock.ts` so placeholder and timezone formatting behavior is tested directly.
- This fixes the React hydration error where the server rendered one second and the browser hydrated on the next second.

## [2026-05-16] [instructor] — Add Normal button for admin vitals

- Added a top-of-vitals `Normal` button to the admin dashboard's `VitalsControls`.
- Added `resetVitalsToNormal` in the monitor store so draft HR, BP systolic, BP diastolic, EtCO2, and SpO2 reset to `DEFAULT_VITALS` without changing rhythm/waveform selections.
- Kept the existing Save → Send flow intact: the button updates draft values, and the monitor only changes after the instructor saves and sends.
- Added store and component tests for the new reset behavior.

## [2026-05-16] [ui+alarm] — Add vital threshold alarms and looping audio

- Confirmed and recorded the client alarm thresholds in `PLAN.md`: HR <40/>140, BP systolic <90/>200, BP diastolic <25/>225, SpO2 <90, and no EtCO2 alarm.
- Added centralized alarm evaluation plus `useAlarm`, which plays a single looping alarm while any vital is out of range and stops when all vitals normalize.
- Copied the provided alarm MP3 to `public/audio/alarm.mp3` and wired it through `playAlarm()` / `pauseAlarm()`.
- Added per-vital alarm styling: white box background, red header, white header text, and red numbers; systolic or diastolic alarms the whole PNI box.
- Updated tests for threshold boundaries, multiple simultaneous alarms, hook play/stop behavior, and alarm UI styling. Full suite: 111 tests passing; lint passes.
- Cleaned up related hook lint findings in `useSessionTimer` and `DeviceShell` so `npm run lint` completes successfully.

## [2026-05-13] [ecg] — Move VT plateau apex earlier

- Shifted the VT plateau dome's apex earlier in the rounded arc using `VT_TUNING.plateauApexOffset`, so the rest of the plateau slopes downward into the V trough instead of cresting near the middle.
- Strengthened the VT rhythm test to assert the visible plateau peaks in the first third of the arc and continues downward before the trough.
- Updated `PLAN.md` and `STATUS.md` with the refined early-peak plateau requirement.

## [2026-05-13] [ecg] — Smooth VT plateau contour

- Refined the VT requirement in `PLAN.md`: keep the existing rise/fall geometry, but make the plateau itself rounded, non-jagged, and gently downward-sloping.
- Replaced the VT plateau's layered sine wobble with a smooth periodic dome/shelf in `synthVT`; reduced fine wobble and micro-noise so the plateau reads as a clean rounded top before the same sharp downward V trough.
- Updated the VT rhythm test to guard the rounded downward-sloping plateau and prevent jagged plateau regressions.

## [2026-05-13] [ecg] — VT is now monomorphic (every beat identical)

- Removed the `vtSeedCounter` mechanism in `getEcgRhythm`. VT now returns the static `ECG_RHYTHMS.vt` reference like every other rhythm — every cycle on the strip renders the same `synthVT(1)` beat, matching the monomorphic ventricular tachycardia reference image (small rounded positive bump → sharp deep downward V, repeating identically).
- Replaced the two beat-variation tests with two monomorphism guards: `VT is monomorphic — every beat is identical` (asserts `===` reference and zero L1 diff between two consecutive `getEcgRhythm('vt')` calls) and `VT has a small positive plateau and a deep sharp downward V` (asserts trough magnitude > 1.2× peak, plateau spread < 0.18 — confirms the negative-dominant silhouette).
- Added `vt` to the existing "stable references" test alongside `nsr`, `vf`, `asystole`, `pea`.

## [2026-05-13] [ecg] — Compact Pads-style VT tuning

- Added an exported `VT_TUNING` profile in `src/lib/ecg/rhythms.ts` so VT visual adjustments are named constants (`cycleMs`, plateau height/wobble, trough depth/center/width, V sharpness, jitter) instead of scattered magic numbers.
- Rebuilt `synthVT` around an analytic VTach function: a continuous wobbly upper plateau minus a clean triangular V trough each cycle, so the trace reads as always moving up/down instead of isolated spikes.
- Tightened VT timing to `340ms` so the ECG sweep shows many compact complexes across the screen, closer to the supplied Pads reference.
- Added seeded variation to trough center, depth, half-width, and V sharpness so some V troughs are sharper and some are wider/longer without becoming noisy artifact.
- Updated rhythm tests to guard the two explicit criteria: variable clean V troughs and non-flat plateau wobble, plus timing, envelope, and artifact-free adjacent deltas.

## [2026-05-13] [ecg] — Independent V-arm variability on VT

- Added `ascentVar` and `descentVar` per-beat shifts (each `±0.03` of cycle) that nudge the rise and descent shoulders along `t` *independently of `plateauVar`*. A beat can have a sharp fast descent paired with a gentle wide ascent (or any combination) — V's are no longer mirror-symmetric across the cycle.
- Effect: V-arm spans vary by roughly ±25% from their nominal width, hitting the user's "20–40% longer or shorter" target. The trace no longer reads as "robotic" — successive V's visibly differ in width and angle.
- Relaxed the smoothness guard upper bound on `maxAdjacentDelta` from `0.10` to `0.25` to accommodate steep V transitions on the sharpest beats (the secondary `largeDeltas > 0.04` count, capped at 80, remains the real noise detector).
- Two new tests: `varies V-arm spans across beats` (max-min span > 12 samples on each side across 24 beats) and `produces asymmetric V arms on some beats` (>5/24 beats with |ascent - descent| > 6 samples).

## [2026-05-13] [ecg] — VT peak/trough outliers: half-height and near-double beats, independently

- Replaced the single `ampVar` with an outlier-style distribution: ~10% of beats are half-height (`0.50–0.65 × baseline`), ~10% are near-double (`1.30–1.50 ×`), and ~80% stay in the normal range (`0.85–1.15 ×`). Peak height range now ~0.20 to ~0.95 (was 0.30 to 0.70).
- Added an independent `lowVar` for trough depth with the same outlier distribution — a beat can be tall with a shallow trough, or short with a deep trough. Trough range now ~-0.20 to ~-0.80.
- New test `getEcgRhythm("vt") produces half-height and near-double outliers` samples 60 seeded beats and asserts the extremes hit both ends for peak and trough independently (min peak < 0.40, max peak > 0.65, max trough > -0.40, min trough < -0.55). Existing envelope test relaxed to bracket the new wider range.

## [2026-05-13] [ecg] — Longer VT plateaus, tighter trough recovery, wider amplitude spread

- Bumped `plateauVar` range from `[-0.025, +0.075]` to `[-0.025, +0.115]` — some beats now hold the plateau across ~45% of the cycle (was ~25% max). Most beats are visibly wider; ~1 in 6 are shorter.
- Shifted the trough/recovery waypoints with a fraction of `plateauVar` (`w(0.72 + plateauVar * 0.5)`, `w(0.88 + plateauVar * 0.2)`) so extended plateaus compress the V+recovery region — the horizontal gap *between* successive plateaus is now noticeably shorter, matching the rapid-VT silhouette in the reference.
- Widened `ampVar` from `[0.78, 1.12]` to `[0.65, 1.20]` for a "decent bit" more variety in peak height and trough depth beat-to-beat. Test envelope relaxed accordingly: peak in `[0.25, 0.85]`, trough in `[-0.85, -0.25]`, `roundedLow / data.length > 0.20` (was 0.25, since wider plateaus take samples away from the rounded low region).

## [2026-05-13] [ecg] — Variable plateau width on VT peaks

- Added `plateauVar` to `synthVT` (range `-0.025` to `+0.075` of cycle, asymmetric so most beats extend but ~1 in 4 are shorter). The pre-rise low and rise shoulder waypoints shift earlier by `plateauVar`; the descent shoulder and post-descent low shift later by the same amount — rise/descent slopes are preserved, only the plateau width changes per beat.
- Apex inner waypoints (notch/twin-hump variants) keep their offsets relative to `apexT`; verified they stay inside the shoulder bracket even at max compression. Trough waypoints at `w(0.72)` / `w(0.88)` unchanged — the trough region absorbs the plateau's extra width (still ≥ 0.075 of cycle wide in the worst case).
- New test `getEcgRhythm("vt") varies plateau width across beats` samples 24 seeded beats and asserts the spread in near-peak sample count (`> peak * 0.85`) is at least 20 samples — confirms the bi-directional `plateauVar` reaches both ends across many beats.

## [2026-05-13] [ecg] — Per-beat apex variability on VT

- `synthVT` now picks a seeded peak-shape variant for every beat: asymmetric single peak, mid-notch, or twin hump. The dominant apex also drifts ±0.02 horizontally and the notch dip is ~10% of peak height (`high * 0.86–0.90`).
- Variants are spliced into the existing waypoint list between the rise (`w(0.18)`) and descent (`w(0.39)`) — `smoothPoints` handles arbitrary-length waypoint sequences so no other code changed. Pre-rise, trough, and tail waypoints are untouched.
- New test `getEcgRhythm("vt") produces notched/twin-hump peaks on some beats` verifies that across 24 seeded beats at least one shows a true dip (≥4% below peak) between two near-peak (≥96% of peak) samples — false positives from soft-contour ripple are excluded by the strict thresholds.

## [2026-05-13] [ecg] — Wider beat-to-beat variability in VT

- Expanded `synthVT` per-beat envelope: amplitude now varies ~0.78–1.12 (was 0.92–1.04), added a ±0.11 positive/negative dominance tilt, ±14% horizontal width variation, and a wider phase shift. Result is the polymorphic look in the new reference (some beats taller / more positive-dominant, others narrower or deeper) without making any individual beat artifact-noisy.
- Relaxed VT shape envelope tests to match: peak in [0.3, 0.8], trough in [-0.75, -0.3], beat-to-beat L1 diff bumped to [2, 120]. The "smooth, not artifact-noisy" max-adjacent-delta guard is untouched — within-beat smoothness is preserved.

## [2026-05-12] [ecg] — Correct VTach to rounded screenshot silhouette

- Replaced the noisy negative-dominant VTach generator with a smooth rounded-box complex matching the screenshot silhouette: soft rise, broad rounded top, smooth fall, and rounded low segment
- Kept subtle beat-to-beat variation without artifact-like noise or sharp downward spikes
- Fixed ECG timing so `getCycleMs` no longer calls the VT waveform factory every animation tick
- Reduced ECG amplitude/cycle jitter so VT keeps the reference shape instead of wobbling away from it
- Updated VTach tests to guard the rounded plateau/low-segment shape and reject noisy adjacent jumps

## [2026-05-12] [ecg] — VT negative-dominant + per-beat variation

- Earlier passes (the two entries directly below) left the VT trace looking too smooth and too symmetric compared to the supplied `Completed/Vtach/IMG_0029.jpeg` reference; this pass course-corrects.
- `synthVT` rebuilt as: small pre-spike positive bump → wide deep negative dominant gaussian spike → positive rebound → small post-rebound notch → soft tail, plus low-amplitude baked-in noise and slow baseline wander so the trace no longer reads as synthetic.
- New `getEcgRhythm(rhythm)` factory exported from `rhythms.ts`. For VT it returns a freshly-seeded `synthVT` each call so the renderer's per-cycle waveform swap produces visible beat-to-beat shape variation (±9% amplitude, ±7% width, small centroid shift). Other rhythms still return their stable static `ECG_RHYTHMS` entry.
- ECGCanvas now uses `getEcgRhythm` instead of the static map. `ampJitter` 0.08 → 0.14 and `cycleJitter` 0.04 → 0.07 to make the variability visible without destabilizing NSR.
- Updated VT tests: replaced the old "broad rounded peaks / maxAdjacentDelta < 0.02" assertions with negative-dominant (|trough| > peak·1.4), noise-present (maxAdjacentDelta 0.02–0.2), and beat-to-beat variation across two back-to-back factory calls.

## [2026-05-12] [ecg] — Retune VTach to screenshot reference

- Reshaped VTach from a single clean peak into broader rounded monomorphic complexes with plateau-like tops, small contour notching, and V-shaped downward drops
- Slowed/stretched the VTach cycle so fewer, wider complexes appear across the monitor like the screenshot reference
- Rounded the per-beat VTach curve further by removing the sharper notch/drop pieces and replacing them with smoother waveform components
- Updated the VTach rhythm test to guard the broader rounded shape instead of only checking that the trace is not a sine wave
- Updated `PLAN.md` and `STATUS.md` to lock the latest screenshot as the VT visual direction

## [2026-05-12] [ecg] — Match VFib and VTach video references

- Tuned VFib from artifact-like noise into a coarse rolling fibrillation waveform based on the supplied `Completed/Vfib` monitor videos
- Tuned VTach into a smoother monomorphic wide-complex waveform based on the supplied `Completed/Vtach` monitor videos
- Updated the rhythm tests so VFib stays high-amplitude/coarse and does not regress back into static-looking noise
- Recorded the video-reference requirement in `PLAN.md` and completion status in `STATUS.md`

## [2026-05-12] [ecg+ui] — Rhythm video polish, EtCO2 150 scale, and narrower vitals

- Retuned the live ECG canvas templates closer to the supplied monitor rhythm videos while preserving admin-controlled rhythm selection
- Matched the default ECG label/morphology to the provided pads reference: `Pads 1.0 cm/mV`, smaller R peak, and only a shallow post-R notch instead of a deep downward spike
- Updated EtCO2 graph scaling from `0-63 mmHg` to the reference video's `0-150 mmHg` range; axis labels now read `150 / 75 / 0`
- Raised the instructor EtCO2 input maximum to `150`
- Narrowed the right vitals column to `96px`, centered the vital numbers, and reduced vital text/padding to remove the extra right-side space; vitals remain right-side only
- Updated waveform tests for the 150 mmHg scale, 75 mmHg mid-height plateau, 150+ clamping, VT shape, and VF chaos

## [2026-05-12] [ecg] — Reference-guided rhythm graph pass

- Reworked the ECG rhythm templates for the admin rhythm buttons using the supplied rhythm references as the visual target
- NSR/PEA now use a sharper QRS complex, smaller P wave, subtle ST segment, and light baseline movement so the trace reads less like a generic Gaussian demo
- VT now renders as a wide-complex monomorphic rhythm with a broad dominant peak, terminal trough, and slight notching
- VF now renders as a coarser chaotic trace with irregular amplitude and frequent zero crossings instead of a smooth repeated sine blend
- Asystole remains a clean flatline
- Locked the layout requirement in `PLAN.md`: vitals stay on the right column; bottom space remains for status/defib controls
- Strengthened rhythm tests to guard VT shape and VF chaos; focused ECG tests and TypeScript pass

## [2026-05-12] [ecg+ui] — Physiologically reactive waveforms + rhythm fidelity

- EtCO2 plateau now tracks the EtCO2 mmHg vital on the 0-63 mmHg on-screen scale — sending 35 mmHg plateaus at the "35" tick; sending 63 saturates at the top; 0 stays flat
- EtCO2 trace renders as a filled purple area under the curve (matches the Zoll capnograph reference video the user shared); new `fillStyle: 'area'` option on the renderer with full-alpha top-edge stroke
- SpO2 pleth amplitude now scales with the SpO2 % vital: ≥95 = full, 85-95 = linear 0.7-1.0, 70-85 = linear 0.35-0.7, <70 = 0.25 (barely visible). "weak" shape compounds with the factor (×0.45)
- Replaced static `SPO2_WAVEFORMS`/`ETCO2_WAVEFORMS` maps with `getSpo2Waveform(shape, %)` / `getEtco2Waveform(shape, mmHg)` factory functions — re-baked at each cycle wrap so changes are picked up at the next beat/breath boundary
- Threaded `confirmed.spo2` + `confirmed.etco2` through `WaveformPanel` → `SecondaryChannel`
- Decoupled `sweepMs` (paper speed across the canvas) from `cycleMs` (cardiac/respiratory cycle) in the renderer — previously the trace took one full cycle to cross the canvas, so only one QRS/breath was visible at a time. Now `sweepMs` is fixed per channel (ECG/SpO2 = 4000ms, EtCO2 = 15000ms) and multiple cycles fit across the screen at realistic Zoll paper speeds
- VT shape rewritten from a sine wave to wide rounded peaks with a small undershoot — matches the user-supplied screenshot of real-life monomorphic VT
- VF cycleMs slowed from 250 → 450ms and the shape rebuilt with multi-frequency drift + noise so it reads as chaotic instead of a fast periodic wave
- Narrowed the right vitals column further: 180px → 140px (text-4xl numbers + "PNI/mmHg" header fit comfortably; freed horizontal space for the waveform area)
- Tests: 31 ECG + vitals tests passing — covers EtCO2 plateau scaling, SpO2 amplitude scaling, VT wide-pulse shape, VF cycleMs floor, sweep-speed exposure
- TypeScript clean, ESLint clean (one preexisting DeviceShell warning unchanged), dev server compiles without runtime errors

---

## [2026-05-11] [ecg+ui] — Live waveform graphs and vitals layout refinement

- Implemented canvas overwrite-scroll renderer (`src/lib/ecg/renderer.ts`) — single rAF loop reused for ECG, SpO2, and EtCO2 channels; DPR-aware sizing via ResizeObserver; beat-boundary waveform swap so rhythm changes don't glitch mid-cycle
- Implemented synthesized waveform data (`src/lib/ecg/rhythms.ts`) — NSR (P-QRS-T), VF (chaotic), VT (wide regular), asystole (flatline), PEA (NSR shape); SpO2 plethysmograph normal/weak; EtCO2 square/hypoventilation/shark-fin shapes
- ECG always renders; secondary channel toggles between SpO2 (HR-paced yellow pleth) and EtCO2 (5s respiratory cycle purple capnograph) via the existing CO2 soft key
- Deleted dead `src/lib/waveformPaths.ts` and the `ecgSrc`/`spo2Src`/`etco2Src` props on `WaveformPanel`; `VideoWaveform` retained for the 12-lead overlay only
- Shrunk vital numbers from `text-5xl` → `text-4xl`; PNI now stacks systolic / divider / diastolic vertically (`text-3xl`) instead of inline `120/80`
- Narrowed the right vitals column from 220px → 180px in `MonitorLayout` so the waveform area gets more horizontal space
- Tests: 22 new tests (rhythms normalization, renderer rAF lifecycle, VitalBox stacked-mode divider, VitalsStrip stacked PNI output); full suite 84/85 passing (1 preexisting DeviceShell power-button failure unrelated to this change)
- TypeScript clean (`npx tsc --noEmit`)

---

## [2026-05-10] [ui] — Correct right-shell arrows and defib label placement

- Standardized the right-side control buttons back to rounded-square shapes and moved the curvature into the arrow glyphs
- Replaced the home glyph with an explicit house icon inside the upper-left right-shell button
- Reduced the SHOCK button size to clear the SHOCK label
- Made ENERGY SELECT thinner and changed its arrows to wider, flatter triangle shapes
- Repositioned the red 1 and 2 labels so they float next to ENERGY SELECT and CHARGE instead of sitting inside the controls
- Raised and slightly reduced ANALYZE and CHARGE for better vertical centering

---

## [2026-05-10] [ui] — Align top rim, power toggle, and shell button spacing

- Moved the white top bar and power button onto the blue outer rim instead of the grey face
- Added local power-button toggle behavior: green when on, red when off
- Lengthened the ENERGY SELECT button and tightened its arrow/text spacing
- Reduced and repositioned the red 1 / 2 / 3 labels toward the top-left of the energy, charge, and shock controls
- Refined the right control cluster with smaller curved arrow buttons and expanded the darker grey panel to contain the patient-event button
- Cleaned up the persisted store hydration hook so the full lint suite stays green

---

## [2026-05-10] [ui] — Tune Zoll shell controls and physical-button behavior

- Restored the physical PACER button as an inert clickable control
- Moved 12-lead, EtCO2, and Back behavior to the aligned grey physical soft keys; all other grey shell buttons now click without action
- Converted the inner dark left sidebar labels to display-only controls so they no longer trigger navigation
- Fixed ENERGY SELECT arrow spacing, raised the SHOCK label, and repositioned the red 1 / 2 / 3 labels beside energy select, charge, and shock
- Updated right-side shell icons to bell, camera, and patient-event/bicep markers, with more curved home/down button shapes
- Added plug and battery indicators at the lower-left shell LEDs
- Tests updated for physical EtCO2 behavior, inert PACER, and non-clickable inner sidebar labels

---

## [2026-05-10] [ui] — Refine Zoll physical shell controls

- Rebuilt the monitor `DeviceShell` outer frame with a blue rim, rounded grey face, recessed screen, top branding, and power-button detail closer to the Zoll reference
- Aligned the left grey physical soft keys with the inner screen's left sidebar labels and wired the 12-lead/back soft keys to existing navigation actions
- Reworked the right physical navigation cluster into an irregular recessed control panel instead of a uniform button grid
- Rebuilt the bottom defib control bay with smaller ANALYZE / ENERGY SELECT / CHARGE buttons, repositioned red step numbers, and a large round SHOCK button
- Removed the PACER button from the physical shell as part of this intermediate pass
- Added a DeviceShell regression test confirming the PACER control stays removed
- Cleaned up `useDefibSequence` hook lint issues without changing the defib sequence behavior
- Tests: `npm run test:run`; lint: `npm run lint`; TypeScript: `npx tsc --noEmit`; build: `npm run build`

---

## [2026-05-10] [ui] — Monitor base UI + menu navigation

- Replaced Next.js boilerplate at `/` with the full Zoll X Series monitor layout
- Implemented reusable atoms: `VideoWaveform`, `SidebarButton`, `VitalBox`, `LeadCell`
- Implemented layout chrome: `MonitorLayout` (CSS Grid), `TopStatusBar`, `SubBar`, `BottomStatusBar`
- Implemented main panels: `WaveformPanel`, `ECGCanvas` (placeholder image/video), `SecondaryChannel`, `ApplyElectrodesBar`, `VitalsStrip`, `LeftSidebar`, `RightNavCluster`
- Implemented overlays: `TwelveLeadPage` (2×6 lead grid), `PatientModeModal` (Adulte/Pédiatrique/Néonatal)
- Implemented defib state machine (`useDefibSequence`) and `DefibButtonRow` with progress bars + shock counter
- Added shared `ProgressBar` for defib timing
- Added Zoll palette to Tailwind theme (`@theme inline` in globals.css) so colors resolve as utility classes (`text-ecg-green`, `bg-pending-amber`, etc.)
- Wired menu navigation: 12-lead overlay open/close, EtCO2/SpO2 channel swap, patient mode dropdown updates label + joule defaults, defib sequence enforces ANALYSE → CHARGE → SHOCK ordering
- Vitals + waveforms hardcoded for now; gif/video assets to be dropped under `/public/waveforms/` (graceful fallback when missing)
- Tests: 21 passing across `MonitorLayout`, `LeftSidebar`, `PatientModeModal`, `useDefibSequence`
- TypeScript clean, dev server boots at `localhost:3000`

---

## [2026-05-04] [scaffolding] — Phase 1 complete: Next.js app scaffolded, all dependencies installed, test setup, all source files created

- Next.js 16.2.4 app created at workspace root (TypeScript, Tailwind CSS v4, App Router, src/ dir, `@/*` import alias)
- Installed: `@supabase/supabase-js`, `@supabase/ssr`, `zustand`, `nanoid`, `clsx`, `tailwind-merge`
- Installed dev: `vitest`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `vite-tsconfig-paths`
- Created `vitest.config.ts` and `src/__tests__/setup.ts` — test runner configured with jsdom + RTL
- Created `.env.local.example` with Supabase variable names
- Created `supabase/migrations/001_initial_schema.sql` — full schema with RLS policies
- Scaffolded 59 empty source files matching PLAN.md folder structure
- Implemented: `src/types/vitals.ts`, `src/types/session.ts`, `src/types/scenario.ts`
- Implemented: `src/lib/utils.ts` (cn helper + COLORS), `src/lib/session.ts` (nanoid code gen + validator)
- Implemented: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/types.ts`
- Implemented: `src/lib/realtime/events.ts` (BroadcastEvent union + channelName helper)
- Created API route stubs: `POST /api/session/create`, `GET /api/session/join`
- Created page shells: `/session/[code]/monitor`, `/session/[code]/instructor`
- `tsc --noEmit` passes with 0 errors
- Dev server starts at `localhost:3000` in <300ms

---


- Created `PLAN.md` with 11 development phases, full folder structure, dependency list, and key decisions table
- Created `AGENTS.md` with 4 role definitions (UI, Simulation, Realtime, Instructor), coding conventions, data flow contracts, and props/type contracts per role
- Created `STATUS.md` with current build state, blocked items, and next steps
- Created `CHANGELOG.md` (this file)

---

## [2026-05-03] [planning] — Phase 2 complete: Architecture designed

- Defined 5-layer architecture: UI → Simulation Engine → Realtime Client → Supabase
- Component tree designed for both monitor and instructor views
- State split defined: local draft vs shared Supabase state
- Supabase schema designed: `sessions`, `vitals_snapshots`, `scenarios`
- Realtime strategy: Broadcast for live events, Postgres for late-joiner recovery
- ECG rendering strategy: canvas overwrite-scroll with Float32Array rhythm point data
- Waveform strategy: looped `<video>` for SpO2, EtCO2, 12-lead; canvas for main ECG

---

## [2026-05-03] [planning] — Phase 1 complete: Requirements gathered

- Reviewed all 17 Zoll X Series reference screenshots
- Documented full UI layout, color scheme, popup behavior, alarm thresholds
- Confirmed: video-loop strategy for non-ECG waveforms
- Confirmed: English language UI
- Confirmed: separate routes for instructor vs student
- Confirmed: CPR = blue banner overlay + timer (not waveform change)
- Created `SCREENSHOTS_SUMMARY.md` with per-screenshot UI/feature breakdown

- [ui] Refactored `useDefibSequence` and implemented dynamic `BottomStatusBar` and `EnergyScaleColumn` for Paramedic Monitor defib interactions (CPR sequence, Analyse sequences, etc)

- [ui] Compressed Left Sidebar labels to match identically with physical buttons using `justify-between` and clamp alignments. Applied `min-h-0` overflow handling to Monitor Layout so ECG/SpO2 Graphs naturally compress downward to make room for the inner 110px Bottom Status Bar unconditionally.

- [ui] Aligned left sidebar labels to exactly trace physical outer shell buttons structurally utilizing CSS Grid constraints.
- [state] Added dynamic logic to `BottomStatusBar` adjusting conditional bounding/styles during analytical sequences (e.g. blackout blocks for SHOCK NOT ADVISED state).

- [state] Extended analyzer sequence timers to exactly 2.5s (ECG) + 2.5s (Clear) + 4.0s (Result).
- [ui] Maintained shock count visibility unconditionally during all analysis phases. 
- [audio] Added `playSystemAudio` to sequentially playback `stand_clear`, `shock_not_advised`, and `perform_cpr` MP3s synchronously with analysis transitions.
## [2026-06-12] [instructor] - Add Patient Physical auto-sort markers

- Added an admin-only Patient Physical auto-sort textarea for physical assessment section pastes.
- Mapped chest/respiratory, abdomen, pelvis, and front-side extremity sections into amber review markers with finding text.
- Kept green Patient Physical selection as manual confirmation and reset clearing local findings.
