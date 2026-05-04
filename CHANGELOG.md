# CHANGELOG.md — Paramedic Monitor

> Append-only. Add a new entry at the TOP when completing work. Never edit past entries.
> Format: `## [YYYY-MM-DD] [role] — description`

---

## [2026-05-04] [planning] — Phase 3 complete: PLAN.md, AGENTS.md, STATUS.md, CHANGELOG.md created

- Created `PLAN.md` with 11 development phases, full folder structure, dependency list, and key decisions table
- Created `AGENTS.md` with 4 role definitions (UI, Simulation, Realtime, Instructor), coding conventions, data flow contracts, and props/type contracts per role
- Created `STATUS.md` with current build state, blocked items, and next steps
- Created `CHANGELOG.md` (this file)

---

## [2026-05-03] [planning] — Phase 2 complete: Architecture designed

- Defined 5-layer architecture: UI → Simulation Engine → Realtime Client → Supabase
- Component tree designed for both monitor and instructor views
- State split defined: local draft vs shared Supabase state
- Supabase schema designed: `sessions`, `vitals_snapshots`, `scenarios`
- Realtime strategy: Broadcast for live events, Postgres for late-joiner recovery
- ECG rendering strategy: canvas overwrite-scroll with Float32Array rhythm point data
- Waveform strategy: looped `<video>` for SpO2, EtCO2, 12-lead; canvas for main ECG

---

## [2026-05-03] [planning] — Phase 1 complete: Requirements gathered

- Reviewed all 17 Zoll X Series reference screenshots
- Documented full UI layout, color scheme, popup behavior, alarm thresholds
- Confirmed: video-loop strategy for non-ECG waveforms
- Confirmed: English language UI
- Confirmed: separate routes for instructor vs student
- Confirmed: CPR = blue banner overlay + timer (not waveform change)
- Created `SCREENSHOTS_SUMMARY.md` with per-screenshot UI/feature breakdown
