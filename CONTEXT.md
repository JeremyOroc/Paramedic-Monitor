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
A named instructor-authored clinical and dispatch snapshot stored as either a Personal scenario or a Template scenario.
_Avoid_: Preset

**Account**:
A verified instructor identity with a unique username and email that can authenticate, own Personal scenarios, and own Rooms. Trainees participate in Rooms without Accounts.
_Avoid_: User, trainee account, student account

**Invited Account**:
An instructor identity invited by a Product operator that has not yet completed its username and
password setup. It cannot enter ordinary authenticated product areas until invitation acceptance.
_Avoid_: Pending Account, public registrant

**Instructor**:
The ordinary Account role for preparing scenarios, creating Rooms, and conducting Attempts.
_Avoid_: Teacher role, standard user

**Administrator**:
An Account role with every Instructor capability plus authority to maintain the shared Template scenarios.
_Avoid_: Superuser, template owner

**Product operator**:
A maintainer who administers Accounts outside the application. A Product operator is not an application role and is distinct from an Administrator.
_Avoid_: Administrator, instructor admin

**Personal scenario**:
A Saved scenario visible and mutable only to its owning Account rather than shared through Templates.
_Avoid_: Private template, user scenario

**Template scenario**:
A shared Saved scenario in the permanent Templates collection, available to every Account and maintained by Administrators.
_Avoid_: Preset, global scenario

**My Scenarios**:
The Account's private scenario-library area, containing its Personal scenarios and folders.
_Avoid_: Personal folder, user library

**Templates**:
The fixed shared scenario-library area, containing Administrator-maintained Template scenarios and folders.
_Avoid_: Template folder, shared library

**Loaded scenario**:
The saved scenario currently populating the Instructor Console authoring fields for review or editing.
_Avoid_: Selected scenario, active scenario

**Scenario draft**:
Local scenario authoring state that has not yet been stored in the scenario library.
_Avoid_: Unsaved scenario, temporary scenario

**Scenario folder order**:
The Account-defined sequence of folders in My Scenarios or Administrator-defined sequence in Templates, independent of the order of Saved scenarios inside each folder.
_Avoid_: Alphabetical folder order, scenario order

**Room**:
The join-coded space owned by one Instructor Account and opened to Scenario devices. It holds every Attempt run in it and the Evaluation record of each.
_Avoid_: Session, lobby, class

**Scenario device**:
A training-device presentation that joins a Room and may be operated by one or more Trainees during a scenario. A Room ordinarily has one Scenario device, although it may contain several.
_Avoid_: Student, trainee, participant

**Trainee**:
A person participating in a scenario. One or more Trainees may share a Scenario device, so a Trainee is not inherently a Room member.
_Avoid_: Device, participant, Account

**Device nickname**:
The optional Room-scoped label identifying a Scenario device.
_Avoid_: Student name, trainee nickname, participant identity

**Attempt**:
A single instructor-led simulation lifecycle within a Room, beginning with Start / Dispatch and ending
with New Attempt or End Room. It may contain multiple Dispatch runs and Instructor changes while
retaining one Confirmed defibrillator model.
_Avoid_: Drill, run, session

**Dispatch run**:
One assignment of a Scenario device to an Incident scene under one dispatch countdown. The first
dispatch or an intentional Incident-scene/countdown change begins one; route calculation does not.
_Avoid_: Attempt, Send, route calculation

**Assignment dashboard**:
The trainee-facing dispatch surface that presents New Assignment at the beginning of an Attempt and
when CALL INFO is reopened later. It is distinct from the legacy classic caller-information view.
_Avoid_: Ambulance monitor alert, map page

**Full-screen hospital directory**:
The temporary expanded Assignment dashboard map and Receiving Hospital Directory. Leaving it restores
the embedded route map while preserving the Selected receiving hospital and active route.
_Avoid_: Maps page, second map screen, fallback map

**Incident scene**:
The caller address to which the unit responds during the Dispatch leg and from which the patient
departs during the Transport leg.
_Avoid_: Starting address, destination address

**Unit origin**:
The instructor-configured location from which the Dispatch leg begins. Changing it refines the route
within the current Dispatch run rather than assigning a new Incident scene.
_Avoid_: Incident scene, starting address

**Dispatch leg**:
The response route from the instructor-configured unit origin to the Incident scene.
_Avoid_: Initial route, first route

**Dispatch route enrichment**:
Derived coordinates, availability, distance, and geometry for a saved Unit origin and Incident scene.
It may arrive after dispatch without beginning another Dispatch run.
_Avoid_: Re-dispatch, incident edit, route change

**Transport leg**:
The trainee-local route carrying the patient toward the Selected receiving hospital. It begins at the
Incident scene, or at the unit's current position when the trainee reroutes after Transport begins.
_Avoid_: Hospital route, second route

**Receiving hospital**:
A hospital the trainee may select as the destination of the Transport leg.
_Avoid_: Hospital pin, new destination

**Selected receiving hospital**:
The Receiving hospital currently chosen by one trainee for the Transport leg of an Attempt. The
choice is independent for each trainee, may change while Transport is underway, becomes final at the
hospital, and is cleared when the Attempt, monitor, Dispatch run, or Incident scene changes; Unit-origin
and Dispatch route-enrichment changes do not clear it.
_Avoid_: Confirmed hospital, shared destination

**Receiving Hospital Directory**:
The curated set of 18 Montréal-area Receiving hospitals available to trainees: 16 adult hospitals
and 2 pediatric hospitals. Its names, designations, and notes are authored simulation curriculum,
while its routing locations come from reviewed institutional addresses. It is not a directory of
every hospital in Québec and does not claim to be current clinical-routing guidance.
_Avoid_: All Québec hospitals, nearby hospitals

**12-lead transmission destination**:
One of seven fixed hospital recipients to which a trainee may simulate sending a captured 12-lead.
It is independent of the Selected receiving hospital and does not change the Transport leg.
_Avoid_: Receiving hospital, transport destination

**Spectator view**:
A host-authorized, read-only reproduction of one Scenario device's current simulator presentation, shown either inside the Instructor Console or as a standalone page. It follows the attempt's confirmed defibrillator model without sharing browser chrome or pointer location.
_Avoid_: Remote monitor, screen share, instructor monitor

**Embedded Spectator**:
The single selected Scenario device's Spectator view inside the Instructor Console. It can be Docked,
Floating, or Fullscreen without changing the selected device or starting another projection poll.
_Avoid_: Preview, mini monitor, Live Evaluation

**Docked Spectator**:
The Embedded Spectator in its normal position beside the Instructor Console room controls.
_Avoid_: Default window, inline player

**Floating Spectator**:
The same Embedded Spectator presented as a corner-pinned mini-player while the instructor uses the
rest of the console. It begins at bottom-right and can be dragged or moved by keyboard among all four
corners without becoming a separate window.
_Avoid_: Picture-in-picture, separate window, detached stream

**Fullscreen Spectator**:
The same Embedded Spectator occupying browser-native fullscreen and returning to its prior Docked or
Floating mode when fullscreen ends.
_Avoid_: Expanded preview, CSS fullscreen

**Scenario device projection**:
A point-in-time description of one Scenario device's simulator state needed to reproduce a Spectator view, including local interaction and timed-progress state.
_Avoid_: Event replay, screen capture, shared monitor state

**Projection freshness**:
How current a Scenario device projection is relative to that device's latest accepted simulator state. It is distinct from device presence and the Spectator presentation's own connection to the server.
_Avoid_: Connection status, participant presence

**Spectator availability state**:
The instructor-facing assessment of whether a selected Scenario device's Spectator view can be trusted as live. Its precise states distinguish Room lifecycle, Spectator connectivity, device presence, and whether a Scenario device projection exists.
_Avoid_: Student status, trainee status, connection status, live badge

**Evaluation record**:
The persistent Account-owned report of one Attempt across all participating Scenario devices. It is
created when the Attempt starts, autosaves each Scenario device action, confirmed clinical state,
and Instructor change, and remains Incomplete until New Attempt or End Room completes it. Actions
from a shared device are not attributed to an individual Trainee. It presents; it does not grade.
_Avoid_: Report data, session log, history

**Student name**:
An optional Instructor-entered name attached to an Evaluation record for identifying a learner. It
is independent of the Device nickname used to join the Room and is not an Account. A record may
hold up to 100 Student names of up to 100 characters each; blank entries are discarded and duplicate
names are allowed. Entries are otherwise free-form and the application gives no inline privacy or
institution-approved-identifier guidance.
_Avoid_: Device nickname, student Account, participant identity

**Room controller**:
The single signed-in browser authorized to mutate an Account-owned Room. Other devices for the same
Account may observe the Room or explicitly take control, which makes the previous controller
read-only.
_Avoid_: Room owner, host token, primary Account

**Reports**:
The authenticated area containing the signed-in Instructor's complete and Incomplete Evaluation
records, retained until that Instructor permanently deletes them.
_Avoid_: Archive, room history, saved Rooms

**Incomplete Evaluation record**:
An Evaluation record whose Attempt started but was not completed through New Attempt or End Room.
It remains reviewable and editable in Reports. After its Room has ended or expired, its owner may
manually complete it without altering the recorded timeline.
_Avoid_: Draft report, live Room

**Evaluation scenario snapshot**:
The immutable scenario name, confirmed defibrillator model, and report-relevant configuration stored
with an Evaluation record when its Attempt starts. It keeps the record intelligible if the source
Personal scenario or Template is later edited or deleted.
_Avoid_: Linked scenario, current scenario

**Instructor change**:
One Send by the instructor as the evaluation record shows it: the difference from the previous Send in that attempt. Every Send is its own instructor change, including a correction seconds after the last one; automatic Dispatch route enrichment is not an Instructor change.
_Avoid_: Instructor row, state diff, send row, version

**Scenario device action**:
A single action captured from a Scenario device, such as a shock, a medication, or a blood-pressure reading. It does not identify which Trainee operated a shared device.
_Avoid_: Student event, trainee attribution, user action, click

**Confirmed defibrillator model**:
The Wagami device model locked to the current attempt after the instructor completes Save, Send, and Start / Dispatch.
_Avoid_: Active model, selected monitor

**Confirmed clinical state**:
The instructor-approved vital values, channel states, rhythm, patient category, and energy setting available to the trainee during an attempt.
_Avoid_: Draft vitals, admin inputs

**Waveform continuity**:
The trainee's live ECG, SpO₂, EtCO₂, and CPR compression traces remain part of the same patient-time
sequence while the monitor is temporarily not visible, including browser backgrounding and every
temporary monitor surface. Waveform re-entry is the moment that sequence becomes visible again: the
current sweep is ready at its final display geometry before the temporary surface leaves, reflects
elapsed real time, and contains no blank sweep, rewind, or false trace connecting moments that were
not observed continuously. A new Attempt, monitor reset, power cycle, newly confirmed signal, or
Off-to-On transition begins a new sequence; navigation does not. Each trainee and Spectator display
maintains its own continuous sweep phase. A full browser reload is outside this continuity guarantee.
_Avoid_: Hidden rendering, ECG restart, paused waveform

**Automatic FC lock**:
A rhythm-controlled clinical state in which FC is forced On and its rate is determined by the selected
ECG rhythm. The Instructor cannot edit the FC number or turn FC Off while the lock applies; leaving
the locked rhythm restores the prior manual FC value and channel state.
_Avoid_: Disabled FC, fixed alarm, monitor-only rate

**CPR interval**:
The two-minute compression period shown by Wagami X after its Perform CPR prompt phase following a no-shock analysis result or an advised shock. It is distinct from the Instructor CPR override and from the prompt/metronome cues that surround it.
_Avoid_: CPR override, SNS measurement countdown, dispatch countdown

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

**Wagami A**:
A new Wagami defibrillator model that coexists with Wagami X and Wagami Z. It presents the same
instructor-confirmed clinical scenario through a distinct device-like interaction design rather
than replacing Wagami X.
_Avoid_: Wagami X replacement, generic Wagami X

**Call Info destination**:
The Wagami A live-screen task that leads to the trainee's Assignment dashboard and caller
information. It is distinct from the medication Event Log.
_Avoid_: Events destination, Event Log tile

**Device language**:
The French or English Wagami A interface presentation selected on one Scenario device and mirrored
by its Spectator view for the current Attempt. It does not change instructor-confirmed clinical
state or the language of other Scenario devices.
_Avoid_: Scenario language, instructor language, Account language

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
A non-power Wagami Z control that visibly acknowledges pointing, focus, and pressing without changing monitor state, producing audio, or recording a Scenario device action.
_Avoid_: Disabled control, non-clickable control

**Development display**:
The occasional 1920×1080 desktop monitor used to build, inspect, and test the trainee monitor.
_Avoid_: Primary display, production monitor

**Training display**:
An explicitly supported non-mini iPad, ordinarily an iPad 8th generation, used in landscape orientation by a trainee to view a Wagami X or Wagami Z during an attempt. Full-screen Safari and standalone display modes are supported; narrow multitasking windows and portrait layouts are outside the monitor surface. iPad mini is not tested, certified, or optimized, although its device surface may render when its usable viewport passes the general capability threshold.
_Avoid_: Mobile display, tablet monitor
