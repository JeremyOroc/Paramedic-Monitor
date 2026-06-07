# STATUS.md — Paramedic Monitor Build Status

> Updated with every commit. This is the single source of truth for what is done, in progress, and blocked.
> All team members and AI tools should read this before starting work.

---

## Current Phase
**Monitor base UI + menu navigation — COMPLETE.** Next up: instructor/admin dashboard.

> Note: PLAN.md phases were re-scoped on 2026-05-10. The user opted to defer sessions and realtime to the end and start with a static monitor at `/` that has working menu navigation. Phases 2 (session routing), 7 (realtime), and 10 (scenarios) are deferred. The work below corresponds to a focused subset of PLAN.md phases 3 (static UI), 6 (defib only), and 9 (patient mode popup only).

---

## Completed
- [x] Requirements gathering (Phases 1–2 of project planning)
- [x] Zoll X Series UI reference documented (`screenshots/SCREENSHOTS_SUMMARY.md`)
- [x] Architecture designed (layers, component tree, state, realtime, ECG strategy)
- [x] `PLAN.md` — full development plan with 11 phases
- [x] `AGENTS.md` — role definitions, conventions, data flow contracts
- [x] `STATUS.md` — this file
- [x] `CHANGELOG.md` — history log
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
  - [x] Main panels: `WaveformPanel`, `ECGCanvas` (placeholder), `SecondaryChannel`, `ApplyElectrodesBar`, `VitalsStrip`, `LeftSidebar`, `RightNavCluster`
  - [x] Overlays: `TwelveLeadPage`, `PatientModeModal`
  - [x] Defib state machine: `useDefibSequence` + `DefibButtonRow` (ANALYSE → CHARGE → SHOCK), shared `ProgressBar`
  - [x] Wired interactions: 12-lead toggle, EtCO2 channel swap, patient mode dropdown, energy ▲▼, full defib sequence
  - [x] Tests: 21 passing (MonitorLayout, LeftSidebar, PatientModeModal, useDefibSequence)
  - [x] TypeScript clean; dev server serves at `localhost:3000`
- [x] **Dispatch lock + countdown startup gate — COMPLETE:**
  - [x] Monitor boots locked-off for normal users; admin caller-info Send arms a lock + ETA countdown on first send (minutes + seconds fields), later Sends only update content; admin Reset = full reset to locked-off
  - [x] Unlock = Acknowledge → countdown 0 → Arrival; Transport enabled only after power-on; Ack/Arrival/Transport record EST wall-clock time, merged into the event log
  - [x] Gate state persisted (store version 7, absolute countdown end-timestamp) so refresh resumes; `?dev=1` bypasses the gate; pre-dispatch standby screen, inert blocked power button
  - [x] New `useCountdown` hook + `formatEstTime` util; caller-event state moved from controller to store; `initialPoweredOn` controller option; tests across store/hook/util/modal/controller + page flow tests run with `?dev=1`
- [x] **Dispatch locked/off hardware silence — COMPLETE:**
  - [x] While powered off or dispatch-locked, hardware controls are inert and do not play button audio; only the dispatch touchscreen buttons remain interactive on the locked caller-info screen
  - [x] Locked caller-info now fills the monitor screen as a touchscreen; both locked caller-info and the in-monitor Call Info view use a distinct dispatch-tablet/iPad visual treatment so they do not look like native monitor UI
  - [x] Caller-info A/B test added: default icon-led `assignment` dashboard for fast parsing, with the previous tablet layout available via `?callerInfoVariant=classic`
  - [x] Assignment dashboard icon/action colors now follow the reference palette, and all three action buttons stay visible on the monitor
- [x] **Disconnected startup vitals/graphs — COMPLETE:**
  - [x] Monitor vital numbers start/reset blank while inactive, with SpO2 rendering `SpO2 OFF`
  - [x] Admin vital rows expose a right-side Off/On toggle; clicking anywhere in the toggle rectangle flips that specific vital on/off
  - [x] Vital alarms stay inactive for Off startup/reset vitals until each specific vital is turned On through Save → Send; numeric `0` is treated as a real alarmable value when On
  - [x] ECG, SpO2, and EtCO2 graph channels start as spaced dashed disconnected traces via their `Off` selector options; choosing a non-Off option makes that graph live after Save → Send
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
  - [x] Admin dashboard includes a separate Caller Info tab with fields: Intervention prioritaire code, Adresse, Probleme, Information, Mise a jour, Heure, plus an `Add extra` button capped at three optional title/input rows
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

## In Progress
- Nothing — next plan is the admin/instructor dashboard

---

## Blocked / Needs Input
- [ ] **12-lead waveform assets** — User to provide gif/mp4 12-lead waveforms in `/public/waveforms/12lead/<rhythm>/<lead>.gif` for each rhythm × lead (I, II, III, aVR, aVL, aVF, V1–V6). ECG/SpO2/EtCO2 are now canvas-rendered and no longer need assets.
- [ ] **Supabase credentials** — Deferred. Will be needed once realtime / sessions phase begins. Copy URL + anon key into `.env.local`, run the migration, enable Realtime on `vitals_snapshots`.
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
| Realtime | Supabase Broadcast + Postgres snapshots |
| Post-shock | Instructor controls manually |
| Send behavior | Staged commit (pending state → Send → broadcast) |

---

## Next Steps (for whoever picks this up)
1. **Admin/instructor dashboard** — build the controls panel (vitals inputs with pending/Send flow, rhythm selector, defib panel, scenario builder skeleton). Components already scaffolded in `src/components/instructor/`. State via Zustand `instructorStore`. Local-only first; realtime wires in the next phase.
2. **Realtime wiring** — Supabase Broadcast for instructor → monitor sync (vitals_update, defib_event, cpr_toggle).
3. **Sessions** — restore `/session/[code]/...` routes; connect landing page (Create / Join).
