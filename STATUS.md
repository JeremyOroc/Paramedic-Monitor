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

---

## In Progress
- Nothing — next plan is the admin/instructor dashboard

---

## Blocked / Needs Input
- [ ] **Waveform image/gif assets** — User to provide gif/mp4 placeholder waveforms. Drop into `/public/waveforms/`:
  - `ecg-placeholder.gif`, `spo2-placeholder.gif`, `etco2-placeholder.gif`
  - `12lead/<rhythm>/<lead>.gif` for each rhythm × lead (I, II, III, aVR, aVL, aVF, V1–V6)
  - The UI ships either way — `VideoWaveform` falls back to an empty area when the asset is missing.
- [ ] **Supabase credentials** — Deferred. Will be needed once realtime / sessions phase begins. Copy URL + anon key into `.env.local`, run the migration, enable Realtime on `vitals_snapshots`.
- [ ] **Paramedic-supplied waveform videos** — Real ECG/SpO2/EtCO2/12-lead videos for production fidelity (later phase).
- [ ] **Alarm thresholds** — HR <40/>150 bpm, BP sys <90/>200 mmHg. Confirm with paramedic friend.
- [ ] **Neonate joule default** — Set to 10J. Confirm with paramedic friend.

---

## Architecture Decisions (locked)
| Decision | Value |
|----------|-------|
| Main ECG | Canvas + requestAnimationFrame |
| SpO2 / EtCO2 / 12-lead | `<video loop muted autoplay>` |
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
