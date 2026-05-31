# Paramedic Monitor — Development Plan

> Desktop-first cardiac monitor simulator for paramedic training.
> Instructor controls vitals/rhythm in real time; students observe on a live monitor screen.
> Based on: Zoll X Series UI. Stack: Next.js (App Router), React, Tailwind CSS, Supabase Realtime.

---

## Dependencies to Install

```bash
# Core
npx create-next-app@latest paramedic-monitor --typescript --tailwind --app --src-dir --import-alias "@/*"

# Supabase
npm install @supabase/supabase-js

# Utilities
npm install clsx tailwind-merge
npm install zustand          # lightweight state (draft vitals, alarm flags)
npm install nanoid           # session code generation (6-char)
```

No animation libraries needed — canvas handles ECG, native `<video>` handles SpO2/EtCO2/12-lead.

---

## Folder Structure

```
paramedic-monitor/
├── public/
│   ├── waveforms/
│   │   ├── spo2.mp4                  # SpO2 pulse-ox looped video
│   │   ├── etco2.mp4                 # EtCO2 capnography looped video
│   │   └── 12lead/
│   │       ├── nsr/
│   │       │   ├── I.mp4
│   │       │   ├── II.mp4
│   │       │   ├── III.mp4
│   │       │   ├── aVR.mp4
│   │       │   ├── aVL.mp4
│   │       │   ├── aVF.mp4
│   │       │   ├── V1.mp4
│   │       │   ├── V2.mp4
│   │       │   ├── V3.mp4
│   │       │   ├── V4.mp4
│   │       │   ├── V5.mp4
│   │       │   └── V6.mp4
│   │       ├── vf/                   # same structure per rhythm
│   │       ├── vt/
│   │       └── asystole/
│   └── audio/
│       └── alarm.mp3                 # looping alarm audio (from paramedic's drive)
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                # root layout (dark bg, font)
│   │   ├── page.tsx                  # landing page — create/join session
│   │   ├── session/
│   │   │   └── [code]/
│   │   │       ├── monitor/
│   │   │       │   └── page.tsx      # student monitor view
│   │   │       └── instructor/
│   │   │           └── page.tsx      # instructor panel
│   │   └── api/
│   │       └── session/
│   │           ├── create/
│   │           │   └── route.ts      # POST → creates session row, returns code
│   │           └── join/
│   │               └── route.ts      # GET → validates code, returns session_id
│   │
│   ├── components/
│   │   ├── monitor/
│   │   │   ├── MonitorLayout.tsx     # root layout wrapper (black bg, grid)
│   │   │   ├── TopStatusBar.tsx      # date | time | patient mode | battery | timer
│   │   │   ├── SubBar.tsx            # CO2 calibration / alarm limits message
│   │   │   ├── LeftSidebar.tsx       # 7 sidebar buttons
│   │   │   ├── SidebarButton.tsx
│   │   │   ├── WaveformPanel.tsx     # ECG + secondary channel + CPR banner
│   │   │   ├── ECGCanvas.tsx         # canvas + rAF render loop
│   │   │   ├── SecondaryChannel.tsx  # SpO2 or EtCO2 video
│   │   │   ├── VideoWaveform.tsx     # <video loop muted autoplay> wrapper
│   │   │   ├── CPRBanner.tsx         # blue "Perform CPR" overlay + timer
│   │   │   ├── ApplyElectrodesBar.tsx # yellow "APPL. ELECT." warning bar
│   │   │   ├── VitalsStrip.tsx       # right column: HR / BP / EtCO2 / SpO2
│   │   │   ├── VitalBox.tsx          # single vital display (color-coded)
│   │   │   ├── RightNavCluster.tsx   # alarm, home, back, enter, forward, camera
│   │   │   ├── BottomStatusBar.tsx   # Mode | Joules | ⚡ | ShockCount
│   │   │   ├── DefibButtonRow.tsx    # ANALYSE | ▲▼ ENERGY | CHARGE | SHOCK
│   │   │   ├── TwelveLeadPage.tsx    # full overlay: 2×6 lead grid
│   │   │   ├── LeadCell.tsx          # single 12-lead cell: label + video/fault
│   │   │   ├── PatientModeModal.tsx  # Adult / Pediatric / Neonate dropdown
│   │   │   ├── PatientInfoModal.tsx  # age, sex, name, patient ID form
│   │   │   └── AlarmOverlay.tsx      # flashing red border + alarm.mp3 trigger
│   │   │
│   │   ├── instructor/
│   │   │   ├── InstructorLayout.tsx
│   │   │   ├── SessionHeader.tsx     # session code display + student count
│   │   │   ├── VitalsControls.tsx    # vital inputs + Send button
│   │   │   ├── VitalInput.tsx        # input with pending-color state
│   │   │   ├── SendButton.tsx        # broadcasts + inserts snapshot
│   │   │   ├── RhythmSelector.tsx    # 3-category expandable tree
│   │   │   ├── RhythmCategory.tsx
│   │   │   ├── RhythmOption.tsx
│   │   │   ├── CPRToggle.tsx         # ON/OFF toggle, broadcasts immediately
│   │   │   ├── DefibPanel.tsx        # patient mode + energy + ANALYSE/CHARGE/SHOCK
│   │   │   ├── PatientModeSelector.tsx
│   │   │   ├── EnergyControl.tsx     # numeric input + quick presets
│   │   │   ├── ScenarioPanel.tsx     # scenario builder + runner
│   │   │   ├── ScenarioBuilder.tsx   # form: name, states, timing mode
│   │   │   ├── ScenarioStateEditor.tsx
│   │   │   └── ScenarioRunner.tsx    # Next State button / auto-progress
│   │   │
│   │   └── shared/
│   │       ├── SessionTimer.tsx      # HH:MM:SS counting up
│   │       └── ProgressBar.tsx       # for ANALYSE / CHARGE timed sequences
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts             # createBrowserClient singleton
│   │   │   ├── server.ts             # createServerClient for API routes
│   │   │   └── types.ts              # generated DB types (from supabase gen)
│   │   ├── realtime/
│   │   │   ├── channel.ts            # subscribe/unsubscribe helpers
│   │   │   └── events.ts             # typed broadcast event definitions
│   │   ├── ecg/
│   │   │   ├── renderer.ts           # canvas rAF loop, draw functions
│   │   │   └── rhythms.ts            # Float32Array point data per rhythm
│   │   ├── audio.ts                  # alarm.play() / alarm.pause() helpers
│   │   └── session.ts                # code generation (nanoid), validation
│   │
│   ├── hooks/
│   │   ├── useMonitorState.ts        # subscribes to Supabase channel, returns live vitals
│   │   ├── useInstructorChannel.ts   # broadcast helpers for instructor
│   │   ├── useCPRTimer.ts            # interval timer for CPR duration display
│   │   ├── useDefibSequence.ts       # ANALYSE→CHARGE→SHOCK state machine
│   │   ├── useAlarm.ts               # alarm trigger logic (threshold checking)
│   │   └── useSessionTimer.ts        # session HH:MM:SS timer
│   │
│   ├── store/
│   │   └── instructorStore.ts        # Zustand: draft vitals, pending flags, rhythm
│   │
│   └── types/
│       ├── vitals.ts                 # VitalsSnapshot, Rhythm, PatientMode types
│       ├── session.ts                # Session, BroadcastEvent types
│       └── scenario.ts               # Scenario, ScenarioState types
│
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql    # sessions, vitals_snapshots, scenarios
│
├── PLAN.md                           # this file
├── AGENTS.md                         # role definitions for dev team + AI tools
├── STATUS.md                         # current build state (updated per commit)
├── CHANGELOG.md                      # append-only history of changes
└── SCREENSHOTS_SUMMARY.md            # UI reference extracted from paramedic's PDF
```

---

## Development Phases

---

### Phase 1 — Project Scaffolding & Supabase Setup
**Goal:** Repo runs locally, Supabase project exists, routes resolve.

**Steps:**
1. Run `create-next-app` with TypeScript + Tailwind + App Router
2. Install dependencies (`@supabase/supabase-js`, `zustand`, `nanoid`, `clsx`, `tailwind-merge`)
3. Create Supabase project (free tier), copy URL + anon key to `.env.local`
4. Run `supabase/migrations/001_initial_schema.sql` — creates `sessions`, `vitals_snapshots`, `scenarios`
5. Enable Realtime on `vitals_snapshots` table in Supabase dashboard
6. Scaffold all empty files (components, hooks, lib) — no logic yet
7. Create `/api/session/create` and `/api/session/join` route stubs
8. Verify: `npm run dev` works, no TypeScript errors

**Milestone:** `localhost:3000` loads, database exists, all files created.

---

### Phase 2 — Landing Page + Session Routing
**Goal:** Users can create or join a session and land on the correct page.

**Steps:**
1. Landing page (`/`) — two buttons: "Create Session" and "Join Session" (with code input)
2. "Create Session" → POST `/api/session/create` → generates 6-char code via `nanoid` → inserts into `sessions` table → redirects to `/session/[code]/instructor`
3. "Join Session" → GET `/api/session/join?code=ABC123` → validates code exists → redirects to `/session/[code]/monitor`
4. Instructor page: validates role via Supabase Presence — if instructor slot taken, redirect to monitor
5. Basic page shells: `MonitorLayout` (black bg, full screen) and `InstructorLayout` (dark panel)

**Milestone:** Create session → land on instructor page. Join with code → land on monitor page. Instructor slot is exclusive.

---

### Phase 3 — Student Monitor UI (Static Shell)
**Goal:** Pixel-accurate Zoll X Series layout with no live data yet — all hardcoded.

**Steps:**
1. `TopStatusBar` — date, time, "Adult" label, battery bar (green), session timer
2. `SubBar` — static "CO2 Calibration Recommended" message
3. `LeftSidebar` — 7 buttons (icons: 12-lead, CO2, back — rest decorative)
4. `WaveformPanel` — ECG area (black, ~55% height), secondary channel area (~45% height)
5. `ApplyElectrodesBar` — yellow bar "APPL. ELECT." + "Check Electrodes" text
6. `VitalsStrip` — right column: FC green / PNI cyan / EtCO2 purple / SpO2 yellow / Searching
   - Vitals must stay in the right-side column. Do not move HR, BP, EtCO2, or SpO2 into the bottom bar; bottom space is reserved for status/defib controls.
   - Right vitals column width is `96px`; prefer tighter padding or smaller text over moving or hiding vitals.
7. `RightNavCluster` — 6 nav buttons (alarm, home, back, enter●, forward, camera)
8. `BottomStatusBar` — "Mode Adult | 120 J Selected | ⚡ | 0"
9. `DefibButtonRow` — ANALYSE | ▲▼ | CHARGE | SHOCK (styled, not wired)
   - Physical shell also includes an inert PACER button, matching the reference hardware
   - Top-rim power button toggles green/red locally; it does not shut down the monitor UI
  - Grey physical soft keys own left-sidebar interactions: 12-lead, EtCO2 toggle, left-menu ANALYSE (opens caller info modal only), and Back
   - Inner dark sidebar labels are visual only and must not be clickable
   - Right physical Move up / Move down / Enter buttons cycle a blue selected state through monitor header, right vitals, visible waveform labels/scales, ECG labels, and the minus toggle row. Enter is inert except on the minus toggle.
   - Header/subbar reference controls include a combined date/time selectable region, patient-mode selectable region, beacon icon, selectable battery icon, a small minus rectangle beneath date/time, and a larger empty rectangle beside it.
   - The minus toggle hides or restores the bottom status/defib/CPR panel. When hidden, the main waveform area expands to show ECG, EtCO2, and SpO2 rows while the right vitals column stays unchanged.
   - Graph title metadata displays `SpO2 1x` and, when EtCO2 is visible, `EtCO2 0 to 60 mmHg`; this text does not change the internal EtCO2 renderer scale.
10. Responsive: fixed to `100vw × 100vh`, no scrolling, desktop-only (min-width: 1024px enforced)
11. Color reference: `#000000` bg, `#00ff41` ECG green, `#00ffff` cyan BP, `#cc44ff` purple EtCO2, `#ffff00` yellow SpO2
12. `MonitorPage` render composition is kept separate from interaction state. Local monitor UI state
    (view/channel mode, modal state, patient-info editing, medication events, mute/power flags,
    selected-control navigation, 12-lead capture, print preview, and Back precedence) lives behind
    the reducer-backed `useMonitorController` hook.

**Testing:**
- Component tests cover the physical shell chrome, power-button toggle state, defib control actions, 12-lead/EtCO2/back navigation soft keys, active 12-lead state, shock disabled/ready behavior, inert PACER behavior, and non-clickable inner sidebar labels.
- Selection tests cover right physical navigation handlers, initial date/time selection, reverse cycling to the minus toggle, Enter-driven bottom panel hiding, selected vital value highlighting, and visible SpO2/EtCO2 title metadata.
- Controller tests cover initial monitor state, selection toggling, patient-info draft/commit/cancel,
  12-lead capture timers, Back precedence, and power-off cleanup.

**Milestone:** Screenshot of app matches Zoll X Series reference photos. No interactivity yet.

---

### Phase 4 — ECG Canvas Renderer
**Goal:** Live scrolling ECG waveform on canvas, rhythm-switchable.

**Steps:**
1. Build `rhythms.ts` — define `Float32Array` point data for: NSR, VF, VT, Torsades, Asystole
   - VF now intentionally uses the same torsades-style polymorphic pattern family as Torsades: 15-beat/3900ms generated templates, cycle-to-cycle variants, active first-pass waveform content, low-amplitude waist activity, varied complex sharpness, and generated envelope families. VT is tuned against the Pads screenshot as a continuous plateau-and-trough rhythm: a smooth rounded upper plateau whose apex arrives early in the arc, then gently slopes downward into clean sharp V troughs. The VT rise/fall geometry should remain stable while plateau contour is tuned. VT should not look like isolated upward spikes, giant negative artifacts, centered plateau humps, jagged plateau noise, or square capnography blocks. VT tuning lives in `VT_TUNING` so timing, contour, and imperfections can be adjusted without rewriting the generator.
   - Asystole is tuned against `/Users/zaidtabana/Downloads/RPReplay_Final1778567841.mov`: it should be a thin pads baseline with very slight low-amplitude slopes/waves and tiny monitor noise, not a mathematically perfect zero line and not a QRS-like rhythm.
   - Torsades is rebuilt from `/Users/zaidtabana/Downloads/RPReplay_Final1778567085.mov` plus the 2026-05-30 Pads screenshots and 2026-05-31 morphology crops as organized fast polymorphic VT, not VFib-like noise. The updated 2026-05-31 hand-drawn/pink-strip reference should read as an exaggerated spindle of oval loops: a short run of small humps, then larger rounded ovals, then shrinking back down and repeating in packet form. The visual contract is: roughly 200-240 bpm continuous rounded complexes, a multi-second twist envelope with obvious small-to-large-to-small amplitude packets, rounded oval tops/bottoms, small residual humps in the low-amplitude sections, and deterministic variation in packet width, peak height, trough depth, phase, tilt, and small imperfections. It should not be a clean uniform sine wave, random static, monomorphic VT, a long flat stretch, or a jagged set of isolated spikes. Torsades tuning lives in `TORSADES_TUNING` with 15-beat/3900ms generated templates and multiple cycle-to-cycle envelope families instead of treating one 12-beat strip as a 300ms cycle.
2. Build `renderer.ts` — overwrite-scroll loop: `requestAnimationFrame`, erase band, draw segment, wrap at canvas edge
3. Wire `ECGCanvas.tsx` — accepts `rhythm` + `hr` props, starts/stops loop on mount/unmount
4. HR-driven cycle speed: `cycleMs = 60000 / hr` for NSR; fixed `cycleMs` for VF/VT/Torsades/Asystole
5. Beat-boundary rhythm switching: pending rhythm waits until `phaseInCycle >= 1.0` then swaps
   - Renderer signal keys reset the active waveform immediately when rhythm/channel shape changes, so waveform data and cycle timing switch atomically. This prevents long-template rhythms such as torsades from being briefly drawn at a new short-cycle rhythm speed during transitions.
6. Test all 5 rhythms locally by hardcoding rhythm changes

**Testing:**
- Rhythm generator tests verify all ECG templates stay normalized and distinguish the admin rhythm buttons: organized NSR, wide-complex VT, VF/Torsades using the torsades-style polymorphic pattern family, and near-flat asystole with tiny baseline slopes/waves.
- VT tests additionally guard the Pads-style criteria: cycle timing stays fast enough to show many beats across the screen, each cycle has a clean V-shaped trough, and the upper plateau is rounded, non-jagged, early-peaking, and gently downward-sloping.
- Torsades tests guard: visible multi-beat rate/beat count across the template, an exaggerated small-to-large-to-small spindle envelope, active low-amplitude humps, rounded oval morphology, bounded non-artifact contour, and materially different generated templates across consecutive cycles.
- Renderer tests guard signal-key rhythm changes so transitions such as torsades → NSR refresh waveform data immediately instead of compressing the old rhythm at the new cycle speed.

**Milestone:** Smooth scrolling ECG visible. All 5 rhythms render correctly. Rhythm switches are clean at beat boundary.

---

### Phase 5 — Canvas Secondary Waveforms + 12-Lead Shell
**Goal:** Live canvas SpO2/EtCO2 channels plus 12-lead shell.

**Steps:**
1. Add video files to `/public/waveforms/` (from paramedic's Google Drive)
2. Build shared canvas renderer for SpO2 and EtCO2 channels
3. Wire `SecondaryChannel.tsx` — shows `SpO2Channel` by default; switches to `EtCO2Channel` when `etco2Active = true`
4. EtCO2 channel: filled purple capnograph with Y-axis scale labels (150 / 75 / 0)
5. Build `TwelveLeadPage.tsx` — 2×6 grid overlay (replaces WaveformPanel entirely)
6. Each `LeadCell` — label + VideoWaveform pointing to `/public/waveforms/12lead/[rhythm]/[lead].mp4`; fault overlay if file missing
7. Left sidebar CO2 button → toggles `etco2Active`
8. Left sidebar 12-lead button → shows `TwelveLeadPage`, hides BottomStatusBar temporarily

**Milestone:** SpO2 video loops in secondary channel. CO2 button toggles channels. 12-lead overlay opens with fault lines (videos pending from Drive).

**12-Lead Capture (added 2026-05-28, updated 2026-05-30):** The 12-lead Capture soft key (slot 1) acquires a
snapshot of the current state. Confirmed behavior:
- Press Capture → freeze current rhythm/HR → centered "Acquiring 12-Lead" card with a green
  progress bar that fills over **~4s** (`ACQUIRE_MS`).
- On completion a **static ECG-paper image takes over the entire monitor display**. It uses the
  supplied 12-lead capture reference asset at `/public/images/twelve-lead-capture.svg` instead of
  drawing a generated canvas printout.
- **During capture only Back works** — all other physical controls are inert (`captureLock` on
  `DeviceShell`). Back dismisses (result) or cancels (acquiring), returning to the live 12-lead.
- **Transient** — nothing is persisted; every press is a fresh capture.
- Components: `AcquiringDialog`, `TwelveLeadPrintout`.

**Testing:** `twelveLeadCaptureFlow` (acquire → printout → dismiss, and mid-acquire cancel),
`TwelveLeadPrintout` (static capture image), `AcquiringDialog` (title + progress bar).

---

### Phase 6 — Instructor Panel UI + Zustand Draft State
**Goal:** Instructor panel fully interactive locally, before any realtime wiring.

**Steps:**
1. `InstructorLayout` — dark panel, responsive columns
2. `VitalsControls` + `VitalInput` — inputs for HR, BP sys/dia, EtCO2, SpO2
   - Include a top-of-vitals `Normal` button that resets draft vital numbers to normal defaults while preserving rhythm/waveform selections and the Save → Send workflow
   - Include `CallerInfoForm` in its own admin tab for dispatch/caller info shown on the monitor after ANALYZE: Intervention prioritaire code, Adresse, Probleme, Information, Mise a jour, Heure, plus an `Add extra` button that reveals up to three optional title/input extra rows
3. Zustand `instructorStore` — `draftVitals`, `pendingFlags` (per field), `confirmedVitals`
4. On input change → set `pendingFlags[field] = true` → field turns amber/orange (pending color)
5. `SendButton` — sets `pendingFlags` all false, sets `confirmedVitals = draftVitals`
6. `RhythmSelector` — 3-category accordion tree (Sinus / Cardiac Arrest / Arrhythmias)
7. `CPRToggle` — styled ON/OFF button
8. `DefibPanel` — Patient mode selector (Adult/Pediatric/Neonate), energy numeric input + presets (50J, 100J, 120J, 150J, 200J), ANALYSE/CHARGE/SHOCK buttons
9. `useDefibSequence` hook — state machine: `idle → analysing(5s) → charged → shocked → idle`; CHARGE only enabled after analysis; SHOCK only enabled after charge
10. `PatientInfoForm` — age, sex, first/last/middle name, patient ID fields

**Testing:**
- Component tests cover the top-of-vitals `Normal` button and confirm it resets draft vital numbers without bypassing Send.
- Store tests cover the `resetVitalsToNormal` action and verify it preserves non-vital fields.
- Component/page tests cover caller-info draft/save/send flow and ANALYZE-triggered monitor display.
- Caller-info form tests cover adding optional extra rows one at a time and capping the form at three extras.
- Admin page tests cover tab switching between monitor controls and caller-info form.

**Milestone:** Instructor panel fully interactive. Editing vitals turns fields amber. Send confirms them. Defib sequence enforces correct order with progress bars.

---

### Phase 7 — Supabase Realtime Wiring
**Goal:** Instructor changes propagate to student monitor in real time.

**Steps:**
1. Build `channel.ts` — `subscribeToSession(code)` / `unsubscribeFromSession()` helpers
2. Build `events.ts` — typed `BroadcastEvent` union (`vitals_update | defib_event | cpr_toggle | alarm_ack | scenario_activate`)
3. `useInstructorChannel` — instructor Send → insert `vitals_snapshots` row → broadcast `vitals_update`
4. CPR toggle → broadcast `cpr_toggle` immediately (no Send needed)
5. Defib SHOCK → broadcast `defib_event`
6. `useMonitorState` — student monitor subscribes to channel; on `vitals_update` → update local state; on mount → fetch latest snapshot from DB (late-joiner recovery)
7. Wire `ECGCanvas` to live `rhythm` from monitor state
8. Wire `VitalsStrip` to live HR, BP, EtCO2, SpO2 from monitor state
9. Wire `CPRBanner` + CPR timer to `cpr_active` flag
10. Wire `SecondaryChannel` to `etco2_mode` flag
11. Wire `TwelveLeadPage` video sources to live `rhythm`
12. Supabase Presence — instructor join sets role, student count displayed in instructor header

**Milestone:** Two browser windows open. Instructor changes vitals → clicks Send → student monitor updates within ~100ms. CPR toggle, rhythm changes, all propagate live.

---

### Phase 8 — Alarms + Audio
**Goal:** Alarm sounds trigger on threshold violations and clear automatically when vitals normalize.

**Confirmed thresholds:**
- HR alarms below 40 bpm or above 140 bpm
- BP alarms when systolic is below 90 mmHg or above 200 mmHg
- BP alarms when diastolic is below 25 mmHg or above 225 mmHg
- SpO2 alarms below 90%
- EtCO2 has no alarm threshold for now

**Monitor alarm behavior:**
- Any alarming vital box turns white, with a red header, white header text, and red number text
- The alarming vital value fades between full opacity and 0 opacity over a 1.9s loop; non-alarming vitals do not flash
- BP uses one PNI box; either systolic or diastolic outside range alarms the whole box
- Alarm audio loops while one or more vitals are alarming
- Only one alarm sound may play at a time, even when multiple vitals are alarming
- Alarm audio stops automatically when every vital returns to the normal range

**Steps:**
1. Build `audio.ts` — `playAlarm()`, `pauseAlarm()` helpers wrapping `<audio>` element
2. `useAlarm` hook — monitors live vitals; triggers alarm for HR, BP, or SpO2 threshold violations
3. Vital boxes render per-vital alarm styling on student monitor
4. Alarm state resets automatically when vitals return to normal range

**Milestone:** Instructor sets HR=220 → student monitor alarm triggers (visual + audio). Returning all alarming vitals to normal silences it.

---

### Phase 9 — Popups & Modals (Monitor Side)
**Goal:** "Adulte" and PNI sections open their popups on the monitor.

**Steps:**
1. `PatientModeModal` — clicking "Adult" label in TopStatusBar opens a 3-option dropdown: Adult / Pediatric / Neonate. Selection broadcasts mode change, updates joule defaults.
2. `PatientInfoModal` — instructor-side form; populated data shown read-only on monitor
3. BP animation — when BP value is received on monitor for the first time in a session (or manually triggered), play the BP animation video from Drive, then show numbers. Wire to `/public/waveforms/bp-animation.mp4`
4. `SessionTimer` — counts up from session creation timestamp (stored in `sessions.created_at`)

**Milestone:** Clicking Adult label shows mode picker. BP animation plays before numbers appear.

---

### Phase 10 — Scenario Builder
**Goal:** Instructor can build, save, and run named scenarios.

**Steps:**
1. `ScenarioBuilder` — form: scenario name, add/remove/reorder states
2. Each state: name, HR, BP sys/dia, EtCO2, SpO2, rhythm, patient mode, duration_s (if timed)
3. Timing mode toggle: Manual (Next State button) | Timed (auto-advance after `duration_s`)
4. Save → inserts into `scenarios` table in DB
5. `ScenarioRunner` — load scenario, show current state name, Manual: "Next State" button, Timed: countdown progress bar
6. Activating a state → broadcasts `scenario_activate` with that state's vitals → same as clicking Send
7. Scenario list — load existing scenarios for this session

**Milestone:** Instructor builds a 3-state scenario (NSR → VF → Asystole), runs it manually, students see rhythm changes in sequence.

---

### Phase 11 — STATUS.md / CHANGELOG.md Workflow + Polish
**Goal:** Team coordination files up to date; app polished.

**Steps:**
1. Update `STATUS.md` and `CHANGELOG.md` to reflect completed phases
2. Visual polish: font matching (Zoll uses a monospace/LED-style font for vitals — use `font-mono` or custom), pixel-perfect spacing
3. "Check Electrodes" warning behavior — shows when no rhythm is active (no session data received yet)
4. Keyboard shortcuts for instructor (optional QoL)
5. Print/snapshot button on monitor (browser `window.print()`)
6. Error states: invalid session code → friendly error page
7. Session expiry: sessions older than 24h return 404

**Milestone:** App is production-ready for training use. Team files are current.

---

## Quick Reference — Key Decisions

| Decision | Choice |
|----------|--------|
| Main ECG rendering | Canvas + requestAnimationFrame |
| SpO2 / EtCO2 | Canvas + requestAnimationFrame |
| 12-lead | `<video loop muted autoplay>` files |
| CPR mode visual | Blue banner "Perform CPR" + CPR timer |
| Post-shock outcome | Instructor controls manually — nothing auto-changes |
| Send behavior | Staged commit — edits pending until Send |
| Language | English |
| Session routing | `/session/[code]/instructor` vs `/session/[code]/monitor` |
| Instructor exclusivity | One instructor per session via Supabase Presence |
| Realtime mechanism | Supabase Broadcast (sub-100ms) + Postgres for late-joiner recovery |
| Audio | Pre-recorded files in `/public/audio/` |
| Alarm thresholds | HR < 40 or > 140 bpm; BP sys < 90 or > 200 mmHg; BP dia < 25 or > 225 mmHg; SpO2 < 90%; no EtCO2 threshold |
| Joule defaults | Adult 120J / Pediatric 50J / Neonate 10J |
