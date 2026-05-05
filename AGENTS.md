# Paramedic Monitor — Agent & Role Definitions

## UI Conventions

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

## Reference Files

| File | Purpose |
|------|---------|
| `PLAN.md` | Development phases, folder structure, milestones |
| `STATUS.md` | Current state of the build — what's done, in progress, blocked |
| `CHANGELOG.md` | Append-only log of completed changes |
| `screenshots/SCREENSHOTS_SUMMARY.md` | Full UI reference extracted from Zoll X Series photos |