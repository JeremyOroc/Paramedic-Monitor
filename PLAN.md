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
│   │       ├── asystole/
│   │       └── pea/
│   └── sounds/
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
7. `RightNavCluster` — 6 nav buttons (alarm, home, back, enter●, forward, camera)
8. `BottomStatusBar` — "Mode Adult | 120 J Selected | ⚡ | 0"
9. `DefibButtonRow` — ANALYSE | ▲▼ | CHARGE | SHOCK (styled, not wired)
10. Responsive: fixed to `100vw × 100vh`, no scrolling, desktop-only (min-width: 1024px enforced)
11. Color reference: `#000000` bg, `#00ff41` ECG green, `#00ffff` cyan BP, `#cc44ff` purple EtCO2, `#ffff00` yellow SpO2

**Testing:**
- Component tests cover the physical shell chrome, defib control actions, 12-lead/back navigation soft keys, active 12-lead state, shock disabled/ready behavior, and the absence of the removed PACER button.

**Milestone:** Screenshot of app matches Zoll X Series reference photos. No interactivity yet.

---

### Phase 4 — ECG Canvas Renderer
**Goal:** Live scrolling ECG waveform on canvas, rhythm-switchable.

**Steps:**
1. Build `rhythms.ts` — define `Float32Array` point data for: NSR, VF, VT, Asystole (flatline), PEA (same as NSR visually)
2. Build `renderer.ts` — overwrite-scroll loop: `requestAnimationFrame`, erase band, draw segment, wrap at canvas edge
3. Wire `ECGCanvas.tsx` — accepts `rhythm` + `hr` props, starts/stops loop on mount/unmount
4. HR-driven cycle speed: `cycleMs = 60000 / hr` for NSR/PEA; fixed `cycleMs` for VF/VT
5. Beat-boundary rhythm switching: pending rhythm waits until `phaseInCycle >= 1.0` then swaps
6. Test all 5 rhythms locally by hardcoding rhythm changes

**Milestone:** Smooth scrolling ECG visible. All 5 rhythms render correctly. Rhythm switches are clean at beat boundary.

---

### Phase 5 — Video Waveforms (SpO2, EtCO2, 12-Lead Shell)
**Goal:** Video-looped waveforms for non-ECG channels.

**Steps:**
1. Add video files to `/public/waveforms/` (from paramedic's Google Drive)
2. Build `VideoWaveform.tsx` — `<video loop muted autoplay playsinline>` wrapper with fallback `FaultOverlay`
3. Wire `SecondaryChannel.tsx` — shows `SpO2Channel` by default; switches to `EtCO2Channel` when `etco2Active = true`
4. EtCO2 channel: video + Y-axis scale labels (0 / 20 / 63)
5. Build `TwelveLeadPage.tsx` — 2×6 grid overlay (replaces WaveformPanel entirely)
6. Each `LeadCell` — label + VideoWaveform pointing to `/public/waveforms/12lead/[rhythm]/[lead].mp4`; fault overlay if file missing
7. Left sidebar CO2 button → toggles `etco2Active`
8. Left sidebar 12-lead button → shows `TwelveLeadPage`, hides BottomStatusBar temporarily

**Milestone:** SpO2 video loops in secondary channel. CO2 button toggles channels. 12-lead overlay opens with fault lines (videos pending from Drive).

---

### Phase 6 — Instructor Panel UI + Zustand Draft State
**Goal:** Instructor panel fully interactive locally, before any realtime wiring.

**Steps:**
1. `InstructorLayout` — dark panel, responsive columns
2. `VitalsControls` + `VitalInput` — inputs for HR, BP sys/dia, EtCO2, SpO2
3. Zustand `instructorStore` — `draftVitals`, `pendingFlags` (per field), `confirmedVitals`
4. On input change → set `pendingFlags[field] = true` → field turns amber/orange (pending color)
5. `SendButton` — sets `pendingFlags` all false, sets `confirmedVitals = draftVitals`
6. `RhythmSelector` — 3-category accordion tree (Sinus / Cardiac Arrest / Arrhythmias)
7. `CPRToggle` — styled ON/OFF button
8. `DefibPanel` — Patient mode selector (Adult/Pediatric/Neonate), energy numeric input + presets (50J, 100J, 120J, 150J, 200J), ANALYSE/CHARGE/SHOCK buttons
9. `useDefibSequence` hook — state machine: `idle → analysing(5s) → charged → shocked → idle`; CHARGE only enabled after analysis; SHOCK only enabled after charge
10. `PatientInfoForm` — age, sex, first/last/middle name, patient ID fields

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
**Goal:** Alarm sounds trigger on threshold violations; instructor can acknowledge.

**Steps:**
1. Build `audio.ts` — `playAlarm()`, `pauseAlarm()` helpers wrapping `<audio>` element
2. `useAlarm` hook — monitors live vitals; triggers alarm when `hr < 40 || hr > 150 || bp_sys < 90 || bp_sys > 200`
3. `AlarmOverlay` — flashing red border + alarm audio loop on student monitor
4. Instructor alarm ack button → broadcasts `alarm_ack` → monitor silences alarm
5. Alarm state resets automatically when vitals return to normal range

**Milestone:** Instructor sets HR=220 → student monitor alarm triggers (visual + audio). Instructor acknowledges → silences.

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
| SpO2 / EtCO2 / 12-lead | `<video loop muted autoplay>` files |
| CPR mode visual | Blue banner "Perform CPR" + CPR timer |
| Post-shock outcome | Instructor controls manually — nothing auto-changes |
| Send behavior | Staged commit — edits pending until Send |
| Language | English |
| Session routing | `/session/[code]/instructor` vs `/session/[code]/monitor` |
| Instructor exclusivity | One instructor per session via Supabase Presence |
| Realtime mechanism | Supabase Broadcast (sub-100ms) + Postgres for late-joiner recovery |
| Audio | Pre-recorded files in `/public/sounds/` |
| Alarm thresholds | HR < 40 or > 150 bpm; BP sys < 90 or > 200 mmHg |
| Joule defaults | Adult 120J / Pediatric 50J / Neonate 10J |
