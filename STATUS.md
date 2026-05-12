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
- [x] **Live waveform graphs + vitals layout refinement — COMPLETE:**
  - [x] Canvas overwrite-scroll renderer in `src/lib/ecg/renderer.ts` (rAF, DPR-aware, ResizeObserver, beat-boundary waveform swap)
  - [x] Synthesized waveform data in `src/lib/ecg/rhythms.ts` (NSR/VF/VT/Asystole/PEA, SpO2 pleth normal/weak/off, EtCO2 normal/hypoventilation/obstructed/off)
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
  - [x] VF slowed (cycleMs 250→450) and made more chaotic so it doesn't look like a fast periodic wave
  - [x] Right vitals column further narrowed `180px` → `140px` to remove leftover empty space
  - [x] Reactivity tests added: EtCO2 plateau scaling, SpO2 amplitude scaling, VT/VF shape sanity
- [x] **Reference-guided admin rhythm graph pass — COMPLETE:**
  - [x] User-supplied rhythm references reviewed for the currently exposed admin rhythm buttons
  - [x] NSR/PEA template sharpened with narrower QRS, subtle ST segment, and small baseline motion
  - [x] VT template rebuilt as a wide-complex monomorphic rhythm with a dominant broad peak and terminal trough
  - [x] VF template rebuilt as a coarser chaotic trace with irregular amplitude and frequent zero crossings
  - [x] Asystole remains a clean flatline
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
  - [x] VTach template reshaped and slowed into broad rounded monomorphic complexes with softer per-beat curves matching the latest screenshot reference
  - [x] Rhythm tests updated to guard VFib against returning to artifact/noise behavior
- [x] **VT negative-dominant + per-beat variation — COMPLETE:**
  - [x] `synthVT` rewritten as pre-spike bump → deep negative dominant gaussian spike → positive rebound → notch → tail, with baked-in low-amp noise + slow wander
  - [x] New `getEcgRhythm(rhythm)` factory: VT returns a freshly-seeded synth each cycle so beat-to-beat amplitude/width/centroid vary visibly; other rhythms still return their stable static entry
  - [x] `ECGCanvas` switched to the factory; `ampJitter` 0.08 → 0.14, `cycleJitter` 0.04 → 0.07
  - [x] Tests updated: negative-dominant (|trough| > peak·1.4), noise-present (maxAdjacentDelta 0.02–0.2), beat-to-beat variation across two factory calls
  - [x] Type-check + 99/100 tests green (preexisting DeviceShell power-button failure unrelated)

---

## In Progress
- Nothing — next plan is the admin/instructor dashboard

---

## Blocked / Needs Input
- [ ] **12-lead waveform assets** — User to provide gif/mp4 12-lead waveforms in `/public/waveforms/12lead/<rhythm>/<lead>.gif` for each rhythm × lead (I, II, III, aVR, aVL, aVF, V1–V6). ECG/SpO2/EtCO2 are now canvas-rendered and no longer need assets.
- [ ] **Supabase credentials** — Deferred. Will be needed once realtime / sessions phase begins. Copy URL + anon key into `.env.local`, run the migration, enable Realtime on `vitals_snapshots`.
- [ ] **Paramedic-supplied waveform videos** — Real ECG/SpO2/EtCO2/12-lead videos for production fidelity (later phase).
- [ ] **Alarm thresholds** — HR <40/>150 bpm, BP sys <90/>200 mmHg. Confirm with paramedic friend.
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
