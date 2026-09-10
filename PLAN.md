# Paramedic Monitor — Development Plan

> Desktop-first cardiac monitor simulator for paramedic training.
> Instructor controls vitals/rhythm in real time; students observe on a live monitor screen.
> Based on: Zoll X Series UI. Stack: Next.js (App Router), React, Tailwind CSS, Supabase Realtime.

---

## Current Requirement Updates

- 2026-09-10 requirement update — Spectator availability presentation: a Spectator view is Live only
  while the Room is active, the Spectator polling path is healthy, the selected trainee remains
  present within the existing eight-second heartbeat window, and that trainee has published a
  monitor projection. Every other condition retains a precise Spectator availability state rather
  than being collapsed into trainee Offline. The standalone Spectator and every Embedded Spectator
  mode—Docked, Floating, and Fullscreen—replace the small top-right non-Live state with a large
  treatment covering the spectator player surface only, never the surrounding Instructor Console.
  When a previous projection exists, the view preserves it beneath a strongly dimmed veil; before any
  projection exists, it uses a solid-black state screen. Trainee identity, confirmed device model,
  stale-frame update time, and all Spectator presentation/Stop controls remain visible and usable
  outside the veil. Large non-Live headlines use `CONNECTING`, `ROOM ENDED`, `SPECTATOR CONNECTION
  LOST`, `ATTEMPT NOT STARTED`, `TRAINEE OFFLINE`, and `WAITING FOR TRAINEE MONITOR`; explanations
  such as `No monitor received` and `Trying to reconnect` remain supporting copy rather than distinct
  states. Before the first response Connecting wins; once a response exists, a conclusively known
  Room ended state wins, followed by Spectator connection lost, Attempt not started, Trainee offline,
  Waiting for trainee monitor, and finally Live. Expected and terminal states use neutral white/gray,
  while Trainee offline and Spectator connection lost use the existing pending amber; none uses the
  clinical alarm red. A brief state-entry fade becomes static immediately and is removed for reduced
  motion—there is no flashing or continuous pulse. The veil disappears as soon as the next successful
  poll confirms every Live condition, without added dwell time. `Fullscreen unavailable` remains
  short-lived Instructor control feedback and never becomes a screen-covering availability state.
  Live alone retains the compact green top-right header label. Supporting lines are
  `Connecting to [trainee]…`, `Trying to reconnect…`, `Final monitor state`, `No monitor received`,
  `Start / Dispatch to begin the attempt`, and `The view appears when the trainee opens the monitor`,
  selected according to the resolved state and whether a retained frame exists; the stale timestamp
  stays in the header and is not duplicated. Simulated monitor power is independent: a healthy live
  projection of a powered-off device remains Live. Switching trainees clears the former trainee's
  frame before showing the new identity and Connecting screen; New Attempt clears the frame and shows
  Attempt not started; no selection retains the existing subdued selection placeholder; offline
  trainees remain selectable. The non-Live veil is authoritative and cannot be dismissed to make a
  stale frame appear current. A single failed one-second Spectator request shows Spectator connection
  lost immediately, and the next fully healthy response restores Live immediately.
- 2026-09-10 requirement update — Wagami X CPR interval and power-off audio: after either a no-shock
  analysis result or an advised shock, the CPR screen enters with the timer at `2:00`. The two-minute
  CPR interval begins when the 1.752-second Perform CPR cue completes. A state-owned absolute fallback
  starts it at that same nominal boundary if the cue is muted, blocked, interrupted, or never reports
  completion; delayed/background callbacks retain the scheduled boundary so they cannot extend or
  freeze the interval. The countdown then continues against its absolute start, reaches `0:00`, and
  retains the existing Stop CPR then Check Patient presentation. Switching the monitor off immediately
  stops all audible monitor cues, including a playing or pending CPR prompt/metronome, alarms, and
  charge sounds, while retaining the inaudible iOS audio-session keepalive. The next power-on retains
  the existing unmuted default.
- 2026-09-09 requirement update — Wagami X 12-lead transmission: after a trainee completes a
  12-lead capture, the third 12-lead soft key becomes an envelope-only transmission control. Before
  capture it remains visible but dimmed and inert. The completed capture remains eligible until a
  newer capture replaces it, power-off, monitor reset, or New Attempt clears it. Activating the
  envelope opens a reference-style panel containing only Return and seven fixed 12-lead transmission
  destinations, in this order: Institut de Cardiologie de Montréal; CHUM; Jewish General Hospital;
  Hôpital du Sacré-Cœur-de-Montréal; Royal Victoria Hospital; Hôpital Pierre-Boucher; Hôpital
  Charles-Le Moyne. The first destination is initially selected; Up/Down wraps through all seven
  destinations plus Return, Enter sends or returns, and the physical Back key also returns. Other
  monitor controls are inert while the panel is open. A send shows a centered icon, SENT, and the
  destination name for exactly three seconds; Up/Down/Enter are frozen during that interval while
  Back remains available. The panel remains open afterward, and the same capture may be sent
  repeatedly to the same or another destination. Each send is a separate Evaluation action displayed
  as `12-lead sent — [hospital name]`; it creates no permanent on-monitor log entry and performs no
  external transmission. Spectator reproduces the panel, selected item, and deadline-based
  confirmation. The feature is Wagami X-only and remains independent of transport routing and the
  Receiving Hospital Directory.
- 2026-09-08 requirement update — Receiving-hospital map workflow: the assignment dashboard, both
  at initial dispatch and when CALL INFO is reopened, adds a trainee-local Receiving Hospital
  Directory containing the exact 18 Montréal-area hospitals supplied by the product reference
  (16 adult, 2 pediatric); the legacy classic caller-information variant is unchanged. The hospital
  control toggles the complete set of labeled pins and fits the Incident scene plus the directory,
  then restores the active-route overview when toggled off. Selecting a pin or its matching row
  immediately previews a Transport leg from the Incident scene without changing the instructor's
  Dispatch leg or another trainee's route. Before Transport, later choices keep the Incident scene as
  origin. During Transport, a successful reroute starts from a snapshot of the unit's current position
  and the selection time, resets route ETA from that moment, and atomically replaces the active route.
  While a reroute loads, the active route and moving unit continue uninterrupted and only the candidate
  row/pin receives the amber loading state. A failed candidate leaves the active hospital and route
  untouched. Rerouting locks once the route reaches At hospital. Directory mode keeps
  every hospital pin inside the viewport until Track unit or the hospital toggle closes it.
- Distance and ETA use OSRM driving routes. The unit remains at the Incident scene until Transport,
  then moves along the active route. Transport remains valid without a hospital; a first route selected
  afterward starts at the successful selection time. The trainee-local choice survives CALL INFO and
  browser refresh in the same Attempt. New Attempt and monitor reset clear it. A new dispatch run or
  instructor change to the Incident scene clears it plus Acknowledge, Arrival, and Transport so no
  route milestone or timestamp leaks across the changed response. It appears in the trainee's
  Spectator view and is
  deliberately omitted from Evaluation records. A failed pre-Transport lookup retains the candidate,
  removes stale geometry/readouts, shows Route unavailable, and supports retry.
- Directory rows and pins appear immediately in reference order with Calculating distances…, then each
  Adult/Pediatric section reorders by OSRM driving distance. Before Transport, ranking uses the Incident
  scene; during Transport, opening the directory snapshots the current unit position and does not
  continuously reorder. Ranking failure retains reference order and reports Distance ranking
  unavailable without blocking selection. Rapid choices remain interactive, strictly latest-choice-wins,
  and discard stale responses.
- Fullscreen always opens the directory workspace. A bottom-right control uses browser-native
  fullscreen with an edge-to-edge in-page fallback; the presentation retains its controls and
  Distance/ETA/Status strip, Escape exits, and a scrollable 30%-width left overlay presents separate
  Adult Hospitals and Pediatric Hospitals tables with exactly Hospital, Designation, and Key Notes
  columns. Hospital names remain visible on the pins, and table-row selection equals pin selection.
  When labels would collide, they may shift with leader lines but are never hidden or abbreviated.
  Hospital and Track unit modes are mutually exclusive. Track unit is unavailable in fullscreen and
  explains that the trainee must exit fullscreen to follow the unit. Neutral hospitals use dispatch blue, the
  Selected receiving hospital uses destination red, the Incident scene uses green, and the unit uses
  cyan. The hospital control remains visible but disabled with an explanation until the Incident scene
  is located. Statuses distinguish En route, On scene, Route ready, Transporting, At hospital, and
  Route unavailable. Spectator reproduces the semantic directory, pins, selection, and fullscreen
  composition without entering native fullscreen itself. The directory overlay remains exactly 30%
  wide at every supported landscape size, wraps its three columns, and scrolls internally without a
  page-level or horizontal scrollbar.
- The directory is a versioned local dataset. Its supplied names, designations, and notes remain exact
  simulation curriculum; reviewed institutional emergency addresses are used when published and
  ordinary civic addresses otherwise. The 18 entries occupy 17 physical sites, so the adult MUHC Glen
  entry and Montréal Children's Hospital render as two offset selectors while both route to their
  shared true coordinate. The complete interaction contract is settled; implementation remains gated
  on explicit approval of the implementation and testing plan.
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
- CPR interval and audio-lifecycle tests cover both no-shock and advised-shock entry, `2:00` throughout
  the Perform CPR prompt, actual cue completion, the absolute 1.752-second muted/blocked/interrupted
  fallback, delayed callback catch-up, stale callback/deadline cancellation, `2:00` to `1:59`
  progression, `0:00` completion, inactive reset, and immediate all-cue cleanup on power-off.
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
- The assignment dashboard's route map also supports a trainee-local Receiving Hospital Directory.
  It uses the exact supplied set of 16 adult and 2 pediatric Montréal-area Receiving hospitals and
  appears both on initial New Assignment and when the assignment dashboard is reopened through CALL
  INFO; the legacy classic caller-information variant remains unchanged. The hospital control sits
  below Track unit and toggles the complete set of always-labeled hospital pins. Enabling it fits the
  Incident scene and all directory hospitals; after selection it keeps every hospital pin inside the
  viewport. Disabling it removes those pins and restores the active
  route overview. Selecting a hospital pin immediately previews a Transport leg from the Incident
  scene to that hospital, and selecting another hospital changes only the destination while all
  directory pins remain visible. The choice is local to that trainee, appears in their Spectator view,
  is deliberately omitted from Evaluation records, and never replaces the instructor-confirmed
  Dispatch leg or another trainee's route. It survives CALL INFO closure and browser refresh in the
  same Attempt. New Attempt and monitor reset clear it. A new dispatch run or instructor change to the
  Incident scene clears the selection plus Acknowledge, Arrival, and Transport. OSRM supplies the
  Transport-leg geometry, distance, ETA, and driving-distance
  ordering for each Adult and Pediatric directory section. Rows and pins appear immediately in
  reference order with Calculating distances…, then each section reorders when ranking resolves;
  ranking failure retains reference order and shows Distance ranking unavailable without blocking
  selection. Before Transport, ranking uses the Incident scene. During Transport, opening the
  directory snapshots the unit's current position for ranking and does not continuously reorder.
  The unit remains at the Incident scene until the trainee presses Transport, when movement along the
  Transport leg begins. Transport remains valid without a hospital; a first route selected afterward
  starts movement at the successful selection time. A successful in-Transport reroute uses the
  unit's current position and selection time as its new green origin and clock, removes the old
  Incident scene from the active route view, resets the ETA, and
  atomically replaces the active route. While it loads, the active route and moving unit continue and
  only the candidate row/pin shows amber loading. A failed reroute leaves the active route and Selected
  receiving hospital untouched while marking only the failed candidate. Rerouting becomes unavailable
  once the route reaches At hospital. A failed pre-Transport route
  lookup retains the candidate, clears stale geometry and readouts, shows both endpoints with Route
  unavailable, and may be retried by selecting it again. Rapid selections stay interactive and use
  strict latest-choice-wins response handling.
- A bottom-right map control enters browser-native fullscreen with an edge-to-edge in-page fallback
  where element fullscreen is unavailable. Entering fullscreen always opens the hospital-directory
  workspace; all hospital pins remain visible. The presentation keeps the map controls and
  Distance/ETA/Status strip, exits with Escape, and adds a scrollable left overlay at exactly 30% of
  the width at every supported landscape size. Its columns wrap, it scrolls internally, and it creates
  no page-level or horizontal scrollbar.
  The overlay contains separate Adult Hospitals and Pediatric Hospitals tables with exactly Hospital,
  Designation, and Key Notes columns. Selecting a table row is identical to selecting its map pin.
  Exiting returns to the compact map focused on the Selected receiving hospital's route, or the
  Dispatch leg if no hospital is selected. Hospital and Track unit camera modes are mutually
  exclusive; either Track unit or the hospital toggle closes directory mode. Track unit is unavailable
  in fullscreen with an explanation that fullscreen must be exited first. Neutral hospitals use
  dispatch-blue pins with permanent white labels, the Selected receiving hospital becomes the labeled
  red destination, the Incident scene remains green, and the unit remains cyan. The hospital control
  remains visible but disabled with an accessible explanation until the Incident scene has coordinates.
  Permanent labels may displace with leader lines to avoid collisions but never hide or abbreviate.
  Statuses distinguish En route, On scene, Route ready, Transporting, At hospital, and Route
  unavailable. The Spectator reproduces the trainee's complete semantic hospital pins, directory mode,
  selection, and fullscreen table inside its own frame without forcing the instructor browser into
  native fullscreen. The directory is a versioned local dataset whose supplied names, designations,
  and notes remain exact simulation curriculum. Routing uses reviewed institutional emergency
  addresses where published and ordinary civic addresses otherwise. The adult MUHC Glen entry and
  Montréal Children's Hospital render as two offset selectors at their shared campus while both route
  to the same true coordinate. The approved interaction contract is implemented.
- Testing for the Receiving-hospital map workflow: pure unit coverage for directory normalization,
  participant/Room/Attempt persistence keys, route-state transitions, reroute clocks, status labels,
  ranking fallback, and latest-request wins; component coverage for controls, permanent labels,
  selection/failure/loading states, the 30% table, keyboard operation, fullscreen fallback, focus
  restoration, and no-scroll layouts; store tests for reset/re-dispatch/Incident-scene clearing and
  trainee isolation; projection tests for semantic Spectator parity without browser fullscreen;
  rendered QA at 1024×768, 1280×720, and 1920×1080, including native fullscreen where available and
  the in-page fallback.
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

**Status:** Original phase complete and deployed on 2026-08-20 through repair migration
`20260820194954_qualify_scenario_order_constraint.sql`. Document-only folder scrolling and global
folder ordering were completed and deployed on 2026-09-03.

**Steps:**
1. Rename Caller Info to the default `Scenarios` tab, place it before Monitor, and add a bordered folder accordion above the unchanged caller-info editor. The accordion has no fixed maximum height or nested scrollbar: opening folders expands the box, and the Instructor Console document provides the only scrolling around the library. Folder expansion is independent from the selected save destination: every folder starts collapsed on page load, zero or many folders may be open, expansion survives admin-tab switches, opening a folder selects it without closing others, and closing it does not clear its save destination. The first existing folder remains the initial highlighted save target, and newly created folders open and become selected.
2. Preserve the existing `General` data as an ordinary folder and provide create, rename, and delete controls for every case-insensitively unique folder. Deleting any folder, including an empty folder, requires confirmation and cascade-deletes its scenarios; the library may contain zero folders.
3. Save versioned authoring snapshots containing raw auto-sort text, monitor drafts and channel states, caller/dispatch inputs, SAMPLE/OPQRST state, and Patient Physical state. Runtime dispatch/CPR/calibration and Save/Send history are excluded.
4. Add a Title field while placing `Save` and `Delete` actions on every scenario-library row instead of inside Caller Info. Save is enabled only for the loaded scenario when its authored title or snapshot differs from its baseline. Delete is available for any saved scenario and leaves a different loaded scenario and its editor values untouched. Blank titles use the smallest available `Scenario X` number.
5. Load snapshots directly into editable drafts without sending to students. Track the loaded baseline so unchanged or reverted scenarios cannot be saved again. Scenario rows toggle load/unload, with dirty-discard confirmation and authoring-only clearing on unload. Deleting the loaded scenario preserves its editor values as a selected local scenario draft.
6. Persist explicit scenario positions per folder and explicit global positions for folders. Support drag/drop and accessible Up/Down ordering for both folders and scenarios, plus cross-folder scenario drag/drop and an accessible Move fallback that append moved scenarios. Backfill folder positions from the current case-insensitive alphabetical order; append new folders; preserve position when a folder is renamed; compact positions after deletion; and keep folder reordering locked with the rest of the library during an active attempt.
7. Store folders and saved snapshots in dedicated RLS-protected tables accessed only through typed server APIs, leaving the legacy timed-state `scenarios` table unchanged.
8. Add `New Scenario` beside `New Folder`. It creates one selected local draft row under the selected folder, expands that folder, and uses the live title or `Untitled Scenario` as its row label. Any authored field change, including title alone, enables draft Save. Starting another draft while dirty requires confirmation. Deleting a draft requires confirmation and clears it without a server request.
9. Make the full Caller Info editor collapsible from an initially collapsed `−`/`+` header control without persisting the display preference.
10. Keep `Folder 1` virtual when `New Scenario` starts from an empty library; create the folder atomically only when the draft is saved. Disable folder/scenario creation, mutation, loading, and deletion while an attempt is active.
11. Replace every Scenarios-tab browser confirmation with one accessible Instructor Console dialog: black/grey surface and dimmed backdrop, pending-amber border/title, white description, and cyan/dark Confirm and Cancel buttons. Backdrop click and Escape cancel, focus is trapped while open, and focus returns to the triggering control.
12. Rename the visible `Dev Console` heading to `Instructor Console`; remove its two instructional paragraphs, the scenario-library `Global Supabase library` subtitle, and the Caller Info `Analyse` label.

#### Testing
- Unit coverage for snapshot normalization, meaningful-content and dirty comparisons, and fallback-number allocation.
- Migration/service/API coverage for ordinary General behavior, cascade deletion, empty-library auto-create, persisted ordering, concurrent reorder/move safety, validation, grants, and error responses.
- Component and admin integration coverage for tab order, Instructor Console copy, initially collapsed independent folder expansion, multiple/all-closed states, document-only scenario-library scrolling, selected closed-folder save targeting, expansion across tab switches, new-folder opening, persistent folder drag/drop and Up/Down ordering, folder-order rollback and active-attempt locking, unconditional folder-delete confirmation, deletion fallback, row toggle load/unload, selected-and-dirty row Save gating, loaded and unloaded row deletion, local draft creation/save/delete, virtual empty-library `Folder 1`, active-attempt action locking, per-folder scenario drag/drop and Up/Down ordering, cross-folder append, styled dialog confirm/cancel/backdrop/Escape/focus behavior, Caller Info action removal/collapse, and four-tab restoration.
- Patient SNS component coverage verifies black/green confirmed styling, pending and missing states, exact Pulse/Respiratory result formatting and rounded derived counts, immediate Tap behavior, independent simultaneous 15s/30s countdowns, countdown cancellation, no `0s` flash, completion confirmation, result snapshots, tab-surviving absolute timing, and cancellation on scenario load/reset, refresh, and New Attempt. Skin/Extremities retains its existing single-toggle behavior.
- Full Vitest, ESLint, production build, and rendered desktop overflow/interaction QA.

**Milestone — COMPLETE (2026-08-20):** An instructor can manage a global folder library, remove any folder, persist custom scenario order, reload or unload complete editable drafts from scenario rows, save into an automatically created folder when the library is empty, and collapse Caller Info without bypassing the normal Save → Send workflow.

**Instructor Console safety enhancement — COMPLETE (2026-08-29):** Scenario creation now begins from an explicit selected local draft row; saved rows own dirty-gated Save and confirmed Delete actions; every Scenarios-tab confirmation uses the accessible styled dialog; active attempts lock all library mutations; and the obsolete development copy and Caller Info actions are removed.

**Folder scrolling and ordering enhancement — COMPLETE AND DEPLOYED (2026-09-03):** The folder
accordion grows with its open contents and relies on the Instructor Console document scroll. Global
folder order persists through drag/drop and Up/Down actions, with deterministic backfill/create/rename/
delete behavior and active-attempt locking. Migration `20260903222810_instructor_spectator_and_folder_order.sql`
is deployed to the linked project and verified through the live folder API.

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
which is never going away — `scenarios` stays for the deferred timed-state builder. The health Route
Handler uses the server-only secret client because migration 006 revokes the `anon` table grant
before RLS can return an empty result; the credential never reaches the browser.

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
- Health-route tests: the server-only secret client checks `sessions`, returns 200 on success, and
  preserves sanitized 503 responses for query and configuration failures

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

**Code complete 2026-09-03.** Two things the build settled: the console's waveform selectors carry
no display names, so the report defines Normal / Weak / Off and Normal / Hypoventilation /
Obstructed / Off itself; and `diffStates` now returns structured changes with `summarizeChanges`
producing the line, so the expansion and the summary read from one diff rather than two.

---

### Enhancement — Attempt names
**Goal:** The instructor can name each attempt, and the Report tab's attempt picker shows names
rather than only numbers.

**Requirement (2026-09-04):** A room runs several attempts, and the Report tab lets the evaluator
switch between them by number. Numbers do not say which was which. A name does.

#### Where the name lives
The room has no attempt record of its own: `sessions.active_attempt_version` is an integer and
`participant_attempts` is per trainee. A name is a property of the room's attempt, so it needs the
missing entity. New table `session_attempts (session_id, attempt_version, label, updated_at)`,
primary key on the pair, service-role only like `session_state_history`. Rows are written on
rename only; an attempt with no row has no name. This is deliberately not stored in the sent state,
since a name must be changeable after the fact without a Send, and not on `participant_attempts`,
which would name it once per trainee.

#### The rename
`PATCH /api/session/[code]/attempt/[version]` with `{ label }`, host token required. The label is
trimmed and capped at 60 characters; an empty label clears the name. Any attempt in the room can be
renamed at any time, including the active one and ones already ended.

#### Where it shows
- The Report tab picker: `2 · Morning cohort`, or `2` when unnamed.
- The Report tab header and the plain-text copy header.
- The console's status line beside the attempt number.

`getReview` returns the room's `session_attempts` rows alongside `attempts`; they are a few bytes
and ride the existing poll.

#### The control
In the Report tab header, beside the picker: a small text field labelled `Attempt name`, saving on
Enter or blur. Host only, so it renders only when the console has a session. No modal, no separate
page.

#### Not doing
Naming an attempt at creation. `New Attempt` stays a single click; the name can follow. A default
name from the scenario title, since the scenario already shows on the opening row and two attempts
of one scenario would collide.

#### Testing
- Service: rename upserts the row, trims and caps the label, clears on empty, rejects a bad version,
  host token required; `getReview` returns the labels
- Route: label passed through; the 400s surface
- Panel: the picker shows `n · name`, the header and copy carry it, the field saves on Enter and on
  blur and calls back with the version
- Console: the PATCH is sent with the host token; the status line shows the name

**Milestone:** The evaluator opens the Report tab and picks `Morning cohort`, not `2`.

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

### Phase 17 — Instructor Spectator View
**Goal:** From every trainee row in the Instructor Console, the instructor can select one trainee and
observe that trainee's current simulator presentation in an adjacent Embedded Spectator without being
able to control it.

**Status:** Complete as of 2026-09-03. The projection, standalone presentation, and remote schema are
deployed, and the revised Embedded Spectator presentation is implemented in the Instructor Console.

**Decided 2026-09-03:** The Spectator view is a semantic reproduction, not literal screen capture or
video streaming. It covers the complete simulator presentation, including dispatch, the selected
device, power/boot state, menus, modals, selections, defibrillation state, NIBP and calibration
progress, timers, and logs. It does not reproduce browser chrome, pointer/finger location, or exact
pixel phase of animated waveform sweeps. The confirmed defibrillator model remains fixed per attempt,
not assigned per trainee, so each Spectator view follows the attempt's Wagami X or Wagami Z choice.

The implementation must use a participant-specific Trainee monitor projection rather than infer the
screen from the sparse evaluation event stream. The read-only renderer must be isolated from the
Instructor Console's persisted monitor store so opening a same-origin tab cannot mutate or rehydrate
the instructor's authoring state. Spectator reads are host-authorized and verify that the target
trainee belongs to the room; host or participant secrets never appear in the Spectator URL.

Each meaningful trainee transition publishes immediately. The Spectator view polls the authoritative
latest projection once per second, while absolute phase and deadline timestamps let timers and timed
progress animate smoothly between responses. This phase does not pull forward Supabase Realtime;
the future Realtime nudge in Phase 16 may accelerate the same correctness path without replacing it.

Every roster row exposes a Spectate toggle for the single Embedded Spectator. Selecting a trainee
changes that row's action to `Stop Spectating`; selecting another trainee switches directly and
restores the previous row's `Spectate` label. The standalone Spectator route remains available for a
possible different future use, but the Instructor Console no longer opens it in a new tab. Spectator
selection is transient: the console always starts and reloads with no selected trainee. Only the
selected trainee is polled, once per second; stopping or switching cancels the obsolete polling path.
Stop Spectating is immediate and confirmation-free. Switching clears the previous frame before the
new identity appears, then shows `Connecting to <name>…` until that trainee's response arrives.
Every roster trainee remains selectable, including offline trainees and those with no projection.
A selected offline trainee without a saved frame shows `Trainee offline · No monitor received`; a
connected trainee without a projection shows `Waiting for trainee monitor`.

The Instructor Console's current full-width room section becomes two equal desktop columns of the
same fixed 480px height. The cyan border encloses only the left half. Its contents stack in this
order: Room Code label; room-code value with Copy; status and attempt; Start/Dispatch, New Attempt,
and End Room actions; then Students. Only the Students list scrolls when it exceeds the available
height. Each trainee uses a compact two-line row: connection, name, and Spectate action above; Ack,
Arr, Txp, Shk, and Med progress below. The legacy Live Evaluation card is removed; the Report tab
remains the evaluation record. Roster order remains stable through selection and connection changes.
The selected row receives a cyan border and subtle cyan-black background; its action uses a
non-destructive amber `Stop Spectating` treatment.

The right half uses the console's black background and contains the Embedded Spectator. With no
selection it shows a subdued centered `Select a student to spectate` message. With a selection it
shows a compact student/model/connection header above the complete proportionally contained device,
without cropping or internal reflow. Black letterboxing is allowed so the miniature preserves the
same spatial relationships as the trainee presentation. The macOS screenshot-window chrome from the
visual reference is not part of the product; the right half contains only its compact header and the
trainee presentation on black. The last-update time is omitted while live
and shown only when the projection is stale. Before the first projection, the presentation shows a
`Waiting for trainee monitor` state. If the trainee disconnects, it preserves the last frame under a
clear offline/connection-lost banner and never switches trainees automatically. It follows the
selected trainee through the waiting state, resets on New Attempt without clearing the selection,
resumes on dispatch, and remains on a read-only `Room ended` state after End Room until the instructor
stops spectating or leaves the page.

Spectator playback is always silent. All simulator controls are removed from keyboard focus and
ignore pointer and touch input through the projection-driven renderer itself, while ordinary browser
controls remain available. The device surface fits the instructor's Spectator viewport instead of
reproducing clipping from the trainee's physical screen; small status metadata may report the
trainee's viewport and orientation without changing the mirrored simulator state.

Short-lived hover, focus, pointer-down, and touch-highlight feedback is outside the projection
contract, like pointer location; every resulting or sustained simulator state remains inside it.
Projection publication is latest-state delivery rather than an audit stream: when writes fail, the
trainee client coalesces obsolete intermediate projections, retains the newest projection, and
retries until it is accepted. The evaluation record continues to preserve meaningful trainee actions
independently.

The server stores one latest projection per trainee and no projection history. New Attempt clears the
current projection, and eventual room cleanup removes it with the room. A failed Spectator request is
reported as `Spectator connection lost`, distinct from `Trainee offline` when trainee presence expires
and `Waiting for trainee monitor` when no projection exists. Each state preserves the latest available
frame when there is one.

An always-visible, noninteractive strip outside the simulated device identifies the trainee, confirmed
Wagami model, and connection state, adding the last successful update only when the projection is
stale. Opening or closing a Spectator view does not add an indicator to the trainee's monitor. The
first implementation has no UI-enforced concurrency cap and is designed and tested for at least 30
connected trainees in one room and eight simultaneously open Spectator tabs for one instructor.

#### Presentation-mode enhancement (confirmed 2026-09-04, corner movement updated 2026-09-05)

The Embedded Spectator has three transient presentation modes that all reuse the same selected
trainee, projection renderer, and one-second polling path:

- **Docked:** the normal 480px console preview beside the room controls. Permanent Pin and Enter
  fullscreen controls sit at bottom-right.
- **Floating:** a corner-pinned mini-player while the vacated dock displays `Spectator pinned`. It
  begins at bottom-right around 320x250 near the minimum desktop width, grows to 360x280 at ordinary
  desktop widths and at most 400x310 on large screens, and respects 16px/safe-area offsets at all four
  corners. Return to dock is top-left, Stop is top-right, and Enter fullscreen is bottom-right.
  An always-visible 36px header grip moves the player with primary-pointer mouse, pen, and touch input
  after a 6px threshold. During a drag the complete player follows the pointer within the viewport,
  previews the quadrant targeted by its center, then animates to that corner on release. Escape,
  pointer cancellation, viewport changes, participant/mode changes, or page visibility changes restore
  the prior corner. Arrow keys move the focused grip to an adjacent corner and an unobtrusive live
  status announces the committed corner. Reduced-motion preference removes the snap animation.
- **Fullscreen:** browser-native fullscreen for the same player, with Stop at top-right and Exit
  fullscreen at bottom-right. Native Escape exits fullscreen and returns to the mode from which it
  was entered. If the Fullscreen API is unavailable the control is disabled with an explanatory
  tooltip; a rejected request leaves the current mode intact and announces `Fullscreen unavailable`
  for approximately three seconds. There is no simulated CSS fullscreen fallback.

The floating mini-player and its pinned corner remain stable across console document scrolling,
console tab changes, trainee switches, Docked/Floating and Fullscreen round-trips, New Attempt, and
End Room. Switching trainees retains the current docked/floating mode and corner while the existing
identity-safe projection handoff clears the former frame. Stop from any mode clears the transient
selection, restores Docked as the next mode, resets the next Floating Spectator to bottom-right, and
returns focus to the stopped trainee's roster button when it remains mounted. Reload continues to
clear all spectator state.

Mode controls are permanent rather than hover-only, use code-native 16–18px icons in 36px targets,
have accessible names, native tooltips, and visible focus treatment, and retain standard Tab,
Enter, and Space button behavior. The monitor canvas remains inert and uniformly contained with
black letterboxing in every mode; it must never crop, stretch, or internally reflow. Mode transitions
use a 160–200ms fade/scale motion that is removed for `prefers-reduced-motion`.

#### Testing
- Projection coverage for every trainee-visible surface and local/timed state that affects it.
- Host authorization, room/participant isolation, freshness/version ordering, and lifecycle behavior.
- Latest-only coalescing and retry behavior under failed, delayed, duplicated, and out-of-order writes.
- One Spectate toggle per trainee row, single-selection switching, stop behavior, selected-row state,
  transient/no-selection startup, unavailable/stale states, and active-model parity.
- Identity-safety coverage verifies a previous trainee frame disappears before the next trainee's
  name or frame can render, including slow and failed switch requests.
- Distinct waiting, trainee-offline, Spectator-disconnected, and room-ended states with the latest frame preserved where applicable.
- State-presentation coverage verifies the shared priority and exact headline/supporting-copy mapping;
  solid-black no-frame states; strongly dimmed retained projections; a green Live-only header label;
  neutral versus pending-amber severity; immediate first-failure and next-success transitions; an
  authoritative non-dismissible veil; powered-off-device Live semantics; and no duplicated stale
  timestamp or accessibility announcement.
- Presentation coverage verifies the large treatment stays inside the standalone/Embedded player,
  scales without overflow in Docked, Floating, and Fullscreen, leaves identity/model/timestamp and all
  presentation controls usable above it, uses only a brief entry fade, and becomes static under
  reduced motion.
- Read-only interaction tests proving pointer, keyboard, touch, and focus cannot mutate the projection or simulator.
- Compact containment checks for dispatch, Wagami X, and Wagami Z in the Embedded Spectator at the
  supported Instructor Console viewports, with uniform scaling, allowed letterboxing, no internal
  reflow, and no clipping or escape from the right panel.
- Polling tests verify exactly one selected participant is requested, obsolete requests cannot replace
  a newly selected trainee, and Stop Spectating halts projection polling.
- Load coverage for 30 connected trainees and eight concurrently polling Spectator views.
- Presentation-mode coverage verifies Docked ↔ Floating, Docked/Floating ↔ native Fullscreen,
  native Escape restoration, unsupported and rejected fullscreen requests, one-player/one-poll
  continuity, floating trainee switching, Stop behavior, focus restoration, permanent controls,
  safe-area sizing, and reduced-motion behavior.
- Floating-corner coverage verifies the 6px pointer threshold, free pointer following, viewport
  containment, quadrant selection, all four safe-area anchors, Escape/pointer/resize/mode cancellation,
  primary-pointer filtering, keyboard adjacency, live announcements, corner lifecycle retention and
  Stop/reload reset, target feedback, snap animation, and reduced-motion behavior.

**Standalone milestone — COMPLETE AND DEPLOYED (2026-09-03):** An instructor can observe one
trainee's live simulator state in a separate, inert page without changing either the trainee's state
or the Instructor Console's persisted state.

**Embedded milestone — COMPLETE (2026-09-03):** The Instructor Console presents one selected
trainee's complete inert simulator state beside the room controls, while the Report tab owns
evaluation history. The implementation shares one abortable selected-only polling hook with the
standalone route, contains full-screen dispatch overlays inside a fixed simulator canvas, and scales
that canvas uniformly with black letterboxing. Verification passed 999 tests, TypeScript, ESLint
with zero errors and the 12 pre-existing warnings, a production build, and an end-to-end browser run
with a real instructor room and trainee projection.

**Presentation-mode milestone — COMPLETE (2026-09-04; corners updated 2026-09-05):** The same
Embedded Spectator can be pinned as a movable-corner Floating mini-player or expanded through
browser-native Fullscreen, then
returned to its prior Docked/Floating mode without replacing its selected-only projection path.
Permanent accessible controls, focus restoration, native fullscreen exit handling, error feedback,
responsive safe-area sizing, reduced motion, and Stop from every mode are implemented. Verification
passed 1,059 tests, TypeScript, ESLint with zero errors and the 12 pre-existing warnings, a production
build, and a real instructor/trainee browser flow showing the live dispatch projection in Floating
and Fullscreen modes with clean console logs.

**Floating-corner milestone — COMPLETE (2026-09-05):** The Floating Spectator now follows a primary
mouse, pen, or touch pointer after a 6px threshold and pins to the quadrant containing its center on
release. The same permanent grip moves it by arrow key, announces each committed corner, previews the
pointer target, restores the prior corner after interrupted gestures, and retains its corner through
the agreed console and presentation lifecycle before Stop or reload resets it to bottom-right. Final
positions remain stylesheet-defined and safe-area aware; only transient drag coordinates use element
CSS variables. Verification passed 1,091 tests, the TypeScript production build, ESLint, and a live
1280×720 instructor-room browser flow with exact 16px corner offsets, full 360×280 size, real pointer
and keyboard movement, and clean browser logs.

**Availability-presentation milestone — COMPLETE (2026-09-10):** Standalone and all Embedded
Spectator modes now derive the approved state priority from one typed resolver and render every
non-Live state through one responsive player-surface veil. The implementation preserves stale frames
under strong dimming, uses solid black before a projection exists, keeps all identity and presentation
controls outside the veil, retains only the green Live header label, and provides one polite status
announcement. Focused state, overlay, standalone, Embedded-mode, and instructor integration coverage
passes all 83 tests; TypeScript, ESLint with the 12 existing warnings, and the webpack production build
pass. Rendered QA at 1440×900 and 1024×768 confirms clean responsive wrapping, exact surface
containment, no page overflow, healthy Connecting-to-connection-loss transition, and clean browser
logs. The full suite retains only the three unrelated previously documented failures.

---

### Next — Accounts & Scenario Ownership (PHASES 1–3 PRODUCTION VERIFIED; PHASE 4 NEXT)

The 2026-09-04 requirement change brings accounts and scenario ownership forward. Accounts are for
instructors and administrators only; trainees continue joining a room with its code and a nickname
and do not register or sign in. Each account owns Personal scenarios, while the permanent shared
`Templates` collection is available to every account. An account may load a Template scenario or
save an independent Personal scenario from it, but only Administrators may create, edit, replace, or
delete the shared original. `Templates` cannot be renamed, moved, or deleted.

Supabase Auth is the accepted authentication provider. Account admission is invitation-only: a Product
operator sends an approved instructor a Supabase invitation, and the verified recipient completes a
unique username and password in the application. The sign-in form presents username and password; a server-only bridge
resolves the normalized username to its underlying email identity and then uses Supabase password
authentication. The browser must not receive the email mapping, privileged credentials, or different
errors that reveal whether a submitted username exists. Native email recovery remains available.
Usernames preserve display capitalization but are trimmed and unique without regard to case, so
`Jeremy`, `jeremy`, and ` JEREMY ` conflict. A duplicate invitation-acceptance attempt must clearly ask the instructor
to choose another username, and self-service username changes are excluded from the first release.
Usernames contain 3–30 characters, start and end with a letter or number, and otherwise permit only
letters, numbers, periods, underscores, and hyphens. Spaces are not allowed.

The administrator usernames `Zoid`, `Branden`, and `Jeremy` are reserved for three deliberately
provisioned and verified initial accounts. Merely submitting one of those usernames must never grant
administrator authority. Roles and authorization are attached to the immutable authenticated account
identity, not inferred from username text. The only application roles are Instructor and
Administrator; Administrators inherit every Instructor capability.

Public self-registration is disabled. Product operators send and, when necessary, resend Supabase
invitations outside the application. An Invited Account cannot use ordinary authenticated product
areas until its invitation link establishes a verified session and the recipient completes the
application's invitation-acceptance page. That page collects a unique username and a password, never
an email address, registration code, or role. The server verifies the live invited Auth identity,
sets its password, and creates an enabled Instructor profile; it never trusts user-editable metadata
or username text for authorization. Username/profile creation remains race-safe through the protected
case-insensitive database constraint. If the profile write fails, the invited identity remains outside
ordinary product areas and may retry acceptance rather than receiving partial product access.

Administrators do not manage Accounts inside the application. Product operators use Supabase directly
to invite, inspect, disable, reactivate, or otherwise support Accounts and to make deliberately rare
Administrator-role changes. The login page provides self-service `Forgot password?` through the
verified email; neither Administrators nor Product operators see or choose a replacement password.
Standard Dashboard invitation links terminate at a dedicated browser handoff that validates the
Supabase session before entering setup; customized token-hash links remain supported by the server
callback. Redirect destinations stay application-local and allow-listed. Expired invitations are
resent by a Product operator. The first release needs no public-signup CAPTCHA,
custom signup throttling, or shared enrollment secret because it has no public signup surface.

The scenario library has two fixed areas. `My Scenarios` contains folders, ordering, and Personal
scenarios belonging only to the signed-in account; even Administrators receive no ordinary access to
another account's Personal scenarios. `Templates` separately contains shared folders, ordering, and
Template scenarios. Every account can read and use Templates, while only Administrators can mutate
their folders, ordering, and scenarios. An Instructor may start a Room directly from a Template. Any
attempt to save modifications uses an explicit `Save to My Scenarios` action that asks for a Personal
folder and name and creates an independent copy. Administrators must deliberately enter Template-edit
mode to change a shared original. At rollout, all existing global folders and scenarios move into
Templates without changing folder order, scenario order, contents, or identifiers.

Each Room belongs to the Instructor Account that creates it. Authenticated ownership replaces the
private host-token URL as the long-term authority for opening and controlling the Instructor Console;
trainees keep the existing code-and-nickname flow without Accounts. The rollout expires existing
host-token Rooms instead of carrying that authorization path forward.

An Evaluation record is created when an Attempt starts and autosaves throughout the Attempt. It stays
Incomplete until New Attempt or End Room completes it, so an interrupted Room does not erase the
work already recorded. Ending a Room discards its temporary live-operation state, but its Evaluation
records persist under the Room's Instructor Account. There is one record per Attempt containing all
participating trainee nicknames and events rather than duplicating Instructor changes and patient
history into one record per trainee. The Instructor may attach an optional repeatable list of Student
names to the record; those names are independent of join nicknames and remain editable afterwards.
A record accepts at most 100 Student names, each trimmed to 100 characters. Blank entries are removed,
capitalization is preserved, and duplicates are allowed because different students may share a name.
Within those bounds, entries are free-form. The interface labels them `Student names` and does not
show inline privacy, approved-identifier, or data-entry guidance. This accepted UI choice does not
remove the college's separate obligation to approve collection, notice, access, retention, and
deletion practices before production use.
Attempt names are already implemented as optional, editable 60-character labels shown beside the
immutable Attempt number in the picker, header, copied text, and console status. The account work
must preserve that behavior while replacing its current host-token authorization with Account
ownership. At Attempt start, the record also stores an immutable Evaluation scenario snapshot of the
scenario name, confirmed defibrillator model, and report-relevant configuration, so later source
scenario edits or deletion cannot rewrite the historical record.

`Reports` is an authenticated owner-only area listing complete and Incomplete Evaluation records.
It supports searching by Attempt name, scenario, Student name, and date; opening a record; editing
its Attempt name and Student names; copying its timeline; and permanently deleting it. Records have
no automatic expiry and remain until their Instructor deletes them. PDF export, external sharing,
grading, comments, and bulk export are excluded from the first release. If an Incomplete record's
Room has ended or expired, its owner may explicitly Mark complete; this does not change or synthesize
timeline events and records that completion was manual. The system never silently completes an
abandoned Attempt merely because its Room expired.
Permanent deletion uses a confirmation dialog naming the Attempt label/number, scenario, and date and
stating that recovery is impossible. A separate `Delete report permanently` action confirms it; typed
name confirmation is not required.

An Account may be signed in on multiple devices but may own only one non-ended Room at a time, and
only one device may control that Room. The browser that creates or reopens a Room becomes its Room
controller. Other signed-in devices remain read-only and may use a confirmed `Take control` action;
the takeover immediately invalidates the former controller's ability to Send, start Attempts, rename
reports, or end the Room while leaving observation available. Attempting to create another Room
offers to reopen or end the existing one. A Room expires 24 hours after creation, disconnects
trainees, releases the active-Room slot, and leaves the current Evaluation record Incomplete for
manual completion or deletion. The account rollout expires all active legacy host-token Rooms rather
than supporting two authorization systems. The public landing page remains split between account-free
`Join a Room` for trainees and `Instructor` sign-in; scenario management, Room
creation, and saved reports are authenticated Instructor functions. Browser sessions use Supabase's
normal persistent session behavior across browser restarts, with an obvious Sign out action for the
current device and no custom inactivity timeout in the first release.

Room codes are six case-insensitive uppercase characters drawn from an alphabet that excludes
ambiguous `0/O` and `1/I`. Creation retries transparently on a database uniqueness collision. The
public join route applies a short per-IP limit to repeated failed code attempts; this protects the
Room's only trainee credential and is separate from the decision not to add custom signup throttling.

The canonical application authorization record is a protected Account profile keyed by the immutable
Supabase Auth user ID and containing role and enabled/disabled status. Usernames and user-editable Auth
metadata never authorize access, and role/status is not trusted solely from a potentially stale JWT.
Least-privilege grants, RLS, and protected server routes enforce active Account status, owner access
to Personal scenarios/Rooms/Reports, authenticated Template reads, and Administrator-only Template
mutation. The service-role key remains server-only. Every allow and deny path receives database policy
tests as well as API tests. Disabling an Account takes effect for existing browser sessions immediately:
even if a previously issued Supabase access token has not expired, protected reads and mutations fail,
the active Room ends, and the application returns the browser to sign-in with an Account-disabled
message.

The application imposes no password composition, rotation, or other custom password rules. Supabase
uses an eight-character provider-level minimum. Provider validation errors are surfaced clearly by
the invitation-acceptance form.

The first Account page shows the immutable username, verified email, and current role. It allows a
signed-in Account to change its password and sign out the current device. Username and email changes
require Product-operator assistance; self-service email change is excluded from the first release.

Account offboarding separates reversible disablement from permanent deletion. Disabling blocks
login, ends any active Room, and retains Personal scenarios and Reports. A distinct, deliberate
Product-operator deletion removes the Account, its Personal scenarios, and its Reports; shared
Templates remain. At rollout, all pre-account Rooms and their associated report data are deleted
because they have no trustworthy Account owner. Only the existing scenario library is migrated into
Templates.

Scenario deletion preserves the existing confirmation and folder-cascade behavior under the new
ownership rules: owners may delete Personal scenarios/folders, and only Administrators may delete
Templates/Template folders. Deletion cannot affect active Rooms, independent Personal copies, or
immutable Evaluation scenario snapshots. Every Template create, edit, move, and delete writes a
lightweight append-only audit entry containing the Administrator, timestamp, action, affected entity
ID, and name. The first release does not provide version restoration.
The audit log has no application UI in the first release and is inspected only by Product operators
through Supabase.

Keeping Reports until their Instructor deletes them is the development and pilot default, not a
final institutional retention commitment. Production use by the college is blocked until the college
approves a written retention period and deletion process; the resulting manual or automatic policy
must then be reflected in the product and operational documentation.

Local development may use Supabase's development email tooling. External Instructor signup cannot
launch until custom transactional SMTP and a sending domain are configured for verification and
password-recovery delivery.

An email outage does not block normal password sign-in for verified Accounts, but new verification
and password recovery wait for delivery to recover. Product operators may resend or switch SMTP
providers but never reveal, choose, or manually reset passwords.

Development and production use separate Supabase projects. Real Instructor or Student information is
never copied into development, automated tests, screenshots, or seed data; migrations are exercised
against synthetic data before production.

Development and internal evaluation begin on Supabase Free. A paid plan is not an automatic classroom
requirement: before scheduled college use, the developers perform an explicit readiness review and
may retain Free if an independently operated backup/recovery process and the accepted availability
expectation are adequate. Supabase Pro remains an available upgrade rather than a committed purchase.
The independent dump frequency, encryption, off-site destination, responsible developers, retention,
restore rehearsal, and handling of Free-tier inactivity pauses remain launch blockers.

If production remains on Free, developer-operated disaster recovery must cover the application
schema/data, Supabase Auth identities, and their immutable ownership mappings; backing up only exposed
application tables is insufficient. Nightly automation writes encrypted backups to private,
institution-approved off-site storage, retains 30 daily and 12 monthly copies, alerts two designated
developers on failure, and completes a documented whole-project restore rehearsal quarterly. The
implementation must be verified against current Supabase tooling because the ordinary CLI dump
excludes managed schemas such as `auth` by default.

When Free serves scheduled classrooms, a designated developer performs a production invitation acceptance,
login, Room, and report smoke test at least one business day before the next class after any break of
five or more days. If the college cannot accept this dependency or possible reactivation delay, the
readiness review requires an upgrade rather than representing Free as equivalent availability.

The Reports list sorts newest first and loads 25 records per page. Case-insensitive search covers
Attempt name, scenario name, and Student names. All, Complete, and Incomplete status filters combine
with an optional date range and the search text. Report timestamps are stored in UTC and displayed in
`America/Toronto`, respecting daylight-saving time; copied timelines include the applicable EST or
EDT abbreviation.

Students receive no self-service report discovery, correction, deletion, or export because they do
not have Accounts. A student data request is routed through the college, which identifies the
responsible Instructor and record. Product operators then extract, correct, or delete the specifically
identified data through Supabase. This operational path does not add general report export or sharing
to the application.

Report creation, Student-name edits, Attempt-name edits, manual completion, deletion, and Product-
operator corrections write privacy-minimized audit rows containing actor, action, report ID, and
timestamp but no Student names or report contents. Ordinary report views are not logged.

The initial `Zoid`, `Branden`, and `Jeremy` Administrator Accounts are created and email-verified
manually by Product operators during deployment, using email addresses supplied privately at that
time. Operators assign Administrator authority to the resulting immutable Auth user IDs; no username
or invitation input can promote itself.

After authentication, `/instructor` is the persistent Instructor home with three primary areas:
`Console`, `Reports`, and `Account`. Console reuses the existing Instructor Console, contains the
scenario library and Create/Reopen/End Room controls, and remains usable for scenario authoring when
no Room is active. Reports and Account expose the already-defined report and identity functions
without creating a redundant dashboard. A new Account's `My Scenarios` starts empty and retains the
existing virtual `Folder 1` behavior until its first Personal scenario is saved; Templates are not
automatically copied.

Template and report audit entries use a one-year pilot retention period, then purge. The college's
approved production policy may replace that period. Product operators own technical incident
containment, Account disabling, evidence preservation, and database investigation. Before production,
the college names its privacy contact and remains responsible for notification decisions; a written
contact-and-response runbook is a launch requirement.

Account rollout occurs in a scheduled maintenance window with Room creation and joining disabled.
Operators first take the agreed backup, then apply and verify migrations, migrate the existing
scenario library into Templates, remove unowned legacy Rooms/reports, configure secrets and SMTP,
provision the three Administrators, run the acceptance suite, and only then reopen the application.
Before any new Account data exists, failure may restore the pre-migration backup and previous app.
After new Accounts, Personal scenarios, or Reports exist, the system stays in maintenance and uses a
reviewed forward fix or data-preserving recovery rather than blindly restoring over new data.

A server-side Account-system feature gate defaults off during deployment and exposes maintenance
without deleting or reverting schema. It is enabled only after migrations, secrets, Administrator
provisioning, SMTP, restore evidence, and acceptance checks pass. Critical failed Account cleanup,
backup, migration, and repeated SMTP delivery failures write sanitized operational-failure records
and email a developer distribution list. User-facing errors remain generic and contain no secrets or
personal data.

The release-acceptance gate covers invitation delivery/acceptance, duplicate usernames, sign-in,
recovery, disabled Accounts, Instructor/Administrator permissions, cross-Account isolation, Template
auditing, Room takeover/expiry/joining, Attempt/report persistence, manual completion, deletion,
migration counts, backup restoration, custom SMTP, and supported desktop/iPad browser flows.

Implementation proceeds in seven tested phases: (1) Account schema, authorization helpers, RLS, and
policy tests; (2) invitation acceptance, sign-in, recovery, and Account UI; (3) Personal/Template
scenario ownership and audit migration; (4) Account-owned Rooms, controller takeover, and expiry;
(5) persistent Reports, Student names, snapshots, search, and auditing; (6) `/instructor` navigation
and full interaction/browser testing; and (7) backup tooling, SMTP, rollout scripts, acceptance, and
operational documentation. Each phase updates `PLAN.md`, `STATUS.md`, and `CHANGELOG.md` and is not
complete without its tests.

#### Account implementation Phase 1 — Account authorization foundation (CODE COMPLETE 2026-09-04)

Phase 1 adds only the protected Account profile, reserved Administrator usernames, database
authorization helpers, least-privilege grants, and row-level security. It does not add registration,
sign-in pages, scenario ownership, Room ownership, or Reports. The profile is keyed by the immutable
Supabase Auth user ID. Display usernames are trimmed, validated, and unique case-insensitively;
`Zoid`, `Branden`, and `Jeremy` are reserved for manually provisioned Administrator profiles, but a
username never confers authority. Active role and enabled/disabled status are read from the profile
row on every protected database decision instead of from user-editable metadata or a stale JWT.

##### Testing

- Run database policy tests with synthetic Auth users for enabled Instructor, enabled Administrator,
  disabled Account, another Account, and anonymous access.
- Cover both allowed self-access and denied cross-Account access, disabled access, profile mutation,
  reserved-name misuse, invalid usernames, and case-insensitive duplicate usernames.
- Keep a migration-contract test in the application suite so the required constraints, indexes,
  grants, helper security, and RLS policies cannot silently disappear.
- Run the complete Vitest suite, TypeScript, ESLint, and a production build before marking Phase 1
  complete. The migration was initially held locally while linked-project migration-history drift was
  reviewed. On 2026-09-06, direct schema inspection verified the two already-present changes, their
  history was repaired, and the Account migration was deployed and verified.

#### Account implementation Phase 2 — Authentication and Account UI (INVITE HANDOFF CORRECTED 2026-09-06)

Phase 2 adds invitation-only onboarding, username/password sign-in, password recovery, session refresh,
protected Instructor entry, current-device sign-out, and the first Account page. Product operators
send Supabase invitations outside the application. The verified recipient follows the token-hash
callback to an acceptance page, chooses a unique username and password, and receives a fixed enabled
Instructor profile. The server-only username-to-email bridge never exposes the secret credential or
email mapping to the browser. Existing host-token Rooms remained operational through the Account and
scenario rollout; Phase 4 now replaces that path with Account-owned Rooms.

##### Testing

- Unit-test username, email, password, invitation-state, redirect, and same-origin validation.
- Test invitation acceptance, duplicate/reserved usernames, provider password errors, fixed Instructor
  role assignment, existing manually provisioned Administrator setup, and retryable profile failures.
- Test sign-in success, generic invalid credentials, non-accepted invitations, disabled Accounts,
  recovery, PKCE/token-hash callback exchange, implicit Dashboard-invite session persistence and
  credential-fragment removal, password change, current-device sign-out, and protected redirects.
- Test each client form's pending, success, error, navigation, and accessibility behavior.
- Exercise the flows against an isolated local Supabase stack with synthetic identities, then run the
  complete Vitest suite, TypeScript, ESLint, and a production build. The linked-project history review
  and Account authorization deployment completed on 2026-09-06. Production invitation routing now
  reaches the intended handoff; a successful real Dashboard invitation smoke test remains a launch gate.

Phase 2's original shared-code self-registration is superseded by the confirmed invitation-only
revision. Cookie-aware Supabase SSR clients and scoped Proxy refresh retain the server-rendered flow.
Same-origin, no-store API routes mediate invitation acceptance, sign-in, recovery, password changes,
and local sign-out. The standard Dashboard invite handoff removes its implicit-flow credentials from
browser history before persisting them into the cookie-backed session; PKCE/token-hash callbacks remain
supported. Both paths send verified invited identities to onboarding and reject non-invited profile-less identities. `/instructor` exposes login,
invite acceptance, recovery, and protected Account/reset states; it exposes no public registration.
The Account page keeps username/email immutable in-app, displays role, changes password, and signs out
the current device. Phase 4 removes the pre-account public Create Room and host-token path.

The first account release targets one college only. A multi-college SaaS remains a possible future,
not a committed product requirement. Institution records, tenant memberships, tenant switching,
college-specific administration, domain-based college enrollment, and per-college SSO are therefore
out of scope for this release. The initial design should stay simple while avoiding assumptions that
would make adding an institution boundary later require a destructive rewrite. The exact future
expansion seam remains part of the design interview; speculative multi-tenant infrastructure does not.

The user explicitly confirmed this complete documented contract on 2026-09-04 as the shared
implementation baseline and authorized implementation. Phases 1 and 2 are code-complete locally with
the isolated database, pgTAP suite, generated-schema TypeScript additions, Supabase Auth flow, and
Account UI. The corrected invite-only revision passed 1,151 Vitest tests with one opt-in integration
test skipped, TypeScript, ESLint with zero errors and the 12 pre-existing warnings, a production build,
and rendered dummy-token failure-path QA in Chrome.
The linked database now has complete migration parity and the deployed Account authorization objects.
The production Site URL and invitation routing are confirmed. The hosted public-signup switch is
disabled, and the real invitation acceptance plus sign-out/sign-in smoke test passed on 2026-09-06.
Phase 3 was merged and deployed to production on 2026-09-07 with its matching ownership migration.
Production verification passed health, invitation-only Instructor sign-in, fixed Personal and Template
areas, Template-to-Personal copying, sign-out/sign-in persistence, and the manually provisioned
`Jeremy` Administrator role plus shared Template controls. The previous deferred account note and its
assumption that the global library would remain
until an external sale are superseded by this design.

#### Account implementation Phase 3 — Personal and Template scenario ownership (PRODUCTION VERIFIED 2026-09-07)

Phase 3 converts the existing global scenario library into the shared `Templates` area without
changing its folders, ordering, scenario ordering, contents, or identifiers. It adds owner-scoped
Personal folders and scenarios for every enabled Account, while keeping `Templates` readable by all
enabled Accounts and mutable only by Administrators. The fixed area names are not stored as ordinary
folders and cannot be renamed, reordered, or deleted. New Accounts begin with an empty Personal area;
the existing virtual `Folder 1` is created only when the first Personal scenario is saved without a
selected folder. Template modifications by an Instructor create an independent Personal copy instead
of mutating or moving the shared original. Every Template folder/scenario create, edit, move, reorder,
and delete writes an append-only audit row without scenario contents.

##### Testing

- Add migration-contract and transactional pgTAP coverage for existing-data conversion, owner
  isolation, enabled-account Template reads, Administrator-only Template writes, immutable ownership
  scope, cascade deletion, grants, RLS, and append-only Template auditing.
- Add service and route coverage for missing/disabled Accounts, cross-owner IDs, Personal operations,
  Template reads, Administrator mutations, Instructor copy-to-Personal behavior, and generic denied
  responses that do not reveal inaccessible records.
- Add component coverage for the fixed `My Scenarios` and `Templates` areas, empty Personal state,
  role-aware controls, Template load/copy behavior, and preserving selection/order interactions.
- Run the isolated database replay and pgTAP suite, complete Vitest suite, TypeScript, ESLint,
  production build, and rendered browser checks before marking Phase 3 code complete.

Phase 3 passed a clean local replay of every migration, 54 pgTAP assertions, Supabase schema lint,
1,162 Vitest tests with one opt-in integration test skipped, TypeScript, ESLint with zero errors and
the 12 pre-existing warnings, and the production build. Rendered QA used disposable local
Administrator and Instructor Accounts to verify fixed Personal/Template areas, role-aware controls,
Administrator Template creation/update confirmation, and Instructor Template-to-Personal copying.
The browser console contained no warnings or errors. Local Auth keeps global signup disabled while
leaving the email/password provider enabled, matching the hosted invite-only behavior: an invited
Account login returned 200 and an anonymous signup attempt returned 422.
The matching application branch and `20260907032643_phase_3_scenario_ownership.sql` migration were
then deployed together. Production health and all ten rollout checks passed. The existing verified
`JeremyTest` Auth identity was deliberately renamed to the reserved `Jeremy` username and assigned
the `administrator` role by immutable user ID; subsequent sign-in and Administrator-only shared
Template operations passed. Phase 3 is complete in production, Phase 4 account-owned Room
authorization is production-verified, and Phase 5 persistent Reports are code-complete locally.

#### Account implementation Phase 4 — Account-owned Rooms, controller takeover, and expiry (PRODUCTION VERIFIED 2026-09-07)

Phase 4 removes the legacy host-token authorization path and deletes its existing temporary Room
rows at rollout. Every new Room belongs to the immutable Auth user ID of the enabled Account that
creates it. Trainees continue joining without Accounts using the six-character Room code, nickname,
and their existing participant token. An Account may have only one waiting or active Room. Creating
another offers the owner a deliberate choice to reopen the existing Room or end it and create a new
one.

The browser that creates, reopens, or takes control of a Room receives a controller token stored
outside the URL. Account ownership authorizes Room observation; the rotating controller token fences
mutations between multiple browsers signed into the same Account. A confirmed takeover immediately
invalidates the former controller for Send, Start/Dispatch, New Attempt, Attempt rename, and End Room.
Rooms expire 24 hours after creation, become ended on the next relevant access or create operation,
release the Account's active-Room slot, disconnect trainees, and leave the current attempt data
available for Phase 5 persistence work. Disabling an Account ends its active Room immediately.

##### Testing

- Add migration-contract and transactional pgTAP coverage for legacy Room deletion, immutable owner
  IDs, one-active-Room enforcement, explicit grants, owner-only enabled-Account reads, denial of
  direct app-role mutations, controller secrecy, disabled-Account cleanup, and cascade behavior.
- Add service and route coverage for authenticated creation, collision retry, active-Room conflict,
  owner observation, cross-owner and disabled denial, controller creation/rotation, stale-controller
  rejection, reopen/end-new choices, expiration, and unchanged trainee join/participant behavior.
- Add component and page coverage for removing public legacy creation, authenticated Room creation,
  existing-Room choices, clean instructor URLs, local controller persistence, read-only secondary
  devices, confirmed takeover, former-controller rejection feedback, and ended/expired Room states.
- Replay every migration locally, run pgTAP and Supabase schema lint, run the complete Vitest suite,
  TypeScript, ESLint, and a production build, then exercise the owner/controller/trainee flow in the
  rendered application before marking Phase 4 code complete.

Phase 4 passed a clean replay of every migration, all 83 pgTAP assertions, Supabase schema lint,
1,180 Vitest tests with one opt-in integration test skipped, TypeScript, ESLint with zero errors and
the 12 pre-existing warnings, and the production build. Rendered local QA confirmed the public page
offers only trainee Join and Instructor sign-in, `/admin` redirects anonymous visitors to sign-in,
and the browser console remains clean. Application integration coverage exercises Account-owned
creation, one-live-Room conflicts, reopen/end-and-replace choices, clean instructor URLs, local
controller persistence, read-only observation, confirmed takeover, and immediate stale-controller
rejection. The matching application branch and destructive legacy-Room migration were deployed
together. The complete production owner/controller/trainee acceptance checklist passed, so Phase 4
is closed.

#### Account implementation Phase 5 — Persistent Evaluation reports (CODE COMPLETE — LOCAL VERIFICATION PASSED 2026-09-07)

Phase 5 implements the approved persistent-report contract above without introducing college or
organization multi-tenancy. Starting an Attempt creates one Account-owned Evaluation record that
autosaves the complete multi-trainee timeline and an immutable snapshot of the scenario name,
confirmed defibrillator model, and report-relevant configuration. New Attempt and explicit End Room
complete the outgoing record; expiry leaves it Incomplete. Ending or later deleting temporary Room
state cannot erase the durable record, while deliberate Account deletion cascades its Reports.

The authenticated Reports area lists the current Account's records newest-first in pages of 25 with
All, Complete, and Incomplete status filters, optional Toronto-local date bounds, and search across
Attempt name, scenario name, and Student names. A report can be opened, have its optional Attempt name
and repeatable Student names edited within their existing limits, copy its Toronto-time timeline,
manually complete an abandoned record, or be permanently deleted through contextual confirmation.
Report creation and consequential mutations write privacy-minimized audit entries containing only
actor, action, report ID, and timestamp.

##### Testing

- Add migration-contract and transactional pgTAP coverage for per-Attempt creation, immutable owner
  and scenario snapshot, autosaved durable participants/events/state, explicit versus expiry
  completion, owner isolation, Account-deletion cascade, grants, RLS, and content-free auditing.
- Add service and route coverage for owner-only paginated filtering/search, Toronto date bounds,
  report detail reconstruction, Attempt/Student-name validation and editing, manual completion,
  permanent deletion, and inaccessible-record responses.
- Add component and page coverage for list states, pagination and filters, detail rendering, editable
  metadata, timeline copying, contextual deletion confirmation, and incomplete/manual-complete state.
- Replay every migration locally, run pgTAP and Supabase schema lint, run the complete Vitest suite,
  TypeScript, ESLint, and a production build, then exercise the Reports workflow in the rendered
  application before marking Phase 5 code complete.

Phase 5 passed a clean replay of every migration, all 118 pgTAP assertions, error-level Supabase
schema lint, 1,199 Vitest tests with one opt-in integration test skipped, TypeScript, ESLint with zero
errors and the 12 pre-existing warnings, and the Next.js production build. Rendered local QA used a
disposable invited-style Account and persistent report at the available 319×748 in-app viewport to
verify protected entry, report list/detail loading, search/status filtering, metadata persistence,
manual completion without timeline mutation, contextual permanent-deletion confirmation, durable
timeline rendering, Toronto timestamps, no horizontal overflow, no framework overlay, and an empty
warning/error console. A wider rendered viewport remains a rollout smoke-test item; responsive
component coverage and the production build pass. The matching application branch and
`20260907135753_phase_5_persistent_reports.sql` migration were merged and applied by the Product
operator on 2026-09-07. Phase 6 supplies the unified authenticated navigation and complete
cross-area browser verification.

#### Account implementation Phase 6 — Instructor navigation and full interaction verification (PRODUCTION VERIFIED 2026-09-07)

Phase 6 makes `/instructor` the canonical authenticated Console and gives Console, Reports, and
Account one consistent primary navigation. The existing `/admin` URL remains a backwards-compatible
authenticated redirect to `/instructor`; live Room consoles retain their existing
`/session/[code]/instructor` URLs and receive the same navigation without changing controller,
observer, or trainee behavior. Each surface identifies the active area accessibly and avoids
introducing a redundant dashboard. An approved post-launch consistency refinement makes the local
Console, Reports, and Account pages share the Console's full-width shell, outer spacing, divider,
green title treatment, and top-right navigation placement. Sign Out is a shared navigation action
positioned directly below Account on those three pages; the Account page no longer uses a centered
maximum-width card or a separate header action. The live Room Console keeps its existing content
layout and inherits the same Console header action.

##### Testing

- Add component and page coverage for the shared navigation, active `aria-current` state, canonical
  `/instructor` Console rendering, anonymous redirects, `/admin` compatibility redirect, and all
  Console/Reports/Account destinations.
- Cover the shared Sign Out action and the matching full-width Console/Reports/Account shell,
  including exact page titles and removal of the former Reports and Account supporting copy.
- Regression-test local Console and live Room rendering so the navigation does not alter Room launch,
  controller takeover, scenario, report, or Account behavior.
- Run the complete Vitest suite, TypeScript, ESLint, and a production build, then exercise protected
  Console → Reports → Account navigation and a live Room console in the rendered application at
  desktop and compact viewports. Check focus, overflow, framework overlays, and browser warnings.

Phase 6 makes `/instructor` the protected Console itself and retains `/admin` only as an unconditional
compatibility redirect. A shared semantic navigation now links Console, Reports, and Account from the
local Console and live Room Console, with an accessible active-page marker, keyboard-visible focus,
touch-sized targets, and compact wrapping. Rendered compact verification also corrected tab, scenario,
Vitals, and Patient/SNS layouts that could otherwise overflow at very narrow widths.

The initial expectation that this phase needed no database change was corrected during rendered
live-Room QA. A clean migration replay had never explicitly granted the protected server client the
least-privilege DML operations used on `session_state`, `participants`, `participant_attempts`, and
`student_events`; hosted environments could retain historical grants and hide the defect. Migration
`20260907163444_grant_live_room_service_access.sql` first revokes all access on those tables, then
grants only the exact server operations the Room routes use while leaving browser roles without
direct access.

Verification passed a clean replay of every migration, 120 pgTAP authorization assertions, error-level
schema lint, database security/performance advisors with no error-level findings, all 1,203 Vitest
tests with one opt-in integration test skipped, TypeScript, ESLint with zero errors and the 12 existing
warnings, and the Next.js production build. Rendered QA at the available 319×748 in-app viewport
verified canonical and compatibility routing, active Console/Reports/Account navigation, Room
creation/conflict/reopen behavior, live waiting-room access after the grant correction, compact tabs,
no horizontal overflow, no framework error overlay, and an empty browser warning/error console. The
available browser surface could not be resized to a desktop viewport, so a wider rendered smoke test
remains part of the post-deployment acceptance check; responsive component coverage and the production
build pass.

The Product operator merged and deployed Phase 6 together with its corrective Room-grant migration,
then passed all eight production acceptance sections on 2026-09-07: health, canonical Console,
cross-area navigation, `/admin` compatibility, live-Room database access, live-Room navigation,
responsive layout, and end/report/sign-out cleanup. The wider production check is therefore complete.

#### Account implementation Phase 7 — Production operations and launch readiness (CODE COMPLETE 2026-09-07)

Phase 7 closes the repository-side operational requirements for the single-college release. Because
the Account system is already deployed and production-verified, maintenance is an explicit server-side
`MAINTENANCE_MODE` whose safe default is off; changing it to `true` blocks application workflows with
a clear maintenance response while preserving `/api/health`. This supersedes the pre-rollout plan for
an unset Account feature gate to default off, which would now cause an accidental outage on a normal
deployment.

Developer-operated recovery uses Supabase's current three-part logical export: roles, schema, and
data. The data export includes managed Auth rows required to preserve immutable Account ownership.
The tooling verifies the expected Auth and application content, creates checksums and a manifest,
encrypts the archive before it leaves temporary storage, uploads through a provider-neutral `rclone`
remote, retains exactly 30 daily and 12 monthly encrypted copies, and never commits secrets or backup
artifacts. Restore rehearsal tooling requires an explicit non-production target and refuses a target
that matches the protected production host.

Repository runbooks cover custom SMTP and DNS, invitation/recovery testing, backup configuration and
quarterly restore evidence, Free-tier pre-class readiness after five-day breaks, deployment and
maintenance, forward-fix recovery, Account offboarding, incident/privacy coordination, audit
retention, and the complete release-acceptance gate. External SMTP credentials, encrypted off-site
storage configuration, two developer alert recipients, and the college privacy contact remain
operator-supplied launch configuration rather than repository secrets.

##### Testing

- Add unit coverage for maintenance-mode parsing, allowed health/static paths, maintenance page/API
  responses, cache prevention, and the existing Supabase session-refresh path when maintenance is off.
- Add contract and executable dry-run tests for required backup variables, official roles/schema/data
  dump commands, Auth inclusion checks, encryption-before-upload, checksums, 30-daily/12-monthly
  rotation, guarded non-production restore, sanitized failure output, and workflow scheduling.
- Test runbook completeness for SMTP, DNS, backup ownership, restore evidence, Free-tier wake-up,
  incident/privacy contacts, offboarding, rollback/forward-fix boundaries, and acceptance evidence.
- Replay every migration, run pgTAP, error-level schema lint and database advisors, then run the full
  Vitest suite, TypeScript, ESLint, production build, maintenance-mode HTTP/rendered checks, and the
  normal health/application path before marking repository implementation complete.

Phase 7 repository implementation passed a clean replay of every migration, all 128 pgTAP
assertions, Supabase schema lint with no errors, all 1,232 Vitest tests with one opt-in integration
test skipped, TypeScript, ESLint with zero errors and the 12 existing warnings, Bash syntax checks,
the executable synthetic backup/restore safety path, and the Next.js production build. Rendered and
HTTP verification confirmed the maintenance screen, page redirects with no-store/Retry-After,
sanitized API 503 responses, an available healthy database check, and complete restoration of the
normal landing/protected-route behavior after the flag was disabled.

Read-only hosted advisors reported no error-level findings. The remaining Auth warning is leaked
password protection, which Supabase documents as Pro-only and therefore remains a paid-plan
hardening option for the approved Free pilot. INFO-only no-policy notices correspond to deliberately
server-only tables whose browser grants are revoked and whose boundaries have pgTAP coverage;
pre-existing low-volume index suggestions remain observation items. Advisors must be rerun after the
Phase 7 migration is deployed. Production configuration is intentionally not performed by this
branch: the custom SMTP/DNS setup, private backup destination and secrets, two-recipient alert path,
quarterly non-production restore evidence, named college privacy contact, and full release checklist
remain external classroom-launch gates.

---

### Phase 16 — Instructor-Recorded Actions
**Goal:** The two things a drill produces that the record could not hold — a drug given while the
paramedic's hands were full, and a history question asked out loud — are recordable from the console,
and the SAMPLE/OPQRST answers and Pulse/Respiratory/Skin findings the instructor staged appear in the
report alongside the vitals that already did.

**Requirement (2026-09-07):** Two gaps, both reported from real use. A paramedic mid-intervention
gives the drug and never reaches the monitor's medication keys, so the run's record loses it
entirely. And the console's SAMPLE/OPQRST letter buttons were local highlight and nothing more — the
one skill the checklist exists to assess, whether the trainee actually asked, left no trace at all.

#### 16a — Who the row belongs to
**Decided 2026-09-07.** Both are trainee actions; the instructor is only the one at a keyboard. So
they are credited to the participant and carry `payload.source = 'instructor'`, which the report
draws as `by instructor`. The alternative — a separate `instructor_events` table — was rejected
because it gives the evaluator two streams to interleave by eye for one drill, and needs a parallel
review query, row kind, and attempt filter for no gain.

The console posts to `POST /api/session/[code]/instructor-event`, host-token authenticated, since it
holds no participant token. `recordInstructorEvent` verifies the participant belongs to *this*
session before writing, so a host token for one room cannot write into another room's record. It
stamps `source` server-side rather than trusting the body, and shares `insertStudentEvent` with the
monitor path so the two cannot drift on state pinning or validation. `stateVersion` is deliberately
not accepted: the console was never "behind" a state, and letting the host name an older version
would print a false `← n behind` on a row no monitor produced.

New event kinds `sample_ask` and `opqrst_ask`, added to `student_events_kind_check`. `medication`
already existed. Both directions of a checklist press are logged: a letter cleared is something the
record should show, not something it should silently disagree with the panel about. The detail reads
as a sentence a debrief can quote — `S from SAMPLE was asked`, `M from SAMPLE was unmarked`.

#### 16b — The med grid
`MedicationRecorder` becomes the middle column of the Monitor & Patient SNS tab, between the vitals
and the checklists. It offers all twelve meds from `ALL_MEDICATIONS`, derived from the monitor's
`MED_PAGES` rather than retyped — the console and the monitor must offer the same drugs or the report
shows two vocabularies for one drill. Flat, not paged: paging exists to fit four soft keys, and the
console has a column.

Each button carries a running tally of how many times that med has been given this attempt. It counts
every dose in the run, not only the ones logged here: a drug is a drug whether the trainee reached the
monitor or the instructor pressed it for them, and the instructor is watching for "has this patient had
three Epi", not "how many did I type". Derived from the live `studentEvents` rather than
`report.events`, which follows the evaluator into past attempts while the grid always records into the
current one, so a New Attempt resets the tally for free. A press counts optimistically and releases
once the write settles — the poll is 2.5s behind a press, and a count that moves a beat later reads as
a button that did not work; a failed write takes the optimistic dose back off rather than leaving a
tally claiming a drug the record never got.

Credit defaults to the room's single trainee and is resolved against the live roster on every render,
never stored, so a trainee leaving or a New Attempt cannot strand a stale id. A picker appears only
when there is genuinely a choice. With nobody to credit the grid disables itself and says why; the
checklist letters keep working, because that panel is also a scenario-authoring surface.

#### 16c — The staged answers reach the report
SAMPLE/OPQRST text and the Pulse/Respiratory/Skin findings were console-local React state and reached
neither the monitor nor the record. They now travel with each Send under an `instructorOnly` key.

**Decided 2026-09-07 — the key is stripped from `session_state` and kept in `session_state_history`.**
The trainee polls `session_state` every 1.5s, so anything in it is one devtools tab away from being
the answer key to the questions they are being marked on asking. `splitInstructorOnlyState` is the
same seam as `stripRouteGeometry`, pointed the other way: that drops from history what only the live
state needs, this drops from live state what only history needs.

`normalizeHistoryState` and `diffStates` extend to both blocks. SNS findings are named individually
(`Pulse strength strong → thready`) because that is the clinical change the row is read for; history
answers collapse to `patient history · n fields` the way the dispatch card does, since one Send can
fill six letters. The opening change gains a `History` fact group. Rows written before this existed
degrade to blanks, which is what an old row honestly means.

#### Testing
- Service: host auth, cross-session participant rejection with the scoping asserted rather than only
  the null path, ended room, unknown kind, attempt window opened, `source` stamped over a body that
  claims otherwise
- `splitInstructorOnlyState`: block absent from the live upsert, present in the history row, caller
  state not mutated, a state without the key passed through
- Timeline: both blocks normalized, malformed and pre-migration rows degrade, SNS named / history
  collapsed, opening facts, ask wording both directions, `enteredByInstructor`, and no `behind`
  warning on an instructor row
- Component: all twelve meds unpaged, press records, visual and screen-reader confirmation, the
  confirmation moves to the newest press, disabled with a reason and no callback, picker hidden for
  one trainee, failure surfaced, tally absent at zero and singular at one, a given med reads apart
  from an untouched one, the tally survives the flash
- Integration: med press posts host-authenticated with the right body, both checklist directions
  post, an empty room still highlights but logs nothing, the Send carries `instructorOnly`, the tally
  counts monitor and console doses alike, excludes other attempts, moves under the finger while the
  write is held open, hands over to the polled count without double counting, and rolls back on failure
- Report: marker rendered and absent on monitor rows, ask sentences, marker in the copied stream,
  staged history and findings in the opening expansion

**Milestone:** An instructor records a drug and a question from the console, and both appear in the
trainee's stream marked as instructor-entered, against the patient state they were taken at.

**Code complete 2026-09-07.** Migration `20260908120000_instructor_recorded_actions.sql` is written
but **not yet applied** — the two new kinds are rejected by the live constraint until it is.

---

### Phase 18 — Wagami X 12-Lead Transmission
**Status:** CODE COMPLETE (2026-09-09); the forward Supabase migration remains to be applied with deployment.

**Goal:** Let a trainee simulate transmitting an existing 12-lead capture to a fixed Montréal
hospital destination and preserve each send in the Evaluation record.

**Scope:**
- Add the envelope-only third soft key, capture eligibility, seven-destination hardware-navigation
  panel, Return/Back behavior, three-second SENT confirmation, repeat-send behavior, and reset rules.
- Project semantic panel and deadline state to Spectator without enabling interaction there.
- Add a validated `twelve_lead_send` trainee event and a forward migration extending the database
  constraint; format the report row as `12-lead sent — [hospital name]`.
- Keep the transmission list separate from transport routing and do not perform external network
  transmission.

**Testing:**
- Unit-test destination order, soft-key eligibility, controller navigation/wrapping, blocking,
  timeout, repeated sends, Back/Return, and reset/power lifecycle.
- Integration-test capture-gated panel opening, hardware-only destination selection, three-second
  feedback, evaluation event payloads, and Spectator projection/validation.
- Test server event validation, report formatting, and migration coverage for `twelve_lead_send`.
- Run focused Vitest coverage, the complete Vitest suite, TypeScript, ESLint, and the production
  build; perform rendered monitor QA if the local app can be exercised without unavailable services.

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
| Instructor exclusivity | One Account-owned live Room per Account; one rotating controller browser, with same-Account observers read-only |
| Realtime mechanism | Polling with `?since=` as the guarantee; Supabase Realtime as a nudge only — `docs/adr/0003` |
| Audio | Pre-recorded files in `/public/audio/` |
| Alarm thresholds | HR < 40 or > 140 bpm; BP sys < 90 or > 200 mmHg; BP dia < 25 or > 225 mmHg; SpO2 < 90%; no EtCO2 threshold |
| Joule defaults | Adult 120J / Pediatric 50J / Neonate 10J |
