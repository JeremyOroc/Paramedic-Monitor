# Paramedic Monitor

Paramedic Monitor is an instructor-led dispatch and patient-monitor simulation. Its language distinguishes the selected training device from the clinical state shown to the trainee.

## Language

**Instructor Console**:
The authoring surface where an instructor prepares scenarios and controls an attempt.
_Avoid_: Dev Console, Admin console

**Instructor display**:
The MacBook or desktop monitor that ordinarily presents the Instructor Console; a landscape iPad 8th generation is a supported secondary presentation surface.
_Avoid_: Training display, dev display

**Saved scenario**:
A named instructor-authored clinical and dispatch snapshot stored in the scenario library.
_Avoid_: Template, preset

**Loaded scenario**:
The saved scenario currently populating the Instructor Console authoring fields for review or editing.
_Avoid_: Selected scenario, active scenario

**Scenario draft**:
Local scenario authoring state that has not yet been stored in the scenario library.
_Avoid_: Unsaved scenario, temporary scenario

**Scenario folder order**:
The instructor-defined global sequence of scenario folders, independent of the order of saved scenarios inside each folder.
_Avoid_: Alphabetical folder order, scenario order

**Room**:
The join-coded space one instructor opens for their trainees. It holds every attempt run in it and the evaluation record of each, and both end when the instructor closes it.
_Avoid_: Session, lobby, class

**Attempt**:
A single instructor-led dispatch simulation run whose confirmed scenario and defibrillator model remain fixed until the attempt ends.
_Avoid_: Drill, run, session

**Spectator view**:
A host-authorized, read-only reproduction of one trainee's current simulator presentation, shown either inside the Instructor Console or as a standalone page. It follows the attempt's confirmed defibrillator model without sharing browser chrome or pointer location.
_Avoid_: Remote monitor, screen share, instructor monitor

**Embedded Spectator**:
The single selected trainee's Spectator view inside the Instructor Console. It can be Docked,
Floating, or Fullscreen without changing the selected trainee or starting another projection poll.
_Avoid_: Preview, mini monitor, Live Evaluation

**Docked Spectator**:
The Embedded Spectator in its normal position beside the Instructor Console room controls.
_Avoid_: Default window, inline player

**Floating Spectator**:
The same Embedded Spectator presented as a fixed bottom-right mini-player while the instructor uses
the rest of the console. Its corner may become movable in a future enhancement.
_Avoid_: Picture-in-picture, separate window, detached stream

**Fullscreen Spectator**:
The same Embedded Spectator occupying browser-native fullscreen and returning to its prior Docked or
Floating mode when fullscreen ends.
_Avoid_: Expanded preview, CSS fullscreen

**Trainee monitor projection**:
A point-in-time description of the trainee-specific simulator state needed to reproduce a Spectator view, including local interaction and timed-progress state.
_Avoid_: Event replay, screen capture, shared monitor state

**Projection freshness**:
How current a trainee monitor projection is relative to the trainee's latest accepted simulator state. It is distinct from trainee presence and the Spectator presentation's own connection to the server.
_Avoid_: Connection status, participant presence

**Evaluation record**:
Everything a room stores about an attempt for the instructor to review afterward: each trainee action in order, the confirmed clinical state it was taken against, and each change the instructor sent. It presents; it does not grade.
_Avoid_: Report data, session log, history

**Instructor change**:
One Send by the instructor as the evaluation record shows it: the difference from the previous Send in that attempt. Every Send is its own instructor change, including a correction seconds after the last one; the opening Send is the one instructor change with nothing before it.
_Avoid_: Instructor row, state diff, send row, version

**Trainee action**:
A single thing the trainee did on the monitor that the evaluation record captures, such as a shock, a medication, or a blood-pressure reading.
_Avoid_: Student event, user action, click

**Confirmed defibrillator model**:
The Wagami device model locked to the current attempt after the instructor completes Save, Send, and Start / Dispatch.
_Avoid_: Active model, selected monitor

**Confirmed clinical state**:
The instructor-approved vital values, channel states, rhythm, patient category, and energy setting available to the trainee during an attempt.
_Avoid_: Draft vitals, admin inputs

**EtCO₂ calibration**:
The trainee-local Wagami X readiness state for capnography, distinct from the instructor-confirmed EtCO₂ channel state. It remains valid through instructor channel and value changes until the monitor is reset.
_Avoid_: EtCO₂ On, CO₂ selection

**Confirmed EtCO₂ channel state**:
The instructor-approved On/Off connectivity of capnography. Off represents a disconnected calibrated baseline; On provides the configured confirmed measurement.
_Avoid_: EtCO₂ calibration, CO₂ soft-key state

**SNS measurement option**:
One of the Instructor Console's `15s`, `30s`, or `Tap` actions for revealing a Pulse or Respiratory assessment result.
_Avoid_: Pulse button, Respiratory button, icon toggle

**SNS measurement countdown**:
A cancellable Pulse or Respiratory observation period started by a timed SNS measurement option.
_Avoid_: Scenario timer, dispatch countdown

**SNS measurement result**:
The Pulse or Respiratory assessment details revealed immediately by Tap or after an SNS measurement countdown completes.
_Avoid_: Pulse information, Respiratory information, finding slider

**Respiratory effort**:
The observed work of breathing described by findings such as unlabored or mildly labored.
_Avoid_: Respiratory strength

**Wagami X**:
The established Wagami defibrillator model whose controls provide the simulator's existing physical-button interactions.
_Avoid_: Old monitor, legacy monitor

**Resting vital layout**:
The Wagami X main-view placement used after power-on and before the first accepted physical Analyze or Charge action. FC, PNI, EtCO2, and SpO2 occupy four equal cells in the fixed bottom region; collapsing that region temporarily uses the defib vital layout.
_Avoid_: Apply Electrodes screen, default status bar

**Defib vital layout**:
The Wagami X placement used after the first accepted physical Analyze or Charge action and by specialized views. The same four vital displays occupy the right column, including beside the energy scale during charge states, until power-off/on, monitor reset, or New Attempt restores the resting vital layout.
_Avoid_: Charge-only layout, permanent vital strip

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
An explicitly supported non-mini iPad, ordinarily an iPad 8th generation, used in landscape orientation by a trainee to view a Wagami X or Wagami Z during an attempt. Full-screen Safari and standalone display modes are supported; narrow multitasking windows and portrait layouts are outside the monitor surface. iPad mini is not tested, certified, or optimized, although its device surface may render when its usable viewport passes the general capability threshold.
_Avoid_: Mobile display, tablet monitor
