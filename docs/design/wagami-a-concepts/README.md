# Wagami A — Phase A1 Concept Previews

**Current amendment (2026-09-15):** The programmer accepted a new pre-A4 shell-control,
navigation, and Vital Log decision pack. [Precision Graphite shell-controls v3](./precision-graphite-shell-controls-v3.png)
is the updated **programmer-approved A3.1 visual direction**, with its [review spec](./precision-graphite-shell-controls-v3-spec.md).
The code/test implementation and [rendered QA with 1024/1536 screenshots](./a3-1-rendered-qa.md)
were accepted as done. A4 onward is reserved for the [collaborator handoff](../../handoff/wagami-a-a4-onward.md).
The older A1 descriptions below are historical and
their left-Charge/lower-right-Shock/touch-Analyze/touch-mute/Print-Capture placements are
superseded by the current amendment in `PLAN.md`. Neither older concept nor X/Z was deleted.

Status: three original bitmap concepts and three non-destructive right-dock revisions generated
for user review on 2026-09-15. The programmer selected Precision Graphite v2 as the visual
direction; exact palette values and formal fit/scorecard sign-off remain open. These are decision
aids, not application code, clinical specifications,
or IP clearance. No ZOLL photograph, video frame, X/Z concept, or supplied media was used as an
image-generation reference.

**First-pass defect and correction:** The original images hide six destinations behind a menu
icon. The user approved six labeled, simultaneous one-tap launchers in a 2×3 upper-right
touchscreen grid, with compact always-visible defibrillation status below. The v2 images depict
that correction; originals remain available for comparison. Precision Graphite v2 is selected.

**Destination-label correction (2026-09-15):** The v2 tile that visibly reads `ÉVÉNEMENTS`
is intended to be `Call Info`, opening the trainee Assignment dashboard/caller-information
workflow. The user asked to keep the images; their pixels are not the accepted destination name.
The medication Event Log remains within Medications and does not get a seventh launcher.
Final French/English label copy will be chosen and verified in the bilingual implementation.

## Common generation prompt

Create a realistic, straight-on, full-device, high-fidelity UI/product mockup of a fictional
WAGAMI A rugged field-tablet monitor on a neutral studio backdrop. Keep a matte-charcoal
asymmetric protective shell and almost edge-to-edge dark-slate landscape screen. Show top vital
cards in FC, SpO₂, PNI, EtCO₂ order; a large ECG trace; smaller SpO₂ and EtCO₂ traces; no blank
PNI waveform; and a narrow right-side defibrillation *status* pane with touch Analyze and energy
selection. Put physical Power at the top-right shell edge, physical Charge at the left shoulder,
physical protected red Shock at the lower-right shell corner, and a small white ready LED at the
upper-left shell. Include one contextual-menu entry point. Make clinical labels short and French;
reserve red for alarm and Shock. Avoid source branding, blue rounded/metallic housings, seven left
keys, right physical-button stacks, bottom physical defib rows, top/bottom touchscreen ribbons,
extra buttons, cropped edges, cables, and watermarks.

## Variant prompts and outputs

**[Field Slate](./field-slate.png)**: Graphite/charcoal body with strong asymmetric chamfers and
subtle ribbed edge texture; technical but readable typography; restrained mint ECG, muted amber
SpO₂, soft lavender EtCO₂, and ice-blue PNI. The visual target was a durable, direct field tool.

**[Rescue Neutral](./rescue-neutral.png)**: Softer asymmetric chamfers, charcoal elastomer body with
secondary warm-sand protective inlays, flush tactile controls, and approachable humanist type;
seafoam-teal ECG, muted honey SpO₂, dusky mauve EtCO₂, and parchment-ice PNI. The visual target
was durable clinical clarity rather than militaristic styling.

**[Precision Graphite](./precision-graphite.png)**: Faceted graphite composite, inset grips,
minimal black-aluminum accents, precise wide numerals, crisp card outlines, cool-aqua ECG,
brass-yellow SpO₂, periwinkle EtCO₂, and pale-cyan PNI. The visual target was precision and
speed without futuristic styling.

## Right-dock revisions (built-in image edit, no ZOLL reference input)

**[Field Slate v2](./field-slate-v2.png)**: preserves the angular charcoal shell and physical
Power/Charge/Shock; replaces the menu with all six visible French-labeled task tiles at the
upper-right of the screen. The defibrillation status remains below the grid and now depicts
uncharged/non-ready state rather than a button-like ready-state block.

**[Rescue Neutral v2](./rescue-neutral-v2.png)**: preserves the warm-neutral bumpers and
physical controls; shows the same six-tile dock over defibrillation status, corrects the
charge/readiness illustration to 0%/non-ready, and removes the duplicate lower wordmark.

**[Precision Graphite v2](./precision-graphite-v2.png)**: preserves the graphite faceting,
precision type, and physical controls; replaces overflow dots with the six-tile dock and
corrects the 80%-charge/shock-ready contradiction to 0%/non-ready.

Edit prompt set: one first-pass image was used as the edit target for its own v2 revision only.
Each prompt locked shell geometry, material, camera, three physical control locations, alarm
LED, vital strip, and three waveform lanes; changed only the display's right column to a
permanent 2×3 French-labeled task grid above compact defibrillation status. The prompts
explicitly prohibited hidden menus, left key banks, touchscreen Power/Charge/Shock, outer-shell
task stacks, and extra logos. Rescue and Precision prompts also corrected their identified
illustrative defects. The built-in image-generation tool was used; no CLI/API fallback.

**Selection (2026-09-15):** Use Precision Graphite v2 for A's next design/specification phase.
Keep its faceted graphite shell, crisp outlined cards, technical but legible hierarchy, and
well-separated outer-shell physical controls. Field Slate and Rescue Neutral are retained as
alternatives and comparison references, not removed. The v2 `ÉVÉNEMENTS` label is superseded by
Call Info. This selection is not approval of bitmap touch-target dimensions, exact color values,
missing PNI/audio quick actions, clinical values shown in the image, or public IP clearance.

## Review cautions

- The first-pass Field Slate's gray `CHOC PRÊT` block looks button-like; the implemented A must show passive
  shock-ready status, not a touchscreen Shock action.
- The first-pass Rescue Neutral duplicates the `WAGAMI A` wordmark. A final design should place it once.
- The first-pass Precision Graphite illustrates `80%` charge with `PRÊT À CHOC`; those states contradict the
  agreed clinical state machine and must not be copied into implementation.
- Generated values, tiny labels, waveform morphology, and process states are illustrative only.
  Clinical behavior comes from the accepted plan and tests, not pixels in these mockups.
- All v2 task labels are visible, but a bitmap cannot establish actual 44×44 CSS-pixel iPad
  targets, accessible names, responsive fit, or navigation behavior. Those require code and
  real-device testing. V2s also do not depict the separate always-available PNI-read and
  global-audio-mute quick actions; those remain explicit requirements in `PLAN.md`, not omissions
  permitted for the release UI. The labels' line lengths and screen fit need implementation QA.

Review all three for clinical readability, one-tap usability, physical-button clarity, landscape
iPad fit, and overall distinction from X and Z. A concept that fails clinical readability or
button clarity is rejected regardless of its aesthetic appeal. The user chooses the concept;
qualified IP review is a separate release gate.
