# Paramedic Monitor — Development Plan

> Desktop-first cardiac monitor simulator for paramedic training.
> Instructor controls vitals/rhythm in real time; students observe on a live monitor screen.
> Based on: Zoll X Series UI. Stack: Next.js (App Router), React, Tailwind CSS, Supabase Realtime.

---

## Current Requirement Updates

- Default entry point is now a Kahoot-style session lobby: instructors create rooms, students join with code + nickname, and `/?dev=1` remains the local monitor shortcut.
- Session room codes must be selectable and copyable from instructor and student waiting-room views.
- Room creators must be able to end their room from the instructor view; ending redirects the instructor home and stops student participation.
- Session instructor access uses a private host token link; student monitor actions are recorded as per-participant events instead of shared state.
- Students enter a waiting room until the instructor starts the room; instructor Send pushes the confirmed monitor state to the shared session state.
- Dispatch route map delayed Leaflet size invalidation must be cancelled and guarded so it never runs against an unmounted map/container.
- T1/T2/T3/U1/U2/U3 timed vitals must also update Patient Physical Pulse and Respiratory icon findings from the clicked timed section, without auto-confirming the icons.
- The call assignment screen should show New Assignment and assignment detail labels without decorative icons.
- Automatic call assignment display should play `/audio/caller_info_alarm.mp4` and gently flash 4 times for each new dispatch run; manual sidebar reopening must stay silent.
- T1/T2/T3/U1/U2/U3 timed vitals must update draft numbers without turning Off vitals back On; SpO2/EtCO2 graph connections stay tied to their existing On/Off toggle state.
- Direct vital fields, universal scenario auto-sort, and timed vital updates must change draft numbers without changing the current manual On/Off state; Save and Send retain inactive values for later manual activation.
- Pressing physical Home while Vital Log is already open must close it; Home remains blocked by every other modal or capture/print overlay.
- Event Log must merge Call, medication, and Analyze entries into an oldest-first chronological stream using hidden capture ordering, with stable `HH:MM:SS` fallback for legacy rows.

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
│   │   │   ├── PatientInformationPanel.tsx # SAMPLE/OPQRST local checklist tab
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
   - BP/PNI has an accepted-reading layer: admin Save → Send stages BP changes, but displayed BP values, BP alarms, and BP Off update only after the outer-shell BP reading sequence completes without cancellation.
   - After the BP reading completes, PNI settles to the stacked systolic/diastolic layout with the divider line; only the count-up phase uses a single systolic-style number.
   - During active BP reading phases (Please Wait, Reading in Progress, and count-up), suppress only the BP alarm channel so PNI does not flash red/white and BP does not drive alarm audio; HR and SpO2 alarms remain active.
7. `RightNavCluster` — 6 nav buttons (alarm, home, back, enter●, forward, camera)
8. `BottomStatusBar` — "Mode Adult | 120 J Selected | ⚡ | 0"
9. `DefibButtonRow` — ANALYSE | ▲▼ | CHARGE | SHOCK (styled, not wired)
   - Physical shell also includes an inert PACER button, matching the reference hardware
   - Top-rim power button toggles green/red locally, shows a boot screen on power-up, and shows a black powered-off screen. Jumpscare audio/video pathways are removed/commented out; the monitor remains silent except for legitimate simulator cues.
  - Grey physical soft keys own left-sidebar interactions: 12-lead, EtCO2 toggle, left-menu ANALYSE (opens caller info modal only), and Back
   - Inner dark sidebar labels are visual only and must not be clickable
   - Right physical Move up / Move down / Enter buttons cycle a blue selected state through monitor header, right vitals, visible waveform labels/scales, ECG labels, and the minus toggle row. Enter is inert except on the minus toggle.
   - Medication mode keeps the normal right-side Move up / Move down / Enter monitor navigation active. When the medication Info soft key opens the event log, those three controls temporarily navigate the log instead. Exit is selected on open; multi-page logs cycle Down through Exit → Prev → Next → Exit and Up in reverse, while single-page logs keep Exit as the only selection. Enter closes only the log from Exit or activates the highlighted page direction from Prev/Next. The log shows 8 events per page, hides pagination for 0–8 events, consumes navigation without changing the background, and keeps unavailable first/last-page directions selectable but disabled when multiple pages exist. Closing the log restores normal monitor navigation while medication mode remains open.
   - The physical Home button opens a mutually exclusive `Vital Log` modal matching the Event Log geometry. Beginning at `00:05:00`, it records immutable trainee-visible snapshots every five elapsed monitor minutes in Timestamp → FC → PNI SYS → PNI DIA → ETCO2 → SPO2 order. FC includes the CPR override; PNI uses independently active accepted cuff values; EtCO2 requires an active, calibrated channel; SpO2 requires an active channel; unavailable values render as `-`. The log shows 8 rows per page and reuses the Event Log Exit/Prev/Next cyclic navigation and boundary behavior. Back closes it, Home cannot open it over another modal, and no other modal can open while it owns the screen. Its history clears with the monitor session timer on power-off or refresh, but not on an instructor vital reset while that timer continues.
   - Header/subbar reference controls include a combined date/time selectable region, patient-mode selectable region, beacon icon, selectable battery icon, a small minus rectangle beneath date/time, and a larger empty rectangle beside it.
   - The minus toggle hides or restores the bottom status/defib/CPR panel. When hidden, the main waveform area expands to show ECG, EtCO2, and SpO2 rows while the right vitals column stays unchanged.
   - Graph title metadata displays `SpO2 1x` and, when EtCO2 is visible, `EtCO2 0 to 60 mmHg`; this text does not change the internal EtCO2 renderer scale.
   - The first EtCO2 toggle after monitor reset starts a 10-second calibration gate with a purple progress trace that moves left-to-right while shrinking from large to small. EtCO2 number and graph stay hidden until calibration completes; toggling away before completion restarts calibration, while completed calibrations are skipped until the next monitor reset. The admin Vitals panel shows a compact pink EtCO2 indicator when calibration is complete.
10. Responsive: fixed to `100vw × 100vh`, no scrolling, desktop-only (min-width: 1024px enforced)
11. Color reference: `#000000` bg, `#00ff41` ECG green, `#00ffff` cyan BP, `#cc44ff` purple EtCO2, `#ffff00` yellow SpO2
12. `MonitorPage` render composition is kept separate from interaction state. Local monitor UI state
    (view/channel mode, modal state, patient-info editing, medication events, mute/power flags,
    selected-control navigation, 12-lead capture, print preview, and Back precedence) lives behind
    the reducer-backed `useMonitorController` hook.

**Testing:**
- Component tests cover the physical shell chrome, power-button toggle state, defib control actions, 12-lead/EtCO2/back navigation soft keys, active 12-lead state, shock disabled/ready behavior, inert PACER behavior, and non-clickable inner sidebar labels.
- Jumpscare removal tests cover former off-state rolls, boot-screen clips, alarm-ack Easter eggs, and battery-triggered overlays staying inactive while legitimate simulator cues remain available.
- BP/EtCO2 tests cover staged BP commit/cancel/off behavior, BP alarm gating, EtCO2 calibration gating/restart/reset behavior, admin calibration indication, and real-time event-log stamps for medications/analyze rows.
- Settled PNI tests cover single-number counting, stacked sys/dia settled output, and partial-active BP display after completion.
- BP alarm-suppression tests cover active NIBP suppression, cancel restore, completion restore, and HR/SpO2 alarms staying active during BP reading.
- Selection tests cover right physical navigation handlers, initial date/time selection, reverse cycling to the minus toggle, Enter-driven bottom panel hiding, selected vital value highlighting, and visible SpO2/EtCO2 title metadata.
- Medication/event-log navigation tests cover normal monitor navigation while medication mode is open, Exit-first cyclic navigation, single-page Exit-only isolation, multi-page Prev/Next selection and boundary clamping, merged dispatch/medication/analyze event counts, and navigation restoration after closing the log.
- Home/Vital Log tests cover five-minute sampling and skipped-boundary catch-up, visible-value and inactive-channel rules, independent PNI columns, timer-reset cleanup, eight-row pagination, cyclic navigation, Back/Exit closure, physical Home wiring, and mutual exclusion with every existing modal flow.
- Home/event/vital-input regression tests cover Home toggle closure, interleaved and same-second event chronology, midnight rollover, legacy ordering, chronological pagination, and manual On/Off preservation across direct, auto-sort, timed, Save, and Send flows.
- Controller tests cover initial monitor state, selection toggling, patient-info draft/commit/cancel,
  cyclic Patient Info navigation and Exit activation, 12-lead capture timers, Back precedence,
  and power-off cleanup.

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
- On completion a **static ECG-paper image takes over the entire monitor display**. It uses a
  rhythm-specific ECG-paper asset when one is available, including regular sinus at
  `/images/regular-sinus-strip.png`; rhythms without a supplied strip fall back to
  `/public/images/twelve-lead-capture.svg` instead of drawing a generated canvas printout.
- **During capture only Back works** — all other physical controls are inert (`captureLock` on
  `DeviceShell`). Back dismisses (result) or cancels (acquiring), returning to the live 12-lead.
- **Transient** — nothing is persisted; every press is a fresh capture.
- Components: `AcquiringDialog`, `TwelveLeadPrintout`.

**Testing:** `twelveLeadCaptureFlow` (acquire → printout → dismiss, and mid-acquire cancel),
`TwelveLeadPrintout` (static capture image), `AcquiringDialog` (title + progress bar).

**Patient Info navigation (updated 2026-08-17):** Patient Info opens with Age selected. While
browsing, Move Down cycles Age → Sex → Exit → Age and Move Up cycles in reverse. Enter
on Exit closes only the panel and returns to the live 12-lead view. While editing Age or Sex,
the arrows continue to change the draft, Enter commits, and physical Back cancels before its
existing close-panel and exit-12-lead precedence.

---

### Phase 6 — Instructor Panel UI + Zustand Draft State
**Goal:** Instructor panel fully interactive locally, before any realtime wiring.

**Steps:**
1. `InstructorLayout` — dark panel, responsive columns
2. `VitalsControls` + `VitalInput` — inputs ordered FC, SpO2, BP sys/dia, EtCO2
   - The former top-of-vitals `Normal` button is removed from the instructor UI; the underlying store action remains available for compatibility
   - The `Monitor & Patient SNS` tab places Pulse, Respiratory, and Skin/Extremities in one horizontal row at the bottom of the Vitals box, followed by the existing SAMPLE and OPQRST boxes below Vitals
   - Include `CallerInfoForm` in its own admin tab for dispatch/caller info shown on the monitor after ANALYZE: Dispatch countdown, Call #, Priority, MPDS Code, Adresse, Probleme, Information, Mise a jour, Heure, plus an `Add extra` button that reveals up to three optional title/input extra rows
3. Zustand `instructorStore` — `draftVitals`, `pendingFlags` (per field), `confirmedVitals`
4. On input change → set `pendingFlags[field] = true` → field turns amber/orange (pending color)
5. `SendButton` — sets `pendingFlags` all false, sets `confirmedVitals = draftVitals`
6. `RhythmSelector` — 3-category accordion tree (Sinus / Cardiac Arrest / Arrhythmias)
7. `CPRToggle` — styled ON/OFF button
8. `DefibPanel` — Patient mode selector (Adult/Pediatric/Neonate), energy numeric input + presets (50J, 100J, 120J, 150J, 200J), ANALYSE/CHARGE/SHOCK buttons
9. `useDefibSequence` hook — state machine: `idle → analysing(5s) → charged → shocked → idle`; CHARGE only enabled after analysis; SHOCK only enabled after charge
10. `PatientInfoForm` — age, sex, first/last/middle name, patient ID fields

**Testing:**
- Component tests verify the visible `Normal` control is absent while the compatibility store action remains covered independently.
- Store tests cover the `resetVitalsToNormal` action and verify it preserves non-vital fields.
- Component/page tests cover caller-info draft/save/send flow and ANALYZE-triggered monitor display.
- Caller-info form tests cover adding optional extra rows one at a time and capping the form at three extras.
- Admin page tests cover the three-tab layout, combined monitor/SNS/patient-information content, moved icon behavior, and removed shared Reset control.

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

**Requirement change (2026-08-17) — Two-stage NIBP focus and consistent monitor modal styling:**
- Every NIBP data row now uses a two-stage hardware cursor. Opening starts on
  the Systolic label; Enter moves from a selected label to its combined
  right-side value region, and Enter or Back returns to the same label. Back
  closes NIBP only while label-focused. Mouse hover and clicks remain inert.
- Label-focused Up/Down cycles through all six data rows and Exit. Value-focused
  alarm limits and SmartCuf ignore arrows, Mode toggles with either arrow, and
  Interval uses Up for the next larger value and Down for the previous value
  across 1, 2, 5, 15, 30, and 60 minutes with wrap-around. Live setting changes
  retain the existing automatic-cuff scheduling behavior.
- Patient Info, NIBP, and Event Log share the Patient Info visual language:
  white title bars, the common green modal surface, centered black value cells,
  blue active label/value regions, bold monospace typography, and boxed modal
  actions. NIBP keeps its geometry and responsive row text; Event Log keeps its
  content density and pagination behavior. Vital Log remains unchanged.
- The shared Exit/Prev/Next action style uses a black surface, white rectangular
  border and text, and a blue selected state. Disabled Event Log pagination
  actions remain selectable no-ops with reduced opacity.

**Testing:**
- Controller and monitor-flow coverage verifies every NIBP label/value
  transition, cyclic label navigation, read-only arrow no-ops, directional
  setting changes and wrapping, Enter/Back precedence, Exit, reopen/reset
  defaults, and live automatic scheduling after interval changes.
- Component regressions verify left-versus-right selection, combined alarm
  focus, centered limits, shared title/surface/action styling, pointer-inert
  NIBP markup, and unchanged Patient Info/Event Log behavior.
- Complete Vitest, ESLint, production-build, and rendered 1024×768 and
  1366×768 browser checks cover all three restyled modals.

**Requirement change (2026-08-17) — NIBP settings modal and automatic cuff mode:**
- Selecting the PNI vital with the outer-shell navigation cluster and pressing
  Enter opens a Zoll-style NIBP modal over the waveform column. The modal owns
  Up/Down/Enter navigation until Exit or the physical Back key closes it.
- The cyclic row order is NIBP Systolic Alarm → NIBP Diastolic Alarm → NIBP
  MAP Alarm → NIBP Mode → NIBP Auto Mode Interval → SmartCuf On/Off → Exit.
  Alarm values and SmartCuf are read-only; Mode cycles Manual/Automatic and the
  interval cycles 1, 2, 5, 15, 30, and 60 minutes.
- Displayed limits are SYS 90–200, DIA 25–225, and MAP 46–216. SYS/DIA reuse
  the active alarm constants; MAP is reference-only and does not add MAP alarm
  evaluation. SmartCuf remains On. Start TurboCuf and the reference ruler are
  intentionally omitted.
- Automatic mode waits one full selected interval before starting the existing
  Patient event cuff sequence, then repeats start-to-start. A manual Patient
  event press keeps the existing start/cancel behavior and restarts the
  automatic deadline. Busy automatic ticks skip rather than cancel an active
  reading. Power-off/reset restores Manual, 2 min, and SmartCuf On.

**Testing:**
- Component coverage verifies reference rows, values, styling, geometry,
  pointer-inert content, Exit, and omitted TurboCuf/ruler content.
- Controller coverage verifies PNI opening, cyclic row navigation, read-only
  no-ops, setting cycles, modal exclusion, Back/Exit, and power/reset defaults.
- Scheduler coverage uses fake timers for delayed/recurring triggers, manual
  deadline resets, interval changes, busy skips, dormant BP, and cleanup.
- Full monitor-flow coverage operates the physical shell controls and verifies
  an automatic reading enters and completes the existing cuff sequence.

**Requirement change (2026-08-18) — Assignment dashboard label colors:**
- On the assignment caller-info dashboard only, Response Timer and its value,
  Call Assignment, the dynamic priority value, and Lights & Sirens use the same
  white text treatment as New Assignment.
- Every assignment-detail label uses the existing dispatch blue, including the
  standard caller fields and all optional or custom extra-field labels. Detail
  values, layout, timer behavior, and the classic caller-info variant remain
  unchanged.
- The seven standard assignment-detail labels (Call #, MPDS Code, Address,
  Nature of Call, Caller Info, Updates, and Call Received) and their values use
  the same `text-lg` size as Call Assignment. Optional/custom extra labels and
  values keep their existing compact sizes.
- Detail labels use a compact line-height with slightly tighter title-to-list
  spacing. All assignment-detail lists use `gap-3` between header/value groups,
  including assignments with optional extra rows. Existing row separators and
  padding remain.
- The seven standard labels receive a subtle text stroke in addition to their
  existing black font weight for stronger visual emphasis.

**Testing:**
- Component coverage verifies the white timer/assignment/priority treatment,
  blue standard and custom detail labels, larger standard-row label/value
  sizing, stronger standard-label emphasis, uniform `gap-3` row spacing, unchanged
  extra-row sizing, and an unchanged classic variant.
- Rendered desktop coverage compares the assignment dashboard with the supplied
  reference and checks console/framework health without adding mobile scope.

**Requirement change (2026-05-31) — Dispatch lock + countdown startup gate:**
Supersedes the earlier "power button is local only / never gates the monitor UI"
note (Phase 3). Normal users now boot the monitor **locked-off**; the power
button is inert until a drill gate is satisfied.
- The admin caller-info **Send** doubles as the dispatch signal. New minutes +
  seconds "Dispatch countdown" fields on the admin caller-info form set the ETA.
  The **first** Send arms the lock + countdown and pushes caller info; later Sends
  that keep the same countdown only update content. A later Send carrying a
  **changed** (saved) countdown re-dispatches: it restarts the gate countdown and
  the map ETA from that send and clears the trainee's Acknowledge/Arrival so the
  run must be re-acknowledged (requirement change 2026-06-18). Admin **Reset** =
  full reset to locked-off.
- Locked screen shows caller info + a counting-down MM:SS timer. Unlock order:
  Acknowledge (immediate) → countdown 0 → Arrival → **Go to Monitor** → power
  unlocks. Arrival only enables the explicit Go to Monitor action; it never
  auto-enters the Zoll, including after admin Reset and a second dispatch run.
  Transport is enabled only after power-on. Acknowledge/Arrival/Transport stamp
  **EST** wall-clock time and are merged into the event log with meds/shocks.
- On the assignment-style caller-info iPad, **Response Timer** counts up from the
  first dispatch Send while **ETA** counts down to the configured dispatch
  countdown. They are separate values and must not mirror each other.
- The locked caller-info screen no longer renders inside the Zoll monitor shell.
  Before Arrival, caller info takes over the full browser page as a separate
  iPad-style dispatch surface, so the Zoll is not visible. After Arrival, the
  Zoll monitor appears powered off and trainees power it on themselves.
- Opening CALL INFO after the monitor is available shows the same full-page
  caller-info/iPad surface with its own tablet Back button to return to the Zoll.
  Current A/B test default is the icon-led `assignment` dashboard variant inspired
  by dispatch assignment screens; the previous tablet layout remains available
  with `?callerInfoVariant=classic`. The full-page tablet keeps an iPad-oriented
  4:3 ratio, uses the reference-style blue/green/orange/red/purple/yellow icon
  palette.
- Admin Caller Info includes a Response route section. Start defaults to
  `John Abbott College, 21275 Lakeshore Road, Sainte-Anne-de-Bellevue, QC H9X 3L9`
  and remains editable. Destination is the existing caller `Adresse` field.
  Geoapify autocomplete/geocoding powers address suggestions when
  `NEXT_PUBLIC_GEOAPIFY_API_KEY` is present; the input remains manually editable
  without a key.
- The assignment-style caller-info iPad replaces the old map placeholder with a
  Leaflet/OpenStreetMap panel. OSRM provides driving geometry and distance.
  The route movement duration comes from the admin dispatch countdown timer, not
  OSRM ETA. On Send, the confirmed route receives a `startedAt` timestamp and
  the countdown duration so the unit marker moves in real time and resumes
  correctly after refresh or when CALL INFO is reopened later. If the admin
  countdown is `0`, the unit marker is shown at the destination immediately.
  Trainees can interact with the map directly: pan, wheel/pinch/double-click
  zoom, keyboard zoom, and use the map zoom controls. The map fits the route
  when the route changes, but the moving unit marker does not continually reset
  the viewport while the user is inspecting the map. A "Track unit" toggle button
  on the map switches between two camera modes: the default route **overview**,
  and **follow** mode, which keeps the moving unit centered and zoomed in close.
  Toggling back to overview refits the whole route.
  Later Sends that keep the same countdown update the confirmed route content
  while the route ETA keeps ticking from its original start. A Send with a
  changed (saved) countdown re-dispatches instead: the route `startedAt` and the
  gate countdown both restart from that send on the new duration, and the
  trainee's Acknowledge/Arrival are cleared. Countdown
  edits follow the same strict Save -> Send workflow as other admin fields:
  changing the value unlocks Save, Save unlocks Send, and Send locks until a new
  value is saved.
- Testing: route math helpers cover distance/duration formatting, progress, and
  point interpolation; store tests cover default John Abbott origin plus route
  Save -> Send timestamping; Caller Info form/modal tests cover route controls
  and map rendering; full Vitest run passes under the bundled Node runtime.
- The Acknowledge/Arrival/Transport action row must remain visible on the caller
  info tablet even when buttons are disabled. Completed caller action buttons
  gray out after they are clicked/logged.
  While powered off/locked, all hardware controls are inert and silent; only
  touchscreen call milestone buttons can be used.
- Monitor vital numbers start/reset blank on the trainee screen after reset and
  caller-info-only dispatch; inactive SpO2 renders `SpO2 OFF`. Startup/reset
  blanks do not trigger alarms because each numeric vital has its own Off/On
  state. Admin vital rows expose a right-side toggle; clicking anywhere in that
  toggle rectangle flips the specific vital Off/On. Stored `0` values are hidden
  and silent while Off, but are real alarmable values once that vital is On and
  sent through the existing Save → Send flow. Admin number fields use narrow,
  right-aligned console slots with the unit label embedded inside the field. On
  the monitor, SpO2 uses a slightly smaller value font, with a smaller `SpO2 OFF`
  disconnected display for fit.
- Admin vital number inputs clear a visible `0` on focus for FC, SpO2, BP sys,
  BP dia, and EtCO2. This is visual only until typing; blur restores untouched
  zeroes, and non-zero values stay visible on focus.
- The admin Caller Info tab owns the single universal auto-sort scenario box.
  Pasting there runs all supported parsers at once: caller info, origin vitals,
  SAMPLE/OPQRST patient information, and Patient Physical findings. The Vitals,
  Patient Information, and Patient Physical tabs do not show their own
  auto-sort textareas; their manual controls remain editable.
- Vitals auto-sort parsing is driven by the Caller Info scenario box for labelled FC/HR,
  SpO2/saturation, BP/TA, and EtCO2/CO2 text. It updates only matched draft
  vitals. If a large scenario paste contains a `Vitals (Origin)`,
  `Vitals Origin`, or `Origin Vitals` section, only that origin section is
  parsed and later serial vitals are ignored. Without an origin heading, the
  first valid value for each vital wins so later treated/untreated vitals do
  not overwrite origin values. It supports combined BP values like
  `BP: 186/102` or `BP: 95/60` plus separate systolic/diastolic labels, accepts
  units/notes such as `HR: 124 bpm`, `SpO₂: 92% on room air`, and
  `EtCO₂: 48 mmHg`, and keeps Save → Send unchanged.
- The admin Caller Info tab is ordered as universal auto-sort scenario box, Dispatch
  countdown, Call # / Priority / MPDS Code, main caller-info fields, then
  optional extras. It parses
  labelled French/English dispatch text, including `Label: value`,
  `Label - value`, and label-on-next-line formats. `CALL #`, `PRIORITY`, and
  `MPDS CODE` fill the new fields; `ADDRESS` / `Adresse` / `Addresse`,
  `CHIEF COMPLAINT`, `STATUS`, and `TIME RECEIVED` fill Adresse, Probleme,
  Mise a jour, and Heure; `PATIENT`, `DETAILS`, and `UNITS ASSIGNED` combine
  into Information, but `DETAILS` appends its text without a `DETAILS:` prefix.
  `TIME RECEIVED` stores only the time value and stops before later scenario
  sections such as Patient Presentation.
  Legacy `Intervention prioritaire code` / `Code` labels are ignored. Matching
  fields overwrite immediately in draft state, optional extras are ignored, and
  trainees only see changes after the normal Save → Send flow.
- The admin dashboard combines monitor controls and patient SNS content in a
  `Monitor & Patient SNS` tab. The existing square SAMPLE and OPQRST checklist
  panels render directly below the Vitals box. Each letter has a compact
  left-aligned toggle button plus an auto-growing textarea. The universal
  Caller Info scenario auto-sort parses `Letter: value` lines into those
  textareas, with repeated `S` and `P` labels filling SAMPLE first and OPQRST
  second. SAMPLE `M` can also
  collect medication lines following `M:`, strip parenthesized descriptions,
  and store medication names as a comma-separated list. Longer SAMPLE/OPQRST
  notes automatically grow taller for visibility while short notes stay compact.
  Green letter selection remains manual only. Text and selections stay local to
  the admin page session, survive tab switching while the page remains mounted,
  and do not use Save/Send or update the trainee monitor.
- The admin dashboard includes a `Patient Physical` tab with the newer supplied
  front and rear body-outline image on a transparent/dark background. Tight
  inside-body selectable regions cover the head, neck, upper chest, abdomen,
  rear back, and front/rear pelvic trunk regions. Shoulders, upper/lower arms,
  hands, upper/lower legs, and feet are selectable independently by anatomical
  patient left/right on both body outlines, with upper-leg overlays tuned higher
  to match the newer outline. Selected regions are highlighted ECG green, stay
  within the body outlines, stay local to the admin page session, and do not use
  Save/Send or update the trainee monitor.
- Patient Physical auto-sort is also driven by the universal Caller Info
  scenario box. Recognized physical assessment sections such as head/face/neck,
  chest/respiratory, thoracic/front chest, back/spine/rear back, abdomen,
  pelvis, and left/right upper/lower extremities create amber `!` review
  markers on the fixed-size body map. Finding text appears in the Selected
  panel only after the marked region is clicked and confirmed ECG-green. Broad
  extremity sections map to front-outline limb regions only, and later
  back/spine or thoracic headings stop extremity collection instead of being
  appended to leg findings. Confirmed findings in the Selected panel follow the
  order the instructor clicked body parts.
- The bottom of the combined tab's Vitals box contains equal-width Pulse,
  Respiratory, and Skin/Extremities icon cards in one horizontal row. The
  `Patient Physical` tab retains Scene/Environment beside the body map. Auto-sort still
  extracts Rate, Rhythm, and Strength internally from explicit
  respiratory/pulse labels and clearly classifiable broad Respiratory/Pulse
  section lines. Skin/Extremities and Scene/Environment sections collect their
  lines into one icon-only note and do not mark body-map regions. Each icon card
  is the only toggle: auto-sort places an amber `!` on the whole icon when any
  matching finding exists, clicking the icon turns it ECG-green and opens a
  combined slider, and clicking it again closes the slider while keeping the
  icon confirmed. Pulse/Respiratory sliders list missing Rate/Rhythm/Strength
  fields in amber. Comma-separated summaries such as `Pulse: 136 bpm, Regular,
  Weak` and `Respirations: 30 breaths/min, Regular, Labored` fill rate, rhythm,
  and strength in order.
- Admin vitals are ordered FC → SpO2 → BP sys/dia → EtCO2. The ECG graph/rhythm
  control sits in a separate right column beside the numeric vitals column. FC,
  SpO2, BP sys, BP dia, and EtCO2 remain vertically aligned together. SpO2 and
  EtCO2 do not render right-side graph controls; their left-side vital On/Off
  toggles stage both numeric active state and graph connection state.
  Vitals auto-sort treats `Pulse` / `Pulse rate` as FC/HR labels and stores only
  the first number from summary text such as `Pulse: 136 bpm, Regular, Weak`.
  The ECG-side admin column includes `T1`/`T2`/`T3` and `U1`/`U2`/`U3` timed
  vitals buttons that parse matching Treated/Untreated `(+5/+10/+15 min)`
  sections from the Caller Info scenario text and stage only draft vitals. These
  buttons use an explicit two-row, three-column grid and fill their entire
  outlined grid-cell rectangles for easier clicking. The ECG selector itself
  stays compact beside FC and does not stretch to the timed vitals button height.
  The visible top-of-vitals `Normal` button is removed.
- ECG rhythm selection stays compact by default with one picker button: it shows
  the remembered rhythm plus `(Off)` while ECG is Off and the selected rhythm
  label while ECG is On. Opening the picker while Off lands in the remembered
  rhythm's category and keeps that rhythm highlighted. Category buttons are `NSR`,
  `Cardiac Arrest`, `Heart Block`, `Bundle Branch Block`, and `MI`, then shows
  only the selected category's options underneath using the same button style as
  SpO2 and EtCO2. Current options are `NSR` under NSR,
  VF/VT/Asystole/Torsades under Cardiac Arrest, and `Anterior MI` / `Inferior MI`
  under MI; Heart Block includes `1st Degree`, `2nd Degree Type 1`,
  `2nd Degree Type 2`, and `3rd Degree`, and Bundle Branch Block shows an empty
  placeholder until rhythms are added.
- `NSR` / regular sinus completed 12-lead captures use the supplied
  `/images/regular-sinus-strip.png`.
- `1st Degree` uses a long-PR first-degree AV block rhythm with a visible P wave
  well before a narrow QRS complex. The live 12-lead grid uses lead-specific
  long-PR morphology, and completed 12-lead captures use
  the supplied `/images/first-degree-block-strip.png`.
- `2nd Degree Type 1` uses a Wenckebach rhythm with progressively lengthening
  PR intervals, three conducted beats, and a dropped P wave without a QRS before
  the pause. Completed 12-lead captures use
  the supplied `/images/second-degree-type-1-strip.png`.
- `2nd Degree Type 2` uses a Mobitz II rhythm with fixed PR intervals on
  conducted beats and an intermittent dropped P wave without QRS before the
  pause. Completed 12-lead captures use the supplied
  `/images/second-degree-type-2-strip.png`.
- `3rd Degree` uses a complete heart block rhythm with independent marching P
  waves and slower, wider ventricular escape QRS complexes, with no stable PR
  relationship. Completed 12-lead captures use the supplied
  `/images/third-degree-block-strip.png`.
- `VF` uses a dedicated reference-style fibrillation generator with irregular
  midline oscillations, uneven amplitude and spacing, and variant traces from
  `getEcgRhythm('vf')`; it no longer reuses the torsades twisting envelope.
  Completed VF 12-lead captures use the supplied `/images/vfib-12-lead-strip.png`
  image instead of the default printout.
- `VT` uses a monomorphic tachycardia reference shape with repeated tall
  complexes, steep upstrokes, sloped descents, and rounded negative troughs.
- `Anterior MI` and `Inferior MI` are canvas-rendered rhythms. The main monitor
  ECG and live 12-lead grid use generated MI morphology, while completed MI
  12-lead captures use the matching `/images/anterior-mi-strip.jpg` or
  `/images/inferior-mi-strip.jpeg`; other rhythm captures continue using the
default printout image. The live Anterior MI monitor strip uses a clean
small-R/deeper-S reference template with the P wave placed closer to the QRS
and a broad rounded T wave, while Inferior MI uses a clean tall Lead II-style
ST/T elevation reference template with the P wave placed closer to the QRS and
an explicit elevated ST segment without a post-QRS dip, a slightly widened QRS,
an R-to-ST transition that drops into a raised scooped ST segment, and a
rounded slower T-wave ramp whose softened peak is about half of the QRS height.
- ECG, SpO2, and EtCO2 graphs start/reset as spaced dashed disconnected traces.
  The graph connection state uses the same Off/On toggle treatment as numeric
  vitals instead of duplicate `Off` option buttons. Switching a graph On selects
  its default connected waveform/rhythm, and connected waveform/rhythm choices
  still use the same Save → Send flow as other monitor fields.
- Admin SpO2 and EtCO2 graph controls are built into the left-side vital toggles:
  On stages `normal`, Off stages `off`, and both continue through the normal
  Save → Send draft workflow. ECG graph controls do not display a visible
  `dirty` badge after local changes, and can still show `pending` after Save.
- Typing a SpO2 or EtCO2 numeric value also stages that vital active and sets
  its waveform to `normal`, including typed `0`; HR and BP numeric edits do not
  change waveform fields.
- Monitor SpO2 numeric vital values include a small yellow outlined vertical
  pulse-fill icon beside the number. The fill samples the selected SpO2 pleth
  waveform shape using the same pulse timing as the SpO2 graph, and is hidden
  when SpO2 is disconnected or displaying `SpO2 OFF`.
- Monitor secondary waveform rows follow confirmed waveform state after
  Save → Send while normal monitor mode shows only one secondary graph slot at
  a time. The CO2 soft key switches that slot between SpO2 and EtCO2. If the
  selected secondary channel is Off while the other is On, no secondary row is
  shown; if both are Off, the selected channel shows a disconnected trace.
  Bottom-panel-hidden expanded mode shows both EtCO2 and SpO2 rows, with Off
  rows disconnected. Monitor reset returns the normal-mode secondary selector
  to SpO2, even if EtCO2 was selected or calibrated before reset.
- ECG and SpO2 canvas waveform erase/update sweep lines share the same
  wall-clock phase so their black refresh bands stay aligned; EtCO2 keeps its
  slower independent capnography sweep.
- The admin Vitals ECG column includes side-by-side, mutually exclusive Regular
  CPR and Weak CPR override toggles. Regular CPR immediately overrides monitor FC
  to 120 and drives the ECG compression trace plus pulse-linked SpO2 graph/bar at
  120/min; Weak CPR applies the same behavior and waveform shape/amplitude at FC
  90 and 90/min. Clicking the active mode turns CPR off, while clicking the other
  mode switches directly. Turning CPR off restores the normal saved FC and ECG
  rhythm without changing underlying draft/saved/confirmed vitals. CPR/ECG mode
  changes keep the same canvas mounted so existing trace history remains behind
  the black sweep line until naturally erased. EtCO2 and the defibrillator CPR
  timer/audio workflow remain independent.
- The shared bottom admin Reset control is removed from every tab. In live
  sessions, a successful `New Attempt` remains the full instructor reset path;
  standalone `/admin` intentionally has no replacement manual reset.
- Gate state is persisted (store version 9; countdown stored as an absolute
  end-timestamp, response timer stored as an absolute start timestamp, and a
  per-dispatch run id) so a mid-drill refresh resumes and repeated reset/re-arm
  scenarios do not reuse the previous Go to Monitor state. `?dev=1` bypasses the
  gate.
- New: `useCountdown` and `useElapsedTimer` hooks, `formatEstTime` util, store
  dispatch slice; caller-event state moved from `useMonitorController` into the
  store; controller gained an `initialPoweredOn` option.

---

### Phase 10 — Folder-Based Scenario Library
**Goal:** Instructors can save, organize, reload, edit, move, and delete complete reusable scenario drafts from Supabase.

**Status:** Complete and deployed on 2026-08-20 through repair migration `20260820194954_qualify_scenario_order_constraint.sql`.

**Steps:**
1. Rename Caller Info to the default `Scenarios` tab, place it before Monitor, and add a fixed-height folder accordion above the unchanged caller-info editor.
2. Preserve the existing `General` data as an ordinary folder and provide create, rename, and delete controls for every case-insensitively unique folder. Deleting a non-empty folder requires confirmation and cascade-deletes its scenarios; the library may contain zero folders.
3. Save versioned authoring snapshots containing raw auto-sort text, monitor drafts and channel states, caller/dispatch inputs, SAMPLE/OPQRST state, and Patient Physical state. Runtime dispatch/CPR/calibration and Save/Send history are excluded.
4. Add a Title field plus green `Save Scenario` and red `Delete Scenario` actions. Blank titles use the smallest available `Scenario X` number.
5. Load snapshots directly into editable drafts without sending to students. Track the loaded baseline so unchanged or reverted scenarios cannot be saved again. Scenario rows toggle load/unload, with dirty-discard confirmation and authoring-only clearing on unload.
6. Persist explicit scenario positions per folder. Support drag/drop and Up/Down ordering within a folder, plus cross-folder drag/drop and an accessible Move fallback that append moved scenarios.
7. Store folders and saved snapshots in dedicated RLS-protected tables accessed only through typed server APIs, leaving the legacy timed-state `scenarios` table unchanged.
8. When a meaningful draft is saved while the library has no folders, atomically create the smallest available `Folder X`, select it, and save the scenario there.
9. Make the full Caller Info editor collapsible from an initially collapsed `−`/`+` header control without persisting the display preference.

#### Testing
- Unit coverage for snapshot normalization, meaningful-content and dirty comparisons, and fallback-number allocation.
- Migration/service/API coverage for ordinary General behavior, cascade deletion, empty-library auto-create, persisted ordering, concurrent reorder/move safety, validation, grants, and error responses.
- Component and admin integration coverage for tab order, folder accordion behavior, row toggle load/unload, save/update/delete, drag/drop and Up/Down ordering, cross-folder append, discard confirmation, empty-library save, Caller Info collapse, and four-tab restoration.
- Full Vitest, ESLint, production build, and rendered desktop overflow/interaction QA.

**Milestone — COMPLETE (2026-08-20):** An instructor can manage a global folder library, remove any folder, persist custom scenario order, reload or unload complete editable drafts from scenario rows, save into an automatically created folder when the library is empty, and collapse Caller Info without bypassing the normal Save → Send workflow.

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
