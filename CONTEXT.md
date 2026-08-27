# Paramedic Monitor

Paramedic Monitor is an instructor-led dispatch and patient-monitor simulation. Its language distinguishes the selected training device from the clinical state shown to the trainee.

## Language

**Attempt**:
A single instructor-led dispatch simulation run whose confirmed scenario and defibrillator model remain fixed until the attempt ends.
_Avoid_: Drill, run, session

**Confirmed defibrillator model**:
The Wagami device model locked to the current attempt after the instructor completes Save, Send, and Start / Dispatch.
_Avoid_: Active model, selected monitor

**Confirmed clinical state**:
The instructor-approved vital values, channel states, rhythm, patient category, and energy setting available to the trainee during an attempt.
_Avoid_: Draft vitals, admin inputs

**Wagami X**:
The established Wagami defibrillator model whose controls provide the simulator's existing physical-button interactions.
_Avoid_: Old monitor, legacy monitor

**Wagami Z**:
The newer touchscreen-oriented Wagami defibrillator model. It displays the same live confirmed clinical state as Wagami X; its power control is functional while its remaining controls are intentionally inert in the first implementation.
_Avoid_: ZOLL, Zenix, Wagami-Z

**Inert control**:
A non-power Wagami Z control that visibly acknowledges pointing, focus, and pressing without changing monitor state, producing audio, or recording a trainee action.
_Avoid_: Disabled control, non-clickable control

**Development display**:
The occasional 1920×1080 desktop monitor used to build, inspect, and test the trainee monitor.
_Avoid_: Primary display, production monitor

**Training display**:
An explicitly supported non-mini iPad used in landscape orientation by a trainee during an attempt. Full-screen Safari and standalone display modes are supported; narrow multitasking windows and portrait layouts are outside the monitor surface. iPad mini is not tested, certified, or optimized, although its device surface may render when its usable viewport passes the general capability threshold.
_Avoid_: Mobile display, tablet monitor
