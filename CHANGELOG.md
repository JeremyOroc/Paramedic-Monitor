# CHANGELOG.md — Paramedic Monitor

> Append-only. Add a new entry at the TOP when completing work. Never edit past entries.
> Format: `## [YYYY-MM-DD] [role] — description`

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
