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
