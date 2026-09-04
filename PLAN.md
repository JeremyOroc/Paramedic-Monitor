# Paramedic Monitor — Development Plan

> Desktop-first cardiac monitor simulator for paramedic training.
> Instructor controls vitals/rhythm in real time; students observe on a live monitor screen.
> Based on: Zoll X Series UI. Stack: Next.js (App Router), React, Tailwind CSS, Supabase Realtime.

---

## Current Requirement Updates

- 2026-09-02 correction: base Expand-UI on the current main layout. Widen the shared console to the available browser width with 24px side padding across all four tabs; remove the Monitor-only centered 1152px breakout. Preserve Vitals on the left and equal-height SAMPLE/OPQRST stacked on the right, existing 55/45 and expanded 8:5 proportions, all control sizing, and the compact spacing through 900px height. Use 24px outer vertical padding and section gaps only above that height. This supersedes the former tab-only width restriction.
- Wagami X uses a resting vital layout on the ordinary main waveform view before the first accepted physical Analyze or Charge action: FC, PNI, EtCO2, and SpO2 render as four equal-width, full-featured cells in the fixed `110px` bottom region, and the idle `APPL ELECT.` banner plus its three lower boxes are removed. The first accepted physical Analyze or Charge action moves the same vital displays instantly to the existing `96px` right column for the rest of the powered-on attempt, including analysis, CPR, charge, charged, shock, and delivered states; charge states keep both the energy scale and right-side vitals. Power-off/on, monitor reset, and New Attempt restore the resting layout. The left Call Info/Analyse soft key does not change placement. Collapsing the bottom region with the existing minus control temporarily moves vitals right and preserves the expanded three-waveform view; 12-lead and full-screen overlays retain their specialized layouts. Vital values, units, alarms, PNI reading phases, SpO2 pulse bar, French labels, selection identifiers, navigation order, and Enter-on-PNI behavior remain unchanged. Wagami Z is unaffected.
- In both the local and live-room Instructor Console, the `Monitor & Patient SNS` area uses a centered responsive two-column composition. At the compact accepted landscapes (`1080×700` and `1280×720`), it retains the approximately 55/45 Vitals-left and equal-height SAMPLE/OPQRST-right layout and compact controls so the complete ordinary-content tab remains visible without horizontal overflow. At landscape viewports at least `1280px` wide and `800px` high, this tab alone breaks out from the console shell into a centered container up to approximately `1152px`, uses an approximately `8:5` split, and grows Vitals by roughly one third to about `700px` while SAMPLE/OPQRST remains about `438px`; other tabs keep the existing console maximum width. The full `1440×900` layout enlarges and horizontally centers the interactive contents in both columns, with the largest growth applied to buttons: Vitals inputs/toggles, ECG, CPR, timed-vitals controls, SNS cards/options, checklist letter buttons, and checklist fields all receive roomier targets and modestly larger text/icons. Below `1024px` or in portrait, the tab stacks vertically and permits page scrolling without horizontal overflow. The Instructor Console is primarily presented on a MacBook or desktop monitor and must also fit a landscape iPad 8th generation as a supported secondary instructor display. Live-room content above the tabs may make the overall page scroll vertically. Vitals retains its two internal columns and clinical ordering. SAMPLE/OPQRST retain equal heights, stable two-line textareas without focus-driven reflow, and bounded field scrolling for longer notes.
- Pulse and Respiratory retain their default icon/title surface. On hover or keyboard focus, that entire fixed-size surface becomes three equal SNS measurement options of at least 44px height: `15s`, `30s`, and `Tap`. On touch, a first tap reveals and pins the options until an option is chosen, the user taps outside, Escape is pressed, or the other idle card is revealed. Only one idle touch option surface is pinned at a time; countdowns and results remain independent. Unrevealed options are not interactive or exposed as available controls. The surrounding card always communicates state: unconfirmed auto-sorted findings retain an amber border and persistent `!`, confirmed findings retain a green border, option buttons remain neutral until hover/focus, and an active countdown uses amber. A timed option replaces the same surface with a full-width cancellable countdown that remains visible without hover; cancellation restores the icon/title without revealing or newly confirming a result, while completion restores the icon/title, confirms the finding, and reveals the result below. Each result is capped at approximately three visible lines with bounded internal scrolling so both can remain visible without expanding Vitals. Tap is a per-group result-visibility toggle: when a result is visible, Tap hides it without unconfirming the green card or changing findings; when hidden, Tap takes a fresh snapshot, confirms, and reveals it. Pulse and Respiratory measurements remain fully independent: their countdowns may run and complete simultaneously, both results may remain visible, and starting, cancelling, hiding, or revealing one affects only that group. The transformation uses a short fixed-geometry color/crossfade transition, suppresses decorative motion under reduced-motion preferences, and restores focus to the group's disclosure control after dismissal, cancellation, or completion. Skin/Extremities and Scene/Environment retain their existing relationship and neither affect nor are affected by Pulse/Respiratory measurements. Timed measurements continue and complete at their real deadlines while another Instructor Console tab is selected, including off-tab confirmation and draft-dirty state, but cancel on scenario load/reset, refresh, or New Attempt. Each measurement snapshots the current auto-sorted findings at start. The 15- and 30-second count lines are display-only values derived from the snapshot rate using nearest-whole-count rounding. Missing findings retain the existing amber review treatment. Countdown state and derived counts are not saved in scenarios or broadcast to trainees.
- The shared instructor Save/Send actions must render in a left-aligned row immediately above the three-tab strip instead of below the forms. Selecting VF, VT, or Asystole locks the FC editor and turns FC On: VF shows `AUTO 190–220`, saves an underlying FC of 190, and displays a synchronized inclusive 190–220 integer on each 1.9-second FC alarm-flash cycle; VT shows and saves exactly 220; Asystole shows and saves `0 bpm` and also disables the FC On/Off toggle while the ECG remains On. Automatic-rhythm values cannot be overwritten by direct, auto-sort, timed, scenario, or hydration paths. Leaving an automatic rhythm, including switching an Asystole ECG Off, restores the current interaction's prior manual FC and unlocks both Asystole-locked controls, with 80 as the fallback for loaded/rehydrated automatic rhythms. VF randomness affects only the visible FC digits; waveform cadence, alarms, logs, and captures keep the underlying FC, CPR takes precedence, and room participants use server-timestamped deterministic display timing so they see the same sequence.
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
5. The Wagami X idle `APPL ELECT.` warning and its three lower status boxes are removed from the monitor surface; no dormant Apply Electrodes rendering path remains.
6. `VitalsStrip` — FC green / PNI cyan / EtCO2 purple / SpO2 yellow, with one shared component supporting resting-horizontal and defib-vertical placement
   - On the ordinary main waveform view before an accepted physical Analyze or Charge action, all four full vital displays occupy equal-width cells in the fixed `110px` bottom region. Existing values, units, alarms, PNI phases, SpO2 pulse bar, labels, and selection identifiers are preserved.
   - The first accepted physical Analyze or Charge action moves the same vitals instantly into the `96px` right column for the remainder of the powered-on attempt, including analysis, CPR, charge, charged, shock, and delivered states. Charge-family states render the energy scale and vitals together.
   - Power-off/on, monitor reset, and New Attempt restore resting-horizontal placement. The left Call Info/Analyse soft key does not trigger the transition.
   - The minus toggle keeps its established behavior: when the bottom region is collapsed, the waveform area expands to ECG, EtCO2, and SpO2 rows and vitals move to the right column; restoring it returns pre-defib vitals to the bottom.
   - 12-lead and full-screen overlays retain their specialized layouts and right-side vitals. Wagami Z is unchanged.
   - In vertical placement the right vital column width remains `96px`; prefer tighter padding or smaller text over hiding vitals.
   - BP/PNI has an accepted-reading layer: admin Save → Send stages BP changes, but displayed BP values, BP alarms, and BP Off update only after the outer-shell BP reading sequence completes without cancellation.
   - After the BP reading completes, PNI settles to the stacked systolic/diastolic layout with the divider line; only the count-up phase uses a single systolic-style number.
   - During active BP reading phases (Please Wait, Reading in Progress, and count-up), suppress only the BP alarm channel so PNI does not flash red/white and BP does not drive alarm audio; HR and SpO2 alarms remain active.
7. `RightNavCluster` — 6 nav buttons (alarm, home, back, enter●, forward, camera)
8. `BottomStatusBar` — defib, analysis, CPR, charge, and shock feedback only; idle space belongs to the horizontal resting vitals
9. `DefibButtonRow` — ANALYSE | ▲▼ | CHARGE | SHOCK (styled, not wired)
   - Physical shell also includes an inert PACER button, matching the reference hardware
   - Top-rim power button toggles green/red locally, shows a boot screen on power-up, and shows a black powered-off screen. Jumpscare audio/video pathways are removed/commented out; the monitor remains silent except for legitimate simulator cues.
  - Grey physical soft keys own left-sidebar interactions: 12-lead, EtCO2 toggle, left-menu ANALYSE (opens caller info modal only), and Back
   - Inner dark sidebar labels are visual only and must not be clickable
   - Right physical Move up / Move down / Enter buttons cycle a blue selected state through monitor header, vitals in their current placement, visible waveform labels/scales, ECG labels, and the minus toggle row. The selection order does not change when vitals move. Enter remains functional on PNI and the minus toggle and inert on the other listed selections.
   - Medication mode keeps the normal right-side Move up / Move down / Enter monitor navigation active. When the medication Info soft key opens the event log, those three controls temporarily navigate the log instead. Exit is selected on open; multi-page logs cycle Down through Exit → Prev → Next → Exit and Up in reverse, while single-page logs keep Exit as the only selection. Enter closes only the log from Exit or activates the highlighted page direction from Prev/Next. The log shows 8 events per page, hides pagination for 0–8 events, consumes navigation without changing the background, and keeps unavailable first/last-page directions selectable but disabled when multiple pages exist. Closing the log restores normal monitor navigation while medication mode remains open.
   - The physical Home button opens a mutually exclusive `Vital Log` modal matching the Event Log geometry. Beginning at `00:05:00`, it records immutable trainee-visible snapshots every five elapsed monitor minutes in Timestamp → FC → PNI SYS → PNI DIA → ETCO2 → SPO2 order. FC includes the CPR override; PNI uses independently active accepted cuff values; calibrated EtCO2 records `0` while its confirmed channel is Off and the configured value while On; uncalibrated EtCO2 is unavailable; SpO2 requires an active channel; unavailable values render as `-`. The log shows 8 rows per page and reuses the Event Log Exit/Prev/Next cyclic navigation and boundary behavior. Back closes it, Home cannot open it over another modal, and no other modal can open while it owns the screen. Its history clears with the monitor session timer on power-off or refresh, but not on an instructor vital reset while that timer continues.
   - Header/subbar reference controls include a combined date/time selectable region, patient-mode selectable region, beacon icon, selectable battery icon, a small minus rectangle beneath date/time, and a larger empty rectangle beside it.
   - The minus toggle hides or restores the bottom region. When a resting vital row is hidden, the main waveform area expands to show ECG, EtCO2, and SpO2 rows while vitals move to the right column; active defib/CPR behavior remains unchanged.
   - Graph title metadata displays `SpO2 1x` and, when EtCO2 is visible, `EtCO2 0 to 60 mmHg`; this text does not change the internal EtCO2 renderer scale.
   - The first EtCO2 toggle after monitor reset starts a 45-second calibration gate with a purple progress trace that loads from left to right. EtCO2 number and graph stay hidden until calibration completes; toggling away before completion restarts calibration, while completed calibrations are skipped until the next monitor reset. Once calibrated, the latest confirmed EtCO2 channel state applies immediately without recalibration: Off displays numeric `0` with the standard dashed disconnected trace, while On displays the configured value and live waveform, including when the configured value is `0`. Instructor changes during calibration are reflected when it completes. The admin Vitals panel shows a compact pink EtCO2 indicator when calibration is complete.
10. Responsive: fixed to `100vw × 100vh`, no scrolling, desktop-only (min-width: 1024px enforced)
11. Color reference: `#000000` bg, `#00ff41` ECG green, `#00ffff` cyan BP, `#cc44ff` purple EtCO2, `#ffff00` yellow SpO2
12. `MonitorPage` render composition is kept separate from interaction state. Local monitor UI state
    (view/channel mode, modal state, patient-info editing, medication events, mute/power flags,
    selected-control navigation, 12-lead capture, print preview, and Back precedence) lives behind
    the reducer-backed `useMonitorController` hook.

**Testing:**
- Resting/defib vital-placement tests cover four equal horizontal default cells, complete vital behavior in both orientations, absence of every Wagami X Apply Electrodes path, immediate Analyze and Charge relocation, simultaneous Charge energy scale plus right vitals, persistence through CPR/result/delivered states, power/reset/New Attempt restoration, minus-collapse relocation, unchanged 12-lead/overlay placement, stable selection order, and Enter-on-PNI behavior.
- Component tests cover the physical shell chrome, power-button toggle state, defib control actions, 12-lead/EtCO2/back navigation soft keys, active 12-lead state, shock disabled/ready behavior, inert PACER behavior, and non-clickable inner sidebar labels.
- Jumpscare removal tests cover former off-state rolls, boot-screen clips, alarm-ack Easter eggs, and battery-triggered overlays staying inactive while legitimate simulator cues remain available.
- BP/EtCO2 tests cover staged BP commit/cancel/off behavior, BP alarm gating, EtCO2 calibration gating/restart/reset behavior, calibrated instructor-Off `0`/disconnected output, calibrated instructor-On configured/live output, immediate post-calibration instructor changes, mid-calibration instructor changes, connected configured zero, normal/expanded graph modes, trainee-visible Vital Log sampling, admin calibration indication, and real-time event-log stamps for medications/analyze rows.
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
   - The `Monitor & Patient SNS` tab uses the full shared console width: compact short landscapes retain the approximately 55/45 composition, while landscapes at least `1280×800` use an approximately `8:5` split. The Vitals box, including its Pulse, Respiratory, and Skin/Extremities row, remains on the left; equal-height SAMPLE and OPQRST boxes remain stacked on the right. At the expanded breakpoint, both panels' interactive contents are horizontally centered and inputs, toggles, ECG/CPR/timed-vitals controls, SNS cards/options, checklist letters, fields, text, and icons scale up, with buttons receiving the largest increase
   - Include `CallerInfoForm` in its own admin tab for dispatch/caller info shown on the monitor after ANALYZE: Dispatch countdown, Call #, Priority, MPDS Code, Adresse, Probleme, Information, Mise a jour, Heure, plus an `Add extra` button that reveals up to three optional title/input extra rows
   - Shared Save/Send actions sit immediately above the tab strip. VF/VT/Asystole use locked automatic FC values, automatically activate FC on selection, and restore the prior manual FC when the rhythm is left; active Asystole also disables the FC On/Off toggle and fixes the displayed/saved value at `0 bpm`, VF display-only randomness is synchronized across room monitors, and VT remains fixed at 220.
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
- Admin page and rendered-layout tests cover the shared compact 55/45 and expanded 8:5 Monitor & Patient SNS compositions, full shared console width, horizontally centered panel contents, enlarged controls at the `1280×800` capability breakpoint, unchanged compact fit at `1080×700` and `1280×720`, full expanded fit at `1440×900`, no horizontal overflow, and the sub-1024/portrait stacked scrollable fallback. Verify Vitals-left/SAMPLE-over-OPQRST-right geometry and all four tabs at 1512×850 and 1440×800.
- SNS component tests cover default-hidden measurement options, hover/focus and pinned-touch disclosure, one idle pin at a time, persistent state styling, fixed geometry, reduced motion, focus restoration, persistent countdowns, bounded independent results, and Tap hide/fresh-snapshot reveal behavior.
- Real iPad 8th-generation Safari validation follows a documented interaction and overflow checklist. When that device is unavailable, completion records real-device validation as pending rather than passed.
- Store, component, monitor, route, and synchronization tests cover automatic VF/VT/Asystole FC locking across every input path, Asystole's disabled FC toggle and fixed `0 bpm`, manual-value restoration and scenario/hydration fallback, synchronized inclusive VF flash values, CPR precedence, fixed underlying consumers, fixed VT 220, and the Save/Send action row above the tabs.

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
- The Instructor Console combines monitor controls and patient SNS content in a
  `Monitor & Patient SNS` tab shared by the local and live-room views. Compact
  short landscapes retain the approximately 55/45 Vitals-left and
  SAMPLE/OPQRST-right split. At landscape viewports at least `1280×800`, this
  tab uses an approximately `8:5` split within the full-width shared console,
  with 24px side padding across all four tabs. SAMPLE and OPQRST remain
  stacked in equal-height panels. Each letter has a toggle button plus a
  textarea. The universal
  Caller Info scenario auto-sort parses `Letter: value` lines into those
  textareas, with repeated `S` and `P` labels filling SAMPLE first and OPQRST
  second. SAMPLE `M` can also
  collect medication lines following `M:`, strip parenthesized descriptions,
  and store medication names as a comma-separated list. Longer SAMPLE/OPQRST
  notes remain available through bounded field scrolling when they exceed the
  compact panel's visible area. At compact accepted landscapes, the panels'
  approximately 36–40px letter controls and textareas expose up to two lines
  without resizing on focus. At the expanded capability breakpoint, both
  columns' interactive contents are horizontally centered and all controls grow,
  with checklist buttons/fields reaching at least 44px and Vitals buttons,
  inputs, toggles, icons, and text scaling proportionally. The two-column tab is
  accepted at `1080×700`, `1280×720`, and `1440×900`; the first two retain compact
  heights, while `1440×900` receives the full enlargement. Below `1024px` or in
  portrait it stacks and scrolls vertically without horizontal overflow. The
  console has no fixed maximum width; compact height-based spacing is preserved.
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
- The bottom of the combined tab's Vitals box contains compact equal-width Pulse,
  Respiratory, and Skin/Extremities icon cards in one horizontal row. The
  `Patient Physical` tab retains Scene/Environment beside the body map. Auto-sort still
  extracts Rate, Rhythm, and Strength internally from explicit
  respiratory/pulse labels and clearly classifiable broad Respiratory/Pulse
  section lines. Skin/Extremities and Scene/Environment sections collect their
  lines into one icon-only note and do not mark body-map regions. Auto-sort places
  an amber `!` on a Pulse or Respiratory card when matching findings exist. Each
  card shows only its icon/title surface by default. Hover or keyboard focus
  replaces that fixed-size full surface with three equal, at-least-44px-high
  `15s`, `30s`, and `Tap` SNS
  measurement options; on touch, a first tap reveals and pins the options until
  selection, outside tap, or Escape. Hidden options are unavailable to pointer,
  keyboard, and accessibility interaction. Only one idle touch disclosure is
  pinned at a time; revealing the other card collapses it without affecting any
  running countdown or visible result. A timed option snapshots the current
  findings, hides that group's prior result, and replaces the same surface with
  a full-width cancellable countdown displaying `15s` through `1s`; it does not
  flash `0s` and stays visible without hover. Cancellation restores the icon/title
  without revealing or newly confirming the result. Completion restores the
  icon/title, confirms the card, and reveals the snapshot result below in a
  fixed region of approximately three visible lines with bounded scrolling. The
  outer card preserves amber pending `!` or green confirmed styling throughout
  the transformation, while options are neutral until hover/focus and countdowns
  are amber. Tap
  reveals a fresh snapshot when the result is hidden and hides the result when it
  is visible; hiding is presentation-only and does not unconfirm the card or
  mutate findings. The surface uses a short fixed-geometry color/crossfade,
  respects reduced-motion preferences, and restores focus to its disclosure
  control after dismissal, cancellation, or completion. A
  previously confirmed card remains confirmed after a later cancellation.
  Pulse and Respiratory countdowns and result visibility are fully independent:
  both may run, complete, confirm, and remain visible simultaneously, while a
  start or cancellation hides or changes only that same group's result. They do
  not close or cancel Skin/Extremities or Scene/Environment, and those existing
  icon panels do not close or cancel the measurements. Timed measurements use
  absolute end timestamps so they continue and complete at the real deadline
  while another Instructor Console tab is selected. Off-tab completion confirms
  the relevant card and dirties the scenario draft before the instructor returns.
  Scenario load/reset, refresh, and New Attempt cancel both measurements.
  Countdown state and derived counts are local, transient, excluded from saved
  scenario snapshots, and never broadcast to trainees. The result lists the
  snapshot's current fields plus display-only 15- and 30-second counts calculated
  from a valid rate with nearest-whole-count rounding; missing fields retain an
  amber notice. Respiratory `strength` snapshot data is presented canonically as
  respiratory effort without changing the backward-compatible saved field key.
  Skin/Extremities retains its existing single icon-only toggle. Confirmed controls
  keep a black surface while their border, icon, and label turn ECG green.
  Comma-separated summaries such as `Pulse: 136 bpm, Regular, Weak` and
  `Respirations: 30 breaths/min, Regular, Labored` continue to fill rate, rhythm,
  and strength/effort in order.
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
  a time. The CO2 soft key switches that slot between SpO2 and EtCO2. An
  uncalibrated selected EtCO2 channel shows only its calibration progress. Once
  calibrated, selected EtCO2 always keeps its row: confirmed Off shows numeric
  `0` with the standard dashed disconnected trace, while confirmed On shows the
  configured value and live waveform. Later instructor On/Off or value changes
  apply immediately without recalibration. For selected SpO2, the existing rule
  remains: if SpO2 is Off while EtCO2 is On, no secondary row is shown; if both
  are Off, SpO2 shows a disconnected trace. Bottom-panel-hidden expanded mode
  shows both EtCO2 and SpO2 rows, with calibrated EtCO2 following the same
  Off/On output and other Off rows disconnected. Monitor reset returns the
  normal-mode secondary selector to SpO2 and clears calibration.
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
1. Rename Caller Info to the default `Scenarios` tab, place it before Monitor, and add a fixed-height folder accordion above the unchanged caller-info editor. Folder expansion is independent from the selected save destination: every folder starts collapsed on page load, zero or many folders may be open, expansion survives admin-tab switches, opening a folder selects it without closing others, and closing it does not clear its save destination. The first existing folder remains the initial highlighted save target, and newly created folders open and become selected.
2. Preserve the existing `General` data as an ordinary folder and provide create, rename, and delete controls for every case-insensitively unique folder. Deleting any folder, including an empty folder, requires confirmation and cascade-deletes its scenarios; the library may contain zero folders.
3. Save versioned authoring snapshots containing raw auto-sort text, monitor drafts and channel states, caller/dispatch inputs, SAMPLE/OPQRST state, and Patient Physical state. Runtime dispatch/CPR/calibration and Save/Send history are excluded.
4. Add a Title field while placing `Save` and `Delete` actions on every scenario-library row instead of inside Caller Info. Save is enabled only for the loaded scenario when its authored title or snapshot differs from its baseline. Delete is available for any saved scenario and leaves a different loaded scenario and its editor values untouched. Blank titles use the smallest available `Scenario X` number.
5. Load snapshots directly into editable drafts without sending to students. Track the loaded baseline so unchanged or reverted scenarios cannot be saved again. Scenario rows toggle load/unload, with dirty-discard confirmation and authoring-only clearing on unload. Deleting the loaded scenario preserves its editor values as a selected local scenario draft.
6. Persist explicit scenario positions per folder. Support drag/drop and Up/Down ordering within a folder, plus cross-folder drag/drop and an accessible Move fallback that append moved scenarios.
7. Store folders and saved snapshots in dedicated RLS-protected tables accessed only through typed server APIs, leaving the legacy timed-state `scenarios` table unchanged.
8. Add `New Scenario` beside `New Folder`. It creates one selected local draft row under the selected folder, expands that folder, and uses the live title or `Untitled Scenario` as its row label. Any authored field change, including title alone, enables draft Save. Starting another draft while dirty requires confirmation. Deleting a draft requires confirmation and clears it without a server request.
9. Make the full Caller Info editor collapsible from an initially collapsed `−`/`+` header control without persisting the display preference.
10. Keep `Folder 1` virtual when `New Scenario` starts from an empty library; create the folder atomically only when the draft is saved. Disable folder/scenario creation, mutation, loading, and deletion while an attempt is active.
11. Replace every Scenarios-tab browser confirmation with one accessible Instructor Console dialog: black/grey surface and dimmed backdrop, pending-amber border/title, white description, and cyan/dark Confirm and Cancel buttons. Backdrop click and Escape cancel, focus is trapped while open, and focus returns to the triggering control.
12. Rename the visible `Dev Console` heading to `Instructor Console`; remove its two instructional paragraphs, the scenario-library `Global Supabase library` subtitle, and the Caller Info `Analyse` label.

#### Testing
- Unit coverage for snapshot normalization, meaningful-content and dirty comparisons, and fallback-number allocation.
- Migration/service/API coverage for ordinary General behavior, cascade deletion, empty-library auto-create, persisted ordering, concurrent reorder/move safety, validation, grants, and error responses.
- Component and admin integration coverage for tab order, Instructor Console copy, initially collapsed independent folder expansion, multiple/all-closed states, selected closed-folder save targeting, expansion across tab switches, new-folder opening, unconditional folder-delete confirmation, deletion fallback, row toggle load/unload, selected-and-dirty row Save gating, loaded and unloaded row deletion, local draft creation/save/delete, virtual empty-library `Folder 1`, active-attempt action locking, per-folder drag/drop and Up/Down ordering, cross-folder append, styled dialog confirm/cancel/backdrop/Escape/focus behavior, Caller Info action removal/collapse, and four-tab restoration.
- Patient SNS component coverage verifies black/green confirmed styling, pending and missing states, exact Pulse/Respiratory result formatting and rounded derived counts, immediate Tap behavior, independent simultaneous 15s/30s countdowns, countdown cancellation, no `0s` flash, completion confirmation, result snapshots, tab-surviving absolute timing, and cancellation on scenario load/reset, refresh, and New Attempt. Skin/Extremities retains its existing single-toggle behavior.
- Full Vitest, ESLint, production build, and rendered desktop overflow/interaction QA.

**Milestone — COMPLETE (2026-08-20):** An instructor can manage a global folder library, remove any folder, persist custom scenario order, reload or unload complete editable drafts from scenario rows, save into an automatically created folder when the library is empty, and collapse Caller Info without bypassing the normal Save → Send workflow.

**Instructor Console safety enhancement — COMPLETE (2026-08-29):** Scenario creation now begins from an explicit selected local draft row; saved rows own dirty-gated Save and confirmed Delete actions; every Scenarios-tab confirmation uses the accessible styled dialog; active attempts lock all library mutations; and the obsolete development copy and Caller Info actions are removed.

---

### Wagami Defibrillator Model Selection
**Goal:** Let instructors choose the monitor model used for a room attempt while preserving the existing dispatch workflow.

**Status:** Model selection completed on 2026-08-26. Wagami Z's live device surface was defined and completed on 2026-08-27.

**Requirements:**
1. Add a fourth Instructor Console tab named `Defibrillators` after Patient Physical. It contains staged `Wagami X` and `Wagami Z` choices, defaults to Wagami X, and participates in Save → Send.
2. Keep Start / Dispatch disabled while the model choice is dirty or pending. A successful Start locks both choices while leaving the tab available and the confirmed model highlighted; New Attempt preserves and unlocks that model.
3. Save the draft model in version-1 scenario snapshots. Legacy snapshots default to Wagami X, Wagami Z alone is meaningful scenario content, and active attempts disable scenario load/unload controls.
4. Share the confirmed model with student monitors. Wagami X renders the existing monitor. Wagami Z retains caller info, acknowledgement, countdown, arrival, and Go to Monitor, then renders its own full-screen live monitor surface instead of the temporary `Work In Progress` placeholder.
5. Keep `/?dev=1` as the direct Wagami X shortcut and make `/?dev=2` the direct Wagami Z device shortcut. The normal `/` route remains the session lobby.
6. Render Wagami Z as a complete, uncropped front-facing shell centered within the full-screen desktop viewport at the existing 1024px minimum. Include the body depth, screen bezel, speaker grille, status indicators, and right-side controls; omit external cables and tubing.
7. Replace the reference `ZOLL` and `Zenix` marks with `WAGAMI` and `Z`. Use French throughout the on-screen clinical labels and touchscreen controls.
8. Feed Wagami Z the attempt's live confirmed waveforms and vitals rather than fixed reference-image values.
9. Model the reduced physical-control layout from the reference: power and indicators across the top; Shock, Charge, and rotary controls down the right; mode controls across the touchscreen top; and menu, NIBP, marker, print, snapshot, 12-lead, analysis, and energy controls across the touchscreen bottom.
10. Except for power, make every Wagami Z outer-shell and touchscreen control an accessible inert control: hover, focus, and press feedback are visible, but clicks produce no audio, navigation, state mutation, or student event.
11. Keep fixed ECG, EtCO2, and SpO2 waveform lanes with FC, EtCO2, SpO2, and PNI values stacked on the right. Turning a confirmed channel off preserves its space and renders the appropriate disconnected/off state rather than reflowing the screen.
12. As an explicit temporary behavior, show confirmed PNI immediately while PNI is active because the initial Wagami Z cuff control is inert. A later requirement will replace this with Wagami X-equivalent cuff behavior; do not infer or implement that future interaction until it is specified.
13. Keep `DEA` visually selected. Derive `ADULTE`, `PÉDIATRIQUE`, or `NÉONATAL` from the confirmed patient category; keep the date, clock, and attempt timer live; and render Wi-Fi, battery, and readiness indicators as static healthy decoration.
14. Apply existing alarm thresholds as visual flashing on affected Wagami Z values, but suppress alarm audio because the silence control is inert.
15. Show the confirmed instructor energy setting in the inert energy control without local analysis, charging, shock, or energy-adjustment transitions.
16. Use the canonical French control labels `DEA`, `MANUEL`, the confirmed patient category, `PNI`, `MARQUEUR`, `IMPRIMER`, `CAPTURE`, `12 LEAD`, `ANALYSER`, `CHOC`, and `CHARGE`.
17. Preserve Wagami X display semantics for automatic VF/VT/Asystole heart rate, CPR heart-rate and waveform overrides, channel activation, and rhythm disconnection so both models present the same scenario consistently apart from the temporary PNI exception.
18. After normal dispatch entry, Wagami Z starts powered off. Its physical power button begins the same two-second boot delay as Wagami X and shows a black inner screen with a large centered `WAGAMI` wordmark while booting. The direct `/?dev=2` shortcut bypasses dispatch and starts the production Wagami Z component already powered on with current/default store values.
19. Pressing power while Wagami Z is on immediately returns its screen to black, stops and resets its device timer, and allows another two-second boot. The timer remains `00:00:00` while off and booting, then starts when boot completes.
20. Keep the boot screen limited to the large centered white `WAGAMI` wordmark on pure black, with no progress bar, sound, fade, or secondary copy. Render the power indicator dark green while off, pulsing amber while booting, and bright green while on.
21. Treat the source video's AED-paused advanced-monitoring screen as the initial visual baseline: fixed waveform lanes and right-side vitals with the top navigation and bottom actions still visible. Do not implement the video's manual/AED transitions, confirmation modal, charge/disarm/shock states, analysis prompts, CPR dashboard, or pause/restart workflow in this inert-control increment.
22. Keep source-video frames, original reference images, transcript exports, and reference-derived concept PNGs local-only through `.gitignore`. Public research documentation may retain original written observations, the source URL, and timestamps, but must not embed or redistribute those local media files.
23. Replace the desktop-only Wagami Z composition assumption with a two-display contract. The primary training display is a supported non-mini iPad in landscape running full-screen Safari or standalone/PWA; the secondary development display is a 1920×1080 desktop browser. Render the device surface when the safe CSS viewport is landscape and at least 1024×700. Scale one fixed-aspect, fully visible shell uniformly inside that safe viewport: desktop receives the reference's large side margins, while iPad naturally uses more of its roughly 4:3 display. Respect browser chrome, rounded corners, and safe-area insets. Portrait and narrow Split View/Stage Manager windows are unsupported and must not compress or crop the monitor. Preserve visually accurate controls while allowing their invisible touch targets to reach approximately 44×44 CSS pixels.
24. Exclude iPad mini from the tested, certified, and optimized training-display contract without adding user-agent detection or a mini-specific layout. A mini may render the general Wagami Z surface when its usable landscape viewport passes the capability threshold, but no mini behavior is guaranteed. Portrait and undersized/narrow viewports show a minimal French rotate/expand/unsupported display instead of a clipped or compressed monitor.
25. Keep the redesigned shell entirely code-native using CSS materials and SVG details; do not ship the reference-derived raster concept. Rebuild the target's multilayer bezel, enlarged and raised touchscreen, metallic bumper/face, sculpted lower shell and feet, smaller speaker pod, repositioned and layered physical controls, ridged rotary knob, restrained indicators, and corrected WAGAMI/Z placement.
26. Rebuild the touchscreen to the reference's proportions and information density: narrower right vital column, four aligned clinical rows with blank space opposite PNI, corrected navigation and bottom-action widths, deeper bezel, denser typography, CO2 scale/guides, PI treatment, alarm icons, network/battery decoration, shock count, and icon-only overflow. These details remain decorative or use existing state and do not introduce deferred defibrillation workflows.
27. Preserve instructor-authoritative waveform morphology and cadence for every rhythm, CPR, and connection state while adopting the reference's visual scale, line weight, spacing, and lane geometry. Remove the shell's registered-mark glyphs, use `ECG`, use an icon-only overflow control, and otherwise follow the reference copy wherever it does not conflict with the established French labels.
28. Use a blocking French fallback instead of the device surface when the orientation or usable viewport is unsupported. Portrait copy is `Mode paysage requis` with `Tournez l’iPad pour continuer.`; an undersized or otherwise unsupported viewport uses `Affichage non pris en charge` with `Utilisez un iPad compatible en plein écran.`
29. Allow the Wagami Z route to bypass the monitor root's desktop-only `min-w-[1024px]` constraint so its fallback can render without horizontal overflow. Preserve the existing minimum-width behavior for Wagami X and every other monitor surface.
30. At a 1920×1080 CSS viewport and 100% browser zoom, fit the shell at approximately 72% of viewport width and 96% of viewport height to reproduce the reference margins. On supported landscape iPads, enlarge the same fixed-aspect shell uniformly to the safe viewport with approximately 12–20 CSS pixels of breathing room. Never crop, stretch, or independently scale an axis.
31. Derive the decorative PI presentation from the existing SpO2 waveform state: show `3.3` with a strong bar for a normal signal, `0.5` with a short bar for a weak signal, and hide PI when SpO2 is off. Show the existing attempt shock count in the status decoration, normally `00`; do not copy the reference's sample `01` value.
32. Rendered responsive QA must cover 1920×1080 desktop, 1024×768 landscape tablet, 1180×820 landscape tablet, and 1366×1024 landscape tablet viewports, plus portrait and narrow-window fallback states. Do not add iPad-mini-specific fixtures or acceptance criteria.
33. Treat the supplied Image #1 as the measured desktop acceptance reference. Document normalized shell, bezel, screen, control, speaker, and lower-body landmark targets and their tolerances before implementation, then compare rendered geometry against those measurements instead of relying only on visual inspection.
34. At the 1920×1080 reference viewport, keep the outer shell, touchscreen, physical-control centers, speaker, and lower-body landmarks within ±2% of their normalized target dimensions. Keep secondary decorative details within ±4%. Review lighting, gradients, texture, and antialiasing visually rather than requiring pixel-identical rendering.
35. Recompute the contained shell fit immediately when the visual viewport changes, including Safari toolbar expansion/collapse and orientation changes; do not require a reload. Enter the fallback immediately when the usable viewport becomes portrait or falls below 1024×700, and restore the same running device state when it becomes supported again.
36. Preserve fixed simulated-hardware typography and geometry instead of introducing text reflow or a second composition for browser scaling, iPad Display Zoom, or system text preferences. Those settings influence the effective usable viewport and therefore the normal capability check.
37. Require automated component coverage and rendered browser QA for completion. Supply a concise manual checklist for a real supported non-mini iPad in full-screen Safari and, when available, standalone/PWA mode; lack of remote access to that hardware does not block implementation completion, while any reported discrepancy becomes a regression to correct.
38. Render unsupported-display guidance on a pure black full-screen background with a centered white heading and muted-white explanation. Show no partial shell, controls, buttons, or animation, and do not reset or mutate attempt/device state while the fallback is visible.

#### Testing
- Store coverage for model draft/saved/confirmed transitions, shared state, reset preservation, and legacy hydration.
- Scenario coverage for round-tripping, legacy Wagami X fallback, model-only meaningful content, and active load/unload locking.
- Admin coverage for the fourth tab, selection styling, Start gating, successful-start locking, failed-start behavior, and New Attempt preservation.
- Wagami Z component coverage for the shell landmark anatomy, French labels and exact fallback copy, WAGAMI/Z branding, repeatable powered-off/two-second centered-wordmark/powered-on transitions, timer start/reset, power-indicator states, fixed channel geometry, Wagami X display parity, live confirmed clinical values and patient category, temporary immediate PNI, visual-only alarm state, live energy, PI and shock-count decoration, accessible inert non-power controls, supported landscape display scaling, and unsupported portrait/mini/narrow-window fallbacks.
- Monitor coverage for unchanged Wagami X dispatch entry, Wagami Z dispatch-to-device behavior, and both direct development shortcuts.
- Reference QA compares the implementation against the supplied still and the representative power, advanced-monitoring, manual, AED-analysis, CPR, and mode-confirmation frames documented in `docs/research/wagami-z-defibrillation-video.md`, while verifying that deferred workflows remain inert.
- Full Vitest, TypeScript, ESLint, production build, measured 1920×1080 reference comparison with ±2% primary/±4% decorative landmark tolerances, rendered 1024×768/1180×820/1366×1024 landscape tablet QA, live viewport-refit checks, and state-preserving portrait/narrow fallback QA.
- Deliver a manual physical-iPad checklist covering full-screen Safari, optional standalone/PWA mode, safe areas, toolbar changes, orientation fallback/restoration, touch-target comfort, clipping, and readable fidelity; physical-device sign-off is follow-up validation rather than a prerequisite for implementation completion.

**Milestone — COMPLETE (2026-08-26):** Instructors can stage, save, send, and lock a Wagami model per attempt; saved scenarios and shared sessions retain the choice; Wagami Z preserves dispatch before entering its WIP placeholder; and both direct development shortcuts select their intended model.

**Wagami Z UI extension — COMPLETE (2026-08-27):** The functional Wagami Z surface now uses the approved code-native fixed-aspect shell and touchscreen composition across supported landscape displays. Safe-area-aware visual-viewport fitting, exact portrait/undersized French fallbacks, live state restoration, PI/shock-count decoration, and the power-only interaction boundary are implemented. All 822 tests, TypeScript, ESLint (0 errors; 12 existing warnings), and the production build pass. Rendered browser QA covers 1024×768 and 1180×820 landscape layouts plus portrait/narrow fallbacks, power cycling, inert controls, live clinical values, and viewport state restoration; the in-app browser host clamps requested 1366×1024 and 1920×1080 captures, so those native-size captures and the physical-iPad checklist remain non-blocking device validation.

---

### Phase 11 — STATUS.md / CHANGELOG.md Workflow + Polish
**Goal:** Team coordination files up to date; app polished.

**Steps:**
1. Update `STATUS.md` and `CHANGELOG.md` to reflect completed phases
2. Visual polish: font matching (Zoll uses a monospace/LED-style font for vitals — use `font-mono` or custom), pixel-perfect spacing
3. Wagami X no longer renders a "Check Electrodes" / `APPL ELECT.` warning; its resting bottom region is reserved for the horizontal vital layout
4. Keyboard shortcuts for instructor (optional QoL)
5. Print/snapshot button on monitor (browser `window.print()`)
6. Error states: invalid session code → friendly error page
7. Session expiry: sessions older than 24h return 404

**Milestone:** App is production-ready for training use. Team files are current.

---

### Phase 12 — Evaluation Record & Database Hardening
**Goal:** Every drill produces a reviewable record — what the trainee did, when, and what the
patient was at that moment — and the legacy schema stops leaking.

**Requirement change (2026-08-27):** The instructor is an evaluator who reviews drills after the
fact to grade ordering and timing mistakes (example given: a BP reading taken before medication).
`student_events` alone could not support this: only 8 of the trainee's controls emitted events, and
`session_state` is overwritten in place so no patient context survived. Scoring/rubric logic is
explicitly **out of scope** — this phase stores the data; grading stays with the evaluator.

#### 12a — Close legacy RLS policies (migration 006)
Migration 001 opened `sessions`, `vitals_snapshots`, and `scenarios` to the `anon` key, and
migration 004 only revisited the session-slice tables. `NEXT_PUBLIC_SUPABASE_ANON_KEY` ships to
every browser, so `sessions: public read` exposed every room code — and a room code is the entire
join credential. Drop all seven leftover policies. Drop `vitals_snapshots` (zero reads/writes in
`src/`; superseded by `session_state`). Repoint the health check off `scenarios` onto `sessions`,
which is never going away — `scenarios` stays for the deferred timed-state builder.

#### 12b — Instructor-side state history (migration 007)
New append-only `session_state_history (id, session_id, attempt_version, version, state, applied_at)`.
`updateSessionState` writes a history row alongside the existing `session_state` upsert. The upsert
is unchanged so the 1.5s student poll never reads history — it is written beside the hot path,
never on it.

#### 12c — Link actions to patient state
`student_events.state_version` is stamped at insert from the session's current state version. A
join on `(session_id, state_version → version)` reconstructs the exact patient state behind each
action. `attempt_version` already partitions by drill run.

#### 12d — Full action instrumentation
Extend `StudentEventKind` and emit from every remaining trainee control. New kinds:
`nibp_start` `{ mode, intervalMinutes }`, `nibp_result` `{ bp_sys, bp_dia }`, `power_on`,
`power_off`, `twelve_lead`, `twelve_lead_capture`, `print`, `etco2_toggle` `{ on }`,
`energy_change` `{ from, to }`, `treatment_menu`, `patient_info`.
CPR is instructor-driven, not a trainee action — it is captured by 12b, not here.
A DB `check` constraint plus server-side validation now pins `kind` to the union; it was free text
passed straight from the request body.

#### 12e — Participant identity integrity
Identity is a `localStorage` token, so a cleared store or a second device produced a duplicate
`participants` row with the same nickname — splitting that trainee's events across two IDs and
quietly corrupting their record. Add `unique (session_id, lower(nickname))`; `joinSession` falls
back to a nickname match and re-issues the token onto the existing row.

**Accepted trade-off:** anyone with the room code and a nickname can assume that identity. In a
supervised classroom this is the right trade for a correct roster.

#### 12f — Review query correctness
`getReview` selected all events `occurred_at` **ascending** with no limit, so PostgREST's 1000-row
cap silently truncated the *newest* rows — the live roster would stop updating with no error. Add
an `attemptVersion` filter (defaulting to the active attempt), an explicit limit with a truncation
flag, and index `student_events (session_id, attempt_version, occurred_at)`.
Also write `participant_attempts.completed_at` (never written before) so attempt duration is
computable.

#### Testing
- `applySessionExpiry`-style unit tests for kind validation and the nickname-merge branch of `joinSession`
- Service tests: history row written per state update, `state_version` stamped on events,
  review filtered by attempt, truncation flag set at the cap
- Component tests: each newly instrumented control emits its event with the right payload
- Migration review: no policy left on `sessions`/`scenarios` reachable by `anon`

**Milestone:** An evaluator can reconstruct a full per-trainee, per-attempt timeline of actions
against patient state, and the anon key can no longer read a room code.

---

### Phase 13 — Evaluation Report Tab
**Goal:** The evaluator reads one chronological stream of an attempt — every trainee action and
every instructor change, in order, each shown against the patient state in force at that moment —
so ordering and omission mistakes are visible after the fact instead of remembered.

**Requirement change (2026-09-02):** Running a lab, the evaluator cannot hold the whole attempt in
their head. What survives is the critical events; the small failures and the wrong-order actions
are the ones that get lost. Phase 12 stored the record but nothing renders it — `getReview` already
returns `stateHistory` and `attempts`, and `AdminPage` throws both away, using the response only to
refresh the roster. This phase is the read surface for data that already exists.

Scoring stays out of scope, unchanged from Phase 12: the report presents the run, the evaluator
judges it. The one derived signal is alarm state, and it is derived from the thresholds already
agreed in `getActiveAlarms` — reporting that a vital is in alarm is a fact, not a grade.

**Depends on:** migrations `006` and `007`, both verified applied to the live project on
2026-09-02. Attempts recorded before them carry a null `state_version` and render `[dispatch]`,
which is the honest reading of an attempt whose patient context was never stored.

#### 13a — Timeline assembly (`src/lib/evaluationTimeline.ts`)
A pure function over `getReview`'s response, returning `TimelineRow[]`. No fetching, no DB — the
whole ordering and formatting problem is unit-testable in isolation.
- `t+` offset from the attempt baseline: `participant_attempts.started_at` for that attempt,
  falling back to the earliest event when absent (rows predate the `started_at`/`completed_at` write).
- Patient state per row: `student_events.state_version` → `session_state_history.version`.
  A null `state_version` is an action taken before the instructor's first Send and renders
  `[dispatch]` rather than a fabricated state.
- Context format `RHYTHM HR · SYS/DIA · SpO2 N · EtCO2 N`, each channel rendered `--` when
  `confirmedVitalActive[field]` is false, and omitted entirely when the channel is off for the
  whole row — a VF arrest reads `VF · SpO2 --`, not a wall of dashes.
- Alarm channels per row from `getActiveAlarms(state.confirmed, state.confirmedVitalActive)`.

#### 13b — Instructor rows, interleaved
Consecutive `session_state_history` entries are diffed into synthetic rows stamped at `applied_at`,
placed in the same stream as the trainee's actions. This is what makes ordering legible: a
medication given before the instructor deteriorated the patient reads differently from the same
medication given after, and only an interleaved stream shows which happened.
- Only changed fields render — rhythm, each numeric vital, channel on/off, CPR mode, patient mode.
- The first version of an attempt is an opening state, not a diff: it renders as the scenario being
  sent, carrying the full context.
- **Known boundary:** instructor state reaches the database only on Send (plus the CPR and reset
  immediate pushes), so console-side actions absent from `SharedMonitorState` — patient physical
  and SNS reveals — do not appear. Widening `SharedMonitorState` is deliberately out of scope here.

#### 13c — The panel (`src/components/instructor/EvaluationReportPanel.tsx`)
Monospace table: elapsed time, kind, payload, patient state.
- A row whose state is in alarm carries a red outline, and the alarming channel renders in alarm red
  inside the context column, so a run's red bands are scannable without reading a word.
- Instructor rows are dimmed and marked, subordinate to the trainee's actions.
- Header carries the attempt, elapsed duration, and the truncation banner when `truncated` is set —
  a partial record says so rather than passing as whole.
- Copy button dumps the visible stream as plain text for a debrief or an email.

#### 13d — Tab wiring (`AdminPage.tsx`)
`AdminTab` gains `'report'` and the tab row goes to five columns. The existing 2.5s `/review` poll
already carries everything the panel needs: it stops discarding `stateHistory` and `attempts` and
holds them in state instead. No new request, no new endpoint — the tab is live during an attempt and
correct after it ends.

#### 13e — Attempt scoping
`getReview` already defaults to the active attempt and accepts `?attempt=N`; the panel exposes that
for reviewing an earlier attempt in the same room. One trainee per session is the current operating
assumption, so there is no roster picker — but if a second participant exists the panel shows a
name column rather than silently interleaving two people into one stream.

#### 13f — Finish work (decided 2026-09-02, before commit)
Keeping `stateHistory` in the 2.5s poll made the console download every stored state blob on every
tick — 823 KB per poll on the busiest attempt, 94% of it route polyline the report never reads.
Before Phase 13 is committed:
- `updateSessionState` strips `dispatchRouteConfirmed.geometry` before the history insert. The live
  `session_state` keeps it — the trainee's map is drawn from there. The record stores what the
  instructor sent and what the trainee pressed; the line the map drew is neither.
- One-off migration strips `geometry` from the 261 existing history rows.
- `/review?include=history` — the console sends the flag only while the Report tab is open.
- `getReview` runs its four queries with `Promise.all` rather than in sequence.

#### Testing
- `evaluationTimeline` units: offset arithmetic, missing-baseline fallback, null `state_version` →
  `[dispatch]`, inactive channel → `--`, alarm channels per row, instructor diff across single-field,
  multi-field, and no-op versions, and correct interleaving when an instructor change and an action
  share a second
- Component: rows render in occurrence order, an alarm row carries the red treatment, instructor
  rows are distinguishable, truncation banner appears at the cap, copy output shape
- `AdminPage`: the fifth tab renders and the existing four still switch

**Milestone:** An evaluator opens one tab after an attempt and reads the whole of it in order — what the
trainee did, what the patient was, and what the instructor changed between the two.

---

### Phase 14 — Sync & Queue
**Goal:** A trainee action survives a wifi outage, lands in the evaluation record at the moment it
was pressed and against the patient the trainee was looking at, and an unchanged room costs the
trainee's poll almost nothing.

**Decided 2026-09-02** in a grilling session; see `docs/adr/0004` for the queue and its clock, and
`docs/adr/0003` for the sync model this is the first half of.

#### 14a — `?since=<version>` on `/state`
The monitor already tracks the version it holds (`lastVersionRef`). It sends it; the server answers
`{ version, unchanged: true }` when nothing moved. Same interval, same heartbeat, ~50 bytes instead
of the whole blob. Room data shows one Send per ~13 minutes against a poll every 1.5 s, so this
turns roughly 534 of every 535 polls into a no-op.

#### 14b — The action queue
`monitor/page.tsx` fires each trainee action with `void fetch(...)` and no catch. A failed POST is
lost with no trace. Replace with an in-memory queue: append on press, drain in order with backoff,
never drop. Each queued action carries `occurredAtMs` and `captureSequence` from the existing
`createEventLogStamp()`, plus the state version the monitor was showing when it was pressed.

#### 14c — The record's clock
New columns on `student_events`: `occurred_at_client`, `capture_sequence`, and `clock_offset_ms`
(the server offset the monitor already computes for VF display sync). `occurred_at` stays as the
server's insert time. The report orders by the trainee's corrected clock and falls back to
`occurred_at` for rows predating the columns.

#### 14d — The state version is claimed, then bounded
`recordStudentEvent` accepts the monitor's claimed `state_version` and rejects any claim above the
version current at insert. A monitor may point backward (it was behind); it may never point forward.

#### 14e — The "behind" marker
A trainee action whose state version is older than the latest instructor change before its time
carries a marker in the report — `← 1 version behind` — so a decision made on a stale monitor
reads as "had not received it yet," not "ignored it." The evaluator can see how long the monitor
was stale, which bears on whether the attempt was fair.

#### Testing
- Queue: press offline → drain on reconnect in order; a failed drain retries and never drops; the
  stamp and claimed version are the ones from the press, not the drain
- Server: claimed version ≤ current accepted; claimed version > current rejected with 400; rows
  without the new columns still record
- Timeline: ordering by corrected client clock; fallback to `occurred_at`; the behind marker
  present exactly when the action's version trails the latest prior instructor change

**Milestone:** A shock pressed during an eight-second wifi drop is in the record, at the right time,
against the right patient, and flagged if the monitor was behind.

**Code complete 2026-09-03.** One thing the plan did not say and the build settled: "never drop"
means network failures and 5xx. A 4xx is a client bug and retrying it forever would jam every action
behind it, so the queue drops it, logs it, and continues. The migration must be applied before the
code is deployed, since both the review and the action path name the new columns.

---

### Phase 15 — Instructor Change Expansion
**Goal:** An instructor change opens to show what that Send changed, field by field, so the record
accounts for everything the instructor put in — not only the vitals — without repeating the
unchanged remainder on every row.

**Decided 2026-09-02.** Real room data: 79% of the dispatch card would be a repeat of the row above
if every expansion rendered it in full, and the card changes in only 17% of Sends. So expansions
show the difference, and the opening instructor change shows the full scenario because there is
nothing before it to differ from. Every Send is its own row, including a correction seconds after
the last; a Send that changed nothing renders dimmed as `sent (no change)` rather than vanishing.

#### 15a — Widen the diff
**Landed early (2026-09-03):** the scenario title. It was not in the stored state at all, so no
amount of UI work could have shown it; `scenarioTitleConfirmed` now travels with each Send and the
opening instructor change names the scenario.

`normalizeHistoryState` and `diffStates` extend, by explicit allowlist, to the fields the instructor
sets: `spo2_waveform`, `etco2_waveform`, `defibrillatorModelConfirmed`, `callerInfoConfirmed`
(callNumber, time, priority, mpdsCode, problem, address, update, information, extra1–3 where their
label is set), `dispatchRouteConfirmed.originAddress` / `destinationAddress`, and
`dispatchConfirmedSeconds` as a response time. Never deep-diffed: `dispatch.runId`, `startedAt`,
`countdownEndsAt`, `callerEvents`, `acknowledgedAt` / `arrivedAt` / `transportedAt` (these mirror
trainee actions already in the stream), route `geometry` / `status` / coordinates, and the legacy
`cprOverrideActive`.

#### 15b — Summary lines stay one line
Clinical changes are named individually. Everything else collapses by group — `dispatch card ·
3 fields`, `route · destination` — with `+n more` past a threshold. This also retires the
`sent (no clinical change)` wording: a dispatch-only Send now summarises as what it changed.

#### 15c — The expansion
A native `<button>` disclosure per instructor change, `aria-expanded`, state held per row id so it
survives the poll. Opening change: the full scenario grouped as the console groups it — Dispatch,
Patient, Device — empty fields omitted. Every later change: before → after for each changed field
only. Action rows do not expand; copy-to-clipboard is unchanged.

#### Testing
- Diff units per new group, and explicit proof the excluded fields produce no change
- Summary collapsing: grouped label, threshold, clinical changes still named
- Component: expand/collapse, `aria-expanded`, survives a re-render with new poll data, opening
  row shows the full scenario, a later row shows only its diff, action rows have no disclosure

**Milestone:** The instructor opens any of their own rows and sees exactly what that Send changed.

---

### Phase 16 — Realtime Nudge & Presence
**Goal:** A Send reaches the trainee's monitor in well under a second on the happy path, the roster
knows a trainee dropped the moment it happens, and neither depends on the poll — which becomes a
slow guarantee rather than the mechanism.

**Decided 2026-09-02**, `docs/adr/0003`. **Trigger: onboarding a second college.** Until then the
poll with `?since=` is correct and cheap enough; Realtime's cost advantage and its "feels instant"
value both arrive with scale.

- Both monitor and console subscribe to the room's channel. A Send broadcasts a nudge; a nudge
  triggers the same `?since=` poll immediately. The broadcast is never the only path a state change
  takes.
- Trainee presence moves to Realtime Presence on the same channel: join and leave pushed instantly,
  zero `last_seen_at` writes. Only then does the guarantee poll slow to 10–15 s.
- The roster's "connected" becomes *socket alive* rather than *polled recently*; accepted for a
  supervised classroom.
- Every Realtime client resyncs on reconnect by polling, because a broadcast dropped during an
  outage is gone.

---

### Later — Instructor Accounts & Ownership
Not a phase yet. The evaluation record currently lives as long as the room does, read before the
instructor closes it, and that is the agreed operating assumption. Selling to a second college
requires an **Instructor** as an account — Supabase Auth, `owner_id` on rooms and saved scenarios —
both so a record can be reopened later and so one college cannot see another's scenario library.
The scenario library is global today; every instructor sees every saved scenario. This lands before
the first external sale, not before.

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
| Realtime mechanism | Polling with `?since=` as the guarantee; Supabase Realtime as a nudge only — `docs/adr/0003` |
| Audio | Pre-recorded files in `/public/audio/` |
| Alarm thresholds | HR < 40 or > 140 bpm; BP sys < 90 or > 200 mmHg; BP dia < 25 or > 225 mmHg; SpO2 < 90%; no EtCO2 threshold |
| Joule defaults | Adult 120J / Pediatric 50J / Neonate 10J |
