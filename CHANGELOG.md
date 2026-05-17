# CHANGELOG.md — Paramedic Monitor

> Append-only. Add a new entry at the TOP when completing work. Never edit past entries.
> Format: `## [YYYY-MM-DD] [role] — description`

---

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
