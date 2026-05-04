# Paramedic Monitor — Agent & Role Definitions

> This file defines the roles, responsibilities, coding conventions, and data-flow contracts
> for the 2–3 person dev team and their AI coding assistants.
> Read this before touching any code. Keep it updated when conventions change.

---

## Team Structure

The project is split into 4 roles. Each developer (and their AI) owns one or more roles.
Roles map to folders — stay in your folder unless coordinating a cross-role change.

| Role | Primary Folder(s) | Owns |
|------|-------------------|------|
| **UI Agent** | `src/components/monitor/` | Student monitor layout, all visual components |
| **Simulation Agent** | `src/lib/ecg/`, `src/hooks/useDefibSequence.ts`, `src/hooks/useCPRTimer.ts` | ECG canvas engine, rhythm data, defib state machine |
| **Realtime Agent** | `src/lib/supabase/`, `src/lib/realtime/`, `src/hooks/useMonitorState.ts`, `src/hooks/useInstructorChannel.ts` | Supabase schema, Broadcast events, Presence |
| **Instructor Agent** | `src/components/instructor/`, `src/store/instructorStore.ts` | Instructor panel UI, draft/send state, scenario builder |

---

## Role 1 — UI Agent

### Responsibilities
- Build and maintain all components in `src/components/monitor/`
- Pixel-accurate reproduction of the Zoll X Series display (reference: `screenshots/SCREENSHOTS_SUMMARY.md`)
- Handle all popups/modals on the monitor side: `PatientModeModal`, `PatientInfoModal`, `AlarmOverlay`
- Manage routing into `TwelveLeadPage` (overlay behavior)
- Consume incoming state from `useMonitorState` (provided by Realtime Agent) — never fetch Supabase directly
- Wire alarm visual (`AlarmOverlay`) from `useAlarm` hook (provided by Simulation Agent)

### Does NOT own
- Supabase calls (ask Realtime Agent)
- ECG canvas draw logic (ask Simulation Agent)
- Instructor panel components (ask Instructor Agent)

### Key props contract
Every monitor component receives vitals as a single typed object:
```typescript
// From src/types/vitals.ts
type VitalsSnapshot = {
  hr: number               // bpm
  bp_sys: number           // mmHg
  bp_dia: number           // mmHg
  etco2: number            // mmHg
  spo2: number             // %
  rhythm: Rhythm           // 'nsr' | 'vf' | 'vt' | 'asystole' | 'pea'
  patient_mode: PatientMode // 'adult' | 'pediatric' | 'neonate'
  joules: number
  shock_count: number
  cpr_active: boolean
  etco2_mode: boolean
}
```

### Color constants (use these, never hardcode hex elsewhere)
```typescript
// src/lib/constants.ts  (UI Agent creates this)
export const COLORS = {
  bg:      '#000000',
  ecgGreen:  '#00ff41',
  cyanBP:    '#00ffff',
  purpleEtCO2: '#cc44ff',
  yellowSpO2:  '#ffff00',
  alarmRed:  '#ff2020',
  pendingAmber: '#ffaa00',
  bottomBar: '#1a1a1a',
  sidebarBg: '#0d0d0d',
}
```

### Layout rules
- Monitor is **always full-screen**: `w-screen h-screen overflow-hidden`
- Desktop-only: apply `min-w-[1024px]` at root layout
- No scrollbars on the monitor page ever
- Use CSS Grid for the main layout — do not use Flexbox for the top-level monitor grid
- `BottomStatusBar` + `DefibButtonRow` have fixed heights; `MainArea` fills remaining space with `flex-1`

---

## Role 2 — Simulation Agent

### Responsibilities
- Build and maintain `src/lib/ecg/rhythms.ts` and `src/lib/ecg/renderer.ts`
- Own the `ECGCanvas` component (inside `src/components/monitor/ECGCanvas.tsx`) — UI Agent imports it as a black box
- Own `useDefibSequence` hook — state machine for ANALYSE → CHARGE → SHOCK with timed delays
- Own `useCPRTimer` hook — counts up from 0 when CPR is active
- Own `useAlarm` hook — threshold checking, returns `{ alarmActive: boolean, silenceAlarm: () => void }`
- Own `src/lib/audio.ts`

### Does NOT own
- Supabase calls
- How the canvas result is positioned on screen (UI Agent handles sizing/positioning)
- Instructor panel UI

### Rhythm data format
```typescript
// src/lib/ecg/rhythms.ts
export type RhythmDef = {
  points: Float32Array     // normalized Y values ∈ [-1, 1], one full cycle
  bpmDriven: boolean       // true = cycle speed changes with HR input
  fixedCycleMs?: number    // required if bpmDriven = false
}

export const rhythms: Record<Rhythm, RhythmDef> = {
  nsr:      { points: Float32Array.from([...]), bpmDriven: true },
  vf:       { points: Float32Array.from([...]), bpmDriven: false, fixedCycleMs: 150 },
  vt:       { points: Float32Array.from([...]), bpmDriven: false, fixedCycleMs: 400 },
  asystole: { points: new Float32Array(200).fill(0), bpmDriven: false, fixedCycleMs: 1000 },
  pea:      { points: Float32Array.from([...same as nsr...]), bpmDriven: true },
}
```

### ECGCanvas props contract
```typescript
type ECGCanvasProps = {
  rhythm: Rhythm
  hr: number
  running: boolean       // false = pause loop (e.g., 12-lead page open)
  className?: string
}
```

### Defib state machine
```
idle
  → ANALYSE pressed → analysing (5000ms progress)
      → analysis complete → ready_to_charge
  → CHARGE pressed → charging (3000ms progress)
      → charged → ready_to_shock
  → SHOCK pressed → shock fires (broadcast defib_event) → idle
  → any cancellation → idle
```

### Alarm thresholds (do not change without updating PLAN.md)
```typescript
const ALARM_THRESHOLDS = {
  hr:    { low: 40,  high: 150 },
  bp_sys: { low: 90,  high: 200 },
}
```

---

## Role 3 — Realtime Agent

### Responsibilities
- Build and maintain all Supabase infrastructure: `src/lib/supabase/`, `src/lib/realtime/`, `supabase/migrations/`
- Own `useMonitorState` — subscribes to channel, returns live `VitalsSnapshot` + presence info
- Own `useInstructorChannel` — provides `sendVitals()`, `broadcastDefibEvent()`, `broadcastCPRToggle()` etc.
- Build `/api/session/create` and `/api/session/join` route handlers
- Manage Supabase Presence (instructor exclusivity, student count)
- Write and maintain `src/lib/supabase/types.ts` (regenerated via `supabase gen types typescript`)

### Does NOT own
- Any UI components
- Business logic beyond data transport

### Event type definitions (single source of truth)
```typescript
// src/lib/realtime/events.ts
export type BroadcastEvent =
  | { type: 'vitals_update';    payload: VitalsSnapshot }
  | { type: 'defib_event';      payload: { kind: 'analyse' | 'charge' | 'shock'; joules: number } }
  | { type: 'cpr_toggle';       payload: { active: boolean } }
  | { type: 'alarm_ack';        payload: { channel: 'hr' | 'bp' | 'all' } }
  | { type: 'scenario_activate'; payload: VitalsSnapshot }
```

### Channel naming
```typescript
const channelName = `session:${code}`   // e.g. "session:ABC123"
```

### Late-joiner recovery
```typescript
// useMonitorState.ts — on mount, before subscribing:
const { data } = await supabase
  .from('vitals_snapshots')
  .select('*')
  .eq('session_id', sessionId)
  .order('created_at', { ascending: false })
  .limit(1)
  .single()
// Then subscribe to channel for live updates
```

### Presence shape
```typescript
type PresenceState = {
  role: 'instructor' | 'student'
  joinedAt: number   // Date.now()
}
```

### Rules
- Instructor exclusive: on channel join, check if any presence entry with `role: 'instructor'` already exists. If yes, redirect to `/session/[code]/monitor` instead
- `vitals_update` always writes to DB (`vitals_snapshots` insert) AND broadcasts — never one without the other
- Transient events (`defib_event`, `cpr_toggle`, `alarm_ack`) are Broadcast-only, no DB write

---

## Role 4 — Instructor Agent

### Responsibilities
- Build and maintain all components in `src/components/instructor/`
- Own `src/store/instructorStore.ts` (Zustand)
- Wire instructor UI to `useInstructorChannel` (provided by Realtime Agent) — never call Supabase directly
- Implement the scenario builder and runner
- Implement the defib panel UI (consuming `useDefibSequence` from Simulation Agent)

### Does NOT own
- Supabase calls (ask Realtime Agent)
- Defib timing logic (ask Simulation Agent for `useDefibSequence`)
- Monitor-side components

### Zustand store shape
```typescript
// src/store/instructorStore.ts
type InstructorStore = {
  // Draft vitals (local, not yet sent)
  draft: Partial<VitalsSnapshot>
  pending: Record<keyof VitalsSnapshot, boolean>  // true = edited, not sent

  // Confirmed vitals (last sent state)
  confirmed: VitalsSnapshot | null

  // Actions
  setDraftField: (field: keyof VitalsSnapshot, value: unknown) => void
  confirmSend: () => void     // called after Send button → resets pending flags
  setRhythm: (rhythm: Rhythm) => void
}
```

### Send behavior (critical)
1. Instructor edits a vital field → `setDraftField()` → `pending[field] = true` → input changes to amber color (`COLORS.pendingAmber`)
2. Instructor clicks Send → `confirmSend()` → `pending` all reset to false → inputs return to normal color → `useInstructorChannel.sendVitals(draft)` called
3. Nothing is sent to students until Send is clicked — no optimistic updates

### CPR toggle behavior (exception to Send rule)
CPR toggle bypasses Send — it broadcasts `cpr_toggle` immediately via `useInstructorChannel.broadcastCPRToggle()`.

### Scenario state shape
```typescript
// src/types/scenario.ts
type ScenarioState = {
  name: string
  hr: number
  bp_sys: number
  bp_dia: number
  etco2: number
  spo2: number
  rhythm: Rhythm
  patient_mode: PatientMode
  duration_s?: number    // undefined = manual advance
}

type Scenario = {
  id: string
  session_id: string
  name: string
  timing_mode: 'manual' | 'timed'
  states: ScenarioState[]
}
```

---

## Coding Conventions (All Roles)

### File naming
- React components: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Lib/utility files: `camelCase.ts`
- Types: `camelCase.ts` inside `src/types/`
- No `index.ts` barrel files — always import by full filename

### Component rules
- All components are functional, use hooks — no class components
- Props interfaces defined inline or at top of file, named `[ComponentName]Props`
- No inline styles — Tailwind only, with `cn()` helper (`clsx` + `tailwind-merge`) for conditional classes
- Server Components by default in Next.js App Router; add `'use client'` only when needed (event handlers, hooks, canvas, audio)

### TypeScript
- No `any` — use `unknown` with narrowing if needed
- All Supabase query results typed via generated types from `src/lib/supabase/types.ts`
- All broadcast event payloads use the union type from `src/lib/realtime/events.ts`

### Imports
```typescript
// Order: 1. React/Next, 2. External packages, 3. Internal @/* aliases, 4. Relative
import { useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { cn } from '@/lib/utils'
import { VitalBox } from './VitalBox'
```

### Env variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```
Never hardcode these. Never commit `.env.local`.

### Git
- Branch per phase: `phase/1-scaffolding`, `phase/2-routing`, etc.
- Commit format: `[role] short description` — e.g., `[realtime] add vitals_update broadcast handler`
- Update `STATUS.md` and `CHANGELOG.md` in every PR

---

## Mandatory Team Rules (All Roles, All Agents)

These rules are non-negotiable. Every developer and AI assistant must follow them without exception.

### 1. Track completion in STATUS.md
When any feature, phase, component, hook, or task is finished:
- Mark it as completed in `STATUS.md`
- Add an entry to `CHANGELOG.md` (append at top, with date and role prefix)
- If a phase milestone from `PLAN.md` is reached, note it in both files

Do not consider a task "done" until it is recorded. Undocumented work does not exist.

### 2. Record all requirement changes in PLAN.md
If any requirement changes — scope, behavior, UI, data shape, threshold, timing, anything:
- Update the relevant section in `PLAN.md` immediately
- Note what changed and why in `CHANGELOG.md`
- Notify the team before implementing the change

Do not implement a changed requirement without updating the plan first.

### 3. Write tests for every feature
No feature is complete without tests. This applies to every component, hook, utility function, and API route:
- Write tests alongside the feature, not after
- Tests live in `__tests__/` beside the file being tested, or in `src/__tests__/` for integration tests
- Add a "Testing" subsection to the relevant phase in `PLAN.md` when starting that phase
- A feature with no tests is considered incomplete regardless of whether it works

If a feature is not testable as written, raise it with the team before merging.

### 4. Clarify before implementing in Agent Mode
Before writing any code in an autonomous/agent session:
- Confirm that requirements are fully understood
- Identify and resolve any ambiguity — do not guess or assume
- State your implementation plan and get explicit confirmation from the programmer
- If anything is unclear mid-implementation, stop and ask rather than guess

This rule prevents wasted work and diverging implementations across team members.

---

## How Roles Interact (Data Flow)

```
INSTRUCTOR AGENT                    REALTIME AGENT
  instructorStore.draft
    ↓ (Send clicked)
  useInstructorChannel
    .sendVitals(draft) ────────────► Supabase Broadcast 'vitals_update'
                                     + INSERT vitals_snapshots
                                           ↓
                                     useMonitorState (subscribed)
                                           ↓
SIMULATION AGENT                    UI AGENT
  ECGCanvas ◄── rhythm, hr ─────── MonitorContext.vitals
  useAlarm  ◄── hr, bp_sys ──────── MonitorContext.vitals
  useDefibSequence ◄─────────────── DefibButtonRow (UI Agent renders, Sim Agent provides logic)
  useCPRTimer ◄──────────────────── CPRToggle broadcasts → useMonitorState delivers cpr_active
```

### Cross-role rules
1. **UI Agent never imports from `src/lib/supabase/` or `src/lib/ecg/`** — only from hooks and types
2. **Simulation Agent never imports from `src/components/`** — logic is framework-agnostic
3. **Realtime Agent never contains business logic** — it transports, it does not transform
4. **Instructor Agent never writes to Supabase directly** — always goes through `useInstructorChannel`
5. When two roles need to agree on a type change, update `src/types/` first, then both sides

---

## Reference Files

| File | Purpose |
|------|---------|
| `PLAN.md` | Development phases, folder structure, milestones |
| `STATUS.md` | Current state of the build — what's done, in progress, blocked |
| `CHANGELOG.md` | Append-only log of completed changes |
| `screenshots/SCREENSHOTS_SUMMARY.md` | Full UI reference extracted from Zoll X Series photos |
