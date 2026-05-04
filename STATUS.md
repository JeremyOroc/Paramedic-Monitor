# STATUS.md — Paramedic Monitor Build Status

> Updated with every commit. This is the single source of truth for what is done, in progress, and blocked.
> All team members and AI tools should read this before starting work.

---

## Current Phase
**Phase 1 — COMPLETE. Ready to begin Phase 2 (Landing Page + Session Routing).**

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

---

## In Progress
- Nothing yet — Phase 2 (Landing Page + Session Routing) is next

---

## Blocked / Needs Input
- [ ] **Supabase credentials** — Copy URL + anon key from your Supabase project into `.env.local` (copy from `.env.local.example`). Run `supabase/migrations/001_initial_schema.sql` in the Supabase SQL Editor. Enable Realtime on `vitals_snapshots` in the dashboard. Without this, Phase 2 API routes will not work.
- [ ] **Waveform videos** — Paramedic friend needs to share Google Drive videos for: SpO2, EtCO2, 12-lead per rhythm (NSR, VF, VT, Asystole, PEA), CPR animation, BP animation. Needed for Phase 5 and Phase 9.
- [ ] **Alarm thresholds** — Using: HR <40/>150 bpm, BP sys <90/>200 mmHg. Confirm with paramedic friend.
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
1. Add Supabase credentials to `.env.local` (see `.env.local.example`)
2. Run `supabase/migrations/001_initial_schema.sql` in the Supabase SQL Editor
3. Enable Realtime on `vitals_snapshots` in the Supabase dashboard
4. Implement Phase 2: Landing Page + Session Routing (see PLAN.md)
