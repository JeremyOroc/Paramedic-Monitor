# CHANGELOG.md — Paramedic Monitor

> Append-only. Add a new entry at the TOP when completing work. Never edit past entries.
> Format: `## [YYYY-MM-DD] [role] — description`

---

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
