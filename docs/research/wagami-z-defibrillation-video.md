# Wagami Z Defibrillation Video Reference

## Source and scope

- Source: [Zenix EMS Instructional Video — Defibrillation (Manual & AED Modes)](https://www.youtube.com/watch?v=G2h1zBDfhk0)
- Inspected: 2026-08-27
- Duration: 4:08
- Reference use: physical anatomy, touchscreen layout, visual state hierarchy, and future workflow discovery
- Project override: the simulator uses `WAGAMI` and `Z`, French copy, a two-second white-wordmark boot, and the functionality explicitly defined in `PLAN.md`.
- Repository policy: source-video frames, original reference images, transcript exports, and reference-derived concept PNGs remain local-only and are excluded from version control. The timestamps below identify the corresponding source-video states without redistributing the captures.

The video covers defibrillation workflows rather than the entire monitoring feature set. Its page copy and narration are reference material only; they do not expand the current implementation scope.

## Stable device anatomy

- The front shell has a rounded blue outer bumper, a pale grey face, a recessed black touchscreen bezel, and a blue lower base with a centered speaker grille.
- The top-left hardware area contains a circular power control and two small status indicators.
- A horizontal status/light window sits above the screen near the right side, followed by a small sensor aperture.
- The right hardware rail contains an orange `SHOCK` control, a smaller grey `CHARGE` control, and a large black rotary control.
- The touchscreen uses a thin metadata row, a top navigation row, waveform/vital space, optional defibrillation dashboards, and a persistent bottom action row.

## Baseline advanced-monitoring state

The user's still image corresponds to AED mode paused for advanced monitoring. In that state:

- `AED` remains selected in purple even though continuous AED analysis is paused.
- `MANUAL`, the alarm control, and the patient category remain in the top navigation row.
- ECG, EtCO2, and SpO2 occupy stable horizontal waveform lanes.
- HR, EtCO2, SpO2, and NIBP values form a narrow right column.
- The bottom row contains the app grid, NIBP, marker, print, snapshot, 12-lead, analyze, and energy controls.
- The large AED analysis/CPR dashboard is absent, maximizing waveform space.

This is the visual baseline for the first Wagami Z implementation. The simulator's controls remain inert except for power, so it does not enter the additional dashboards described below.

Representative timestamps:

- `03:15` — Full advanced-monitoring view
- `03:20` — Waveform and vital detail
- `02:59` — Paused AED state with bottom actions

## Power sequence

1. The powered-off touchscreen is completely black.
2. Power-on presents a large centered manufacturer wordmark on black.
3. The real device changes its upper status light during startup.
4. AED startup proceeds to a `CHECK PADS` monitoring state before analysis.

Project-specific differences are intentional: `WAGAMI` replaces the source brand, the wordmark is white, boot lasts two seconds, and normal dispatch entry starts powered off while `/?dev=2` starts already on.

Representative timestamps:

- `01:55` — Powered off
- `02:01` — Centered startup wordmark
- `02:08` — AED check-pads state

## Manual defibrillation workflow

The video presents manual defibrillation as a three-step workflow:

1. Confirm the selected energy. Manual mode is orange, the bottom energy control remains visible, and a large orange defibrillator dashboard appears beneath the waveforms.
2. Press the physical Charge control. The dashboard shows a charging energy value and exposes a red disarm action.
3. Press the physical Shock control. The dashboard shows delivered energy, increments the shock counter, and may display the next automatically escalated energy.

The charged device can be disarmed through the touchscreen, by changing energy, or by allowing the charge to expire. These actions are future behavior and are not part of the inert-control increment.

Representative timestamps:

- `01:00` — Manual monitoring before the dashboard
- `01:03` — Energy-selection step
- `01:10` — Charging dashboard and disarm action
- `01:16` — Delivered-energy dashboard
- `01:29` — Selected-energy state
- `01:39` — Disarmed state

## AED workflow

The AED sequence uses purple dashboard accents and changes the center-lower screen while retaining the top navigation, waveforms, right-side vitals, and bottom controls:

1. Startup requests pad attachment.
2. Analysis displays prominent stand-clear and analyzing messages plus shock count and selected energy.
3. If a shock is advised, the physical Shock control is used and delivered energy is shown.
4. CPR replaces the analysis dashboard with a purple CPR band containing a CPR timer and feedback metrics.
5. Analysis later stops CPR and either advises another shock or reports that no shock is advised.
6. A Pause control suspends automatic AED analysis and exposes the advanced-monitoring baseline.
7. Analyze restarts the cycle after a rearrest.

Representative timestamps:

- `02:15` — Stand-clear analysis dashboard
- `02:24` — Shock-advised/delivered state
- `02:31` — CPR feedback dashboard
- `03:29` — Analysis over all monitoring channels
- `03:45` — Later CPR feedback state

## Mode switching

Selecting `MANUAL` while AED is active opens a centered confirmation dialog over the still-visible monitoring screen. The dialog asks whether to change to manual mode and supplies negative and affirmative actions. The confirmed mode uses orange navigation/dashboard accents instead of AED purple.

This modal and mode transition are documented for future work but remain inactive in the first Wagami Z implementation.

- `03:53` — Manual-mode confirmation dialog

## Current implementation boundary

The video confirms the planned shell geometry, baseline advanced-monitoring layout, top navigation, right vital strip, bottom touchscreen actions, physical-control placement, and centered boot wordmark. It does not authorize implementing the following deferred behaviors:

- manual/AED mode switching or its confirmation dialog;
- energy selection, automatic escalation, charging, disarming, or shock delivery;
- AED analysis prompts and state transitions;
- CPR timers or feedback dashboards;
- pause/restart analysis behavior;
- NIBP cuff behavior beyond the temporary immediate confirmed reading.

For the current increment, only power changes state. Every other visible control acknowledges hover, focus, and press without changing the simulator.
