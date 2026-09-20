# Wagami A — Precision Graphite Design Specification (A1 accepted)

**2026-09-15 amendment:** This remains the historical A1 record for the selected palette and
core screen hierarchy. Its left-shoulder Charge, lower-right Shock, touchscreen Analyze/mute,
clickable PNI card, and Print/Capture launcher are superseded by the accepted shell-control/
navigation/Vital Log amendment in `PLAN.md`. The
[v3 shell-controls concept](./precision-graphite-shell-controls-v3.png) and
[review spec](./precision-graphite-shell-controls-v3-spec.md) were **visually approved by the
programmer** for A3.1 code. Do not implement the older control-placement bullets below as
current A requirements.

Status: Precision Graphite v2, the exact A-only palette below, and both quick-action placements
were approved by the programmer on 2026-09-15. Staged A1→A2 scope was also approved. This is the
**accepted concept-level A1 specification**; code, rendered touch geometry, and real-iPad QA
remain future phases. The accepted original
concept is [`precision-graphite-v2.png`](./precision-graphite-v2.png); its illustrative numbers,
waveform morphology, `ÉVÉNEMENTS` tile, and missing quick actions are not binding. The fourth
task tile is **Call Info**, not Events; the medication Event Log stays inside Medications.

## Design-system extraction

- **Shell:** faceted matte graphite composite, asymmetric protective corners, almost
  edge-to-edge landscape touchscreen, narrow inset grips. No blue rounded housing or permanent
  left/right physical key bank. One WAGAMI A wordmark on the upper bezel.
- **Shell-only actions:** recessed Power at top-right edge, Charge on left shoulder, visibly
  protected red Shock at lower-right. A shell alarm LED sits at upper-left away from Power.
- **Live composition:** FC, SpO2, PNI, EtCO2 cards in that top order; large ECG lane, smaller
  SpO2 and EtCO2 lanes below; no empty PNI waveform. Six 2×3 labeled touchscreen tasks at the
  upper-right, with compact always-visible defibrillation state and Analyze/energy touch actions
  below. The center waveforms remain dominant.
- **Component families:** thin crisp rectangular vital/trace frames, separate task tiles with
  one original icon plus label, flat outlined defib actions, passive status rows, and textured
  shell-only physical buttons. Avoid large gradient/glow/rounded software cards.
- **Typography:** tabular/monospaced-looking numerals for vitals and energy; compact clear
  sans-serif UI chrome labels; two-line long task labels allowed without abbreviation that
  hides meaning. French default, English selectable in Configure. Text remains code-native.
- **Icon treatment:** precise high-contrast line/fill icons with consistent optical weight;
  a passive readiness mark is not a touchscreen Shock action. Channel colors communicate
  signal identity, while alarm/ready meaning also has text and icon.

## Approved centralized A palette

The values keep Precision's cool-aqua ECG, brass-yellow SpO2, pale-ice PNI,
periwinkle EtCO2, and charcoal screen. They intentionally differ from X's neon
green/yellow/cyan/purple constants. These are new A-only design tokens, not replacements for X/Z.
Calculated ratios use the standard sRGB relative-luminance formula against `screen` or `surface`;
they are checks of these color pairs, not proof that a complete UI is accessible.

| Token | Approved hex | Purpose | Ratio on screen / surface |
|---|---|---|---|
| `screen` | `#081014` | Deep graphite display | — |
| `surface` | `#0D1B20` | Vital/task/defib panels | — |
| `surfaceRaised` | `#14272F` | Pressed/selected states | 1.24 / 1.14 |
| `text` | `#F3F8FB` | Primary labels and readings | 17.94 / 16.43 |
| `mutedText` | `#B9CAD1` | Secondary labels | 11.36 / 10.41 |
| `border` | `#517380` | Necessary panel/control outlines | 3.76 / 3.44 |
| `ecg` | `#65E5D9` | ECG waveform/FC | 12.57 / 11.52 |
| `spo2` | `#FFE082` | Pleth/SpO2 | 14.83 / 13.59 |
| `pni` | `#C6ECFF` | PNI reading | 15.39 / 14.10 |
| `etco2` | `#AAA6FF` | Capnography/EtCO2 | 8.78 / 8.04 |
| `alarm` | `#FF5656` | Alarm text/icon/LED-onset meaning | 6.14 / 5.62 |
| `pending` | `#E6B55C` | Pending/analysis-in-progress text | 10.17 / 9.31 |
| `shockShell` | `#D62B2B` | Physical Shock button fill only | 4.95 with white label |

The W3C's [normal-text contrast criterion](https://www.w3.org/WAI/WCAG22/quickref/#contrast-minimum)
uses 4.5:1, and [non-text contrast](https://www.w3.org/WAI/WCAG22/understanding/non-text-contrast.html)
uses 3:1 for essential graphical boundaries. Targets will aim for at least 44×44 CSS pixels
where the shell fit permits, matching the W3C's
[enhanced target-size guidance](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html);
the WCAG 2.2 [minimum criterion](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
is 24×24 CSS pixels with specified exceptions. Actual fonts, antialiasing, trace line thickness,
disabled states, overlays, and real-iPad targets still need rendered/physical testing.

## Required corrections to the concept before release UI

- Replace the v2 tile's `ÉVÉNEMENTS` concept pixels with a code-native Call Info label in the
  chosen Device language. It opens the existing full-screen trainee Assignment dashboard.
- **Approved PNI action:** the PNI vital card itself is the one-tap Start PNI reading control;
  Configure separately owns PNI settings. The card must advertise its action and disabled state
  accessibly, not look like a passive numeric display.
- **Approved global-audio action:** put an always-visible labeled touch target in the waveform
  workspace header immediately left of the right task dock, paired with alarm text/icon; carry
  an equivalent persistent target into 12-lead and secondary views. It mutes **all device cues**,
  not just alarm audio, and never hides the on-screen alarm.
- Touchscreen energy minus/plus and Analyze stay in defib status; physical Charge/Shock/Power
  never appear as touchscreen actions. Charge progress, shock readiness, and CPR time remain
  passive status, not fake buttons.
- Fix any long label wrapping or clipped status discovered at 1024×768, 1180×820, and desktop
  viewports; do not reduce target hit area just to fit illustrated typography. The concept's
  approximately 105×95-pixel task tiles would scale to roughly 70×60 CSS pixels if the shell
  fit is approximately two-thirds of the native image width at 1024px, but that is only a
  visual estimate. Rendered hit boxes, safe-area containment, and a real-iPad touch pass are
  required.

## Five-criterion A1 concept-level sign-off (2026-09-15)

| Criterion | Concept-level result and evidence | Remaining implementation gate |
|---|---|---|
| Clinical readability | PASS at concept level: large values and waveform lanes dominate; approved channel/text pairs have high calculated contrast. | Render French/English copy, alarm/CPR/charging states, and small labels. |
| One-tap usability | PASS at concept level: six tiles are simultaneously visible in v2; defib actions remain visible below; PNI/audio placements are now specified. | Implement and test one-tap destinations, PNI/audio actions, and actual hit boxes. |
| Physical-button clarity | PASS at concept level: three differently placed shell controls; protected lower-right Shock is separate from screen. | Render/press QA, guard testing, and iPad accidental-touch spacing. |
| Landscape-iPad fit | PASS as a proposed composition only: full shell and screen are uncropped; task tiles appear plausibly large after uniform fit. | Browser at accepted viewports and physical iPad; no claim of actual fit from bitmap. |
| X/Z distinction | PASS structurally at concept level: A uses faceted graphite field-tablet, top vitals, large center trace, right task/status grid, and three shell controls; X uses left soft-key bank and Z uses top/bottom touch ribbons with a right physical-control stack. | Side-by-side rendered review and qualified Canadian IP review before public release. |

This five-part review closes A1 as a **concept decision**, not as a rendered device or IP sign-off.
The image-generation edit changed A's six-group access but did not use any ZOLL photo or X/Z
image as an edit input. Visual distinctness is an engineering review result, not legal clearance.

## Next implementation inventory (A2, after A1 approval)

1. Extend the model union/normalizer and version-1 Saved scenario round-trip for Wagami A;
   missing legacy model stays Wagami X. Update projection/report type and validation paths so
   A cannot silently normalize to X.
2. Prepare a forward persistent-report model-check migration and update generated app types;
   test it locally. Do not apply it to production merely because A2 has begun, and do not
   start an A Attempt before the constraint and report readback are verified.
3. Add an isolated `/?dev=3` powered-on A preview with visible `PREVIEW`, dispatch bypass,
   no Room join, and no live Instructor model-selection option. Keep X as the development
   default. A3 will supply the faithful shell/live display rather than shipping bitmap UI.
4. Add tests beside each changed type/utility/component/route, plus integration tests for
   legacy X/Z scenarios, A preview gating, unknown-model fallback, projection/report contract,
   and absence of live A selection. Update `PLAN.md`, `STATUS.md`, and `CHANGELOG.md` with
   actual phase outcomes.

Before any Next.js or Supabase code, follow the repository's current Next docs and the current
Supabase changelog/documentation. A2 implementation is separate from this design proposal.

## A2 concept-to-preview fidelity ledger (2026-09-15)

The code-native `/?dev=3` preview is a construction-stage route, not the approved production UI.
Rendered checks at 1024×768 and 1366×768 found the preview screen/dock inside the viewport and
no document overflow. The A-only colors, top four-card order, dominant ECG workspace, smaller
secondary lanes, 2×3 right task grid, separate defib status, and visible `PREVIEW` are represented.
The fourth tile correctly reads `Info appel`; the approved bitmap's `ÉVÉNEMENTS` pixels remain
superseded. Placeholder dashes, blank traces, and non-interactive task/Charge/Shock labels are
deliberate and explicitly marked non-clinical, not release controls. A3/A4 must replace them with
real device-shell controls and monitor behavior; A5 adds completed task destinations, PNI/audio
quick actions, language, and LED settings.

| Comparison point | A2 rendered preview | Accepted concept / later gate |
|---|---|---|
| Shell | Graphite frame and top alarm marker only. | Faceted original shell and physical Power/Charge/Shock buttons in A3. |
| Vital strip | FC/SpO2/PNI/EtCO2 order and A palette retained; values are `--`. | Live values, units, states, and PNI one-tap action in A3/A5. |
| Waveforms | ECG lane dominates; two smaller lanes are present but blank. | Continuous clinical traces and state parity in A3/A4. |
| Right dock | All six destinations are visibly named in two columns; no inert button semantics. | Functional one-tap tiles and Call Info routing in A5. |
| Defib/alarm | Separate passive status and shell-position labels; no clinical actuation. | State machine, physical control guards, LED/text/alarm continuity in A3–A5. |

This A2 visual check is not an A1 five-criterion rerating, physical-iPad approval, or IP clearance.
