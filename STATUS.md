# STATUS.md — Paramedic Monitor Build Status

> Updated with every commit. This is the single source of truth for what is done, in progress, and blocked.
> All team members and AI tools should read this before starting work.

---

## Current Phase
**Phase 3 — Planning Complete. Ready to begin Phase 1 (Scaffolding).**

---

## Completed
- [x] Requirements gathering (Phases 1–2 of project planning)
- [x] Zoll X Series UI reference documented (`SCREENSHOTS_SUMMARY.md`)
- [x] Architecture designed (layers, component tree, state, realtime, ECG strategy)
- [x] `PLAN.md` — full development plan with 11 phases
- [x] `AGENTS.md` — role definitions, conventions, data flow contracts
- [x] `STATUS.md` — this file
- [x] `CHANGELOG.md` — history log

---

## In Progress
- Nothing yet — scaffolding not started

---

## Blocked / Needs Input
- [ ] **Waveform videos** — Paramedic friend needs to share Google Drive videos for: SpO2, EtCO2, 12-lead per rhythm (NSR, VF, VT, Asystole, PEA), CPR animation, BP animation. Without these, Phase 5 and Phase 9 (BP animation) cannot be completed.
- [ ] **Rhythm list completeness** — Confirmed: NSR, VF, VT, Asystole, PEA. To be expanded if paramedic friend requests more.
- [ ] **CPR waveform** — Confirmed: CPR = blue banner overlay (no waveform change needed). Awaiting paramedic friend confirmation.
- [ ] **Alarm thresholds** — Using: HR <40/>150 bpm, BP sys <90/>200 mmHg. Confirm with paramedic friend.
- [ ] **Neonate joule default** — Set to 10J based on clinical standard. Confirm with paramedic friend.

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
1. Run `create-next-app` → see PLAN.md Phase 1 for exact commands
2. Create Supabase project, copy keys to `.env.local`
3. Run `supabase/migrations/001_initial_schema.sql`
4. Scaffold empty files per folder structure in PLAN.md
5. Ping the group about getting the video files from the paramedic's Google Drive
