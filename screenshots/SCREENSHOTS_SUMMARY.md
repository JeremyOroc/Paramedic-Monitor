# Zoll Monitor Screenshots — UI/Feature Summary

---

## Screenshot 1 — Overview & Left Sidebar Buttons

**What it shows:** Full physical Zoll X Series device. The left sidebar buttons are highlighted in a red rectangle with annotations.

**Screen state:** Monitor showing "APPL. ÉLECT." (Apply Electrodes) yellow warning bar. Status bar top: `2026-04-0X | 08:07:01 | Adulte`. Timer top-right: `00:00:10` (green). Bottom bar: `Mode Adulte | 120 J Sélectionné | ⚡ | 0`.

**Right vitals strip (top to bottom):**
- FC (HR) — green
- PNI (NIBP) — cyan
- EtCO2 — yellow/purple label
- SpO2 — yellow label
- "Recherche" (searching) — bottom

**Left sidebar — 7 buttons (top to bottom):**
| # | Icon | Function | Important? |
|---|------|----------|-----------|
| 1 | Brightness | Toggle black/white background | No |
| 2 | 12-lead icon | Go to 12-lead page | **YES (yellow)** |
| 3 | CO2 icon | Calibrate EtCO2, adds number + graph | **YES (yellow)** |
| 4 | Medicine/cross | Medication list / time-stamping tool | No |
| 5 | "Analyse" | Analyze button (duplicate — not the main one) | No |
| 6 | Paper roll | Print paper (useless) | No |
| 7 | Back arrow | Return to previous page | **YES (yellow)** |

**Bottom physical buttons (labeled 1–3 + shock):**
1. `ANALYSE` (orange)
2. `SÉLECTION D'ÉNERGIE ▲▼` (orange, up/down arrows)
3. `CHARGE` (orange)
4. `CHOC` / Shock (large red button, lightning bolt)

**Notes for app:**
- Left sidebar buttons 2, 3, 7 are the only important ones to implement with full functionality
- Buttons 1, 4, 5, 6 are low priority / decorative
- The main ANALYSE button is the physical bottom button #1, NOT sidebar button #5
- "APPL. ÉLECT." warning bar appears when no ECG signal — needs to be implementable

---

## Screenshot 2 — Defib Pads, Shock Commands & Joules

**What it shows:** Same device, zoomed slightly. Two red rectangles highlight the on-screen status bar area and the physical bottom command buttons.

**Key insight — two red rectangles explained:**
1. **On-screen red rectangle** (bottom portion of display): Always visible on the main page. Shows `Mode Adulte | 120 J Sélectionné | ⚡ | 0`. Disappears ONLY when page changes (e.g., 12-lead view or medication page).
2. **Physical button red rectangle**: Highlights the 4 command buttons at the bottom of the physical device.

**Bottom status bar (always visible on main screen):**
- `Mode Adulte` — current patient mode (Adult/Pediatric/Neonate)
- `120 J Sélectionné` — currently selected joule level
- `⚡` — lightning bolt icon
- `0` — shock counter (number of shocks delivered)

**Physical bottom command buttons (labeled 1, 2, 3 + shock):**
1. `ANALYSE` — initiates rhythm analysis (timed ~5s)
2. `SÉLECTION D'ÉNERGIE ▲▼` — up/down to change joule level
3. `CHARGE` — charges the defibrillator (~3s timed)
4. Large red `⚡` button — delivers the shock (CHOC)

**Screen state:** Same "APPL. ÉLECT." warning, "Vérifier électrodes" (check electrodes) text, green dotted line where ECG would be. EtCO2 label visible right side.

**Notes for app:**
- The on-screen bottom bar with joules + shock count must ALWAYS be visible on the main monitor page
- It should disappear when navigating to 12-lead or other sub-pages
- Joule selection via ▲▼ maps to increment/decrement in the instructor panel
- Shock counter (`0`) increments each time CHOC is fired

---

## Screenshot 3 — Right-Side Navigation Buttons (Arrow Keys + Circle)

**What it shows:** The right-side navigation cluster is highlighted in a red rectangle. Arrows and the circle "enter" button are annotated.

**Right navigation cluster (5 buttons):**
- `▲▼` forward/back arrows — cycle through the 5 selectable on-screen sections
- `↩` / curved arrow — back/undo
- `●` circle button — functions as mouse click / "enter" to open a popup for the highlighted section
- Additional button below (unclear function)

**How navigation works on main screen:**
- Arrow keys cycle focus through **5 sections**: Adulte, FC, PNI, EtCO2, SpO2
- Each highlighted section gets a visual highlight on screen
- Pressing `●` (circle/enter) on a section opens its popup/window
- **Important sections (open a useful popup):** Adulte, PNI
- **Unimportant sections (open useless window):** FC, EtCO2, SpO2 — do NOT implement popups for these

**Notes for app:**
- In the web app, this translates to a clickable highlight system on the main monitor view
- Students can click on section labels; only "Adulte" and "PNI" sections trigger meaningful popups
- The back/undo button maps to a "back" nav element

---

## Screenshot 4 — 5 Selectable Sections with Color-Coded Importance

**What it shows:** Main monitor screen with all 5 arrow-key-selectable sections outlined in colored rectangles — **blue = important (opens useful popup)**, **red = not important (ignore/no popup)**.

**5 sections and their importance:**
| Section | Color | Status | Popup? |
|---------|-------|--------|--------|
| `Adulte` (top status bar, patient mode) | **Blue** | **IMPORTANT** | YES — patient info form |
| FC (HR — green, top-right vitals strip) | Red | Not important | NO |
| PNI (NIBP — cyan, vitals strip) | **Blue** | **IMPORTANT** | YES — BP reading/animation |
| EtCO2 (yellow/purple, vitals strip) | Red | Not important | NO |
| SpO2 (pink/yellow, vitals strip) + "Recherche" | Red | Not important | NO |

**Key visual detail — screen layout confirmed:**
- **Top status bar:** `2026-04-08 | 08:07:01 | Adulte` — "Adulte" is highlighted in blue (currently selected/focused)
- **Left area (main zone):** `Elect 1.0 cm/mV` label, ECG dotted line placeholder, `Vérifier électrodes` warning, `APPL. ÉLECT.` yellow bar
- **Right vitals strip (top to bottom):** FC (green), PNI (cyan), EtCO2 (red-outlined in this screenshot = not important), SpO2 (red-outlined), Recherche

**Notes for app:**
- Only 2 sections need clickable popup behavior: **Adulte** and **PNI**
- Clicking FC, EtCO2, SpO2 sections → no popup or a dead-end "nothing here" state
- Visual highlight/focus indicator needed when a section is "selected" (cyan outline matches device behavior)
- "Adulte" in the top bar is the clickable patient mode selector

---

## Screenshot 5 — Hover/Focus Highlight Behavior

**What it shows:** Close-up of the top status bar showing the hover/selection highlight in action. Arrow points to "Adulte" which is currently focused/highlighted.

**Visual highlight detail:**
- `Adulte` text in the top bar is highlighted with a **bright blue/cyan background** when selected
- The highlight is a solid colored background fill behind the text label
- Time shown: `08:07:01`
- Subtitle row below: "Étalage CO2 recommandé" (CO2 calibration recommended) — in purple/blue
- Right side: `Act.` label in a red/pink box, green battery indicator

**Notes for app:**
- When a section is focused/hovered, apply a bright cyan/blue `background-color` highlight to that element
- This is a CSS `:focus` / active state — should be visually obvious
- The highlight must be removable (moves to next section when arrow key pressed, or when click-away on desktop)
- "Étalage CO2 recommandé" = EtCO2 calibration message — this is a status message in a secondary bar just below the top status bar

---

## Screenshot 6 — "Adulte" Popup (Patient Mode Selector) — TWO STATES

**What it shows:** Two photos showing the "Adulte" popup open. This is one of the two important popups (blue square). Shows a **dropdown menu** that appears when "Adulte" is clicked.

**Popup content — Mode Patient dropdown:**
- Title: `Mode patient`
- Options (3 items in a vertical list):
  1. `Adulte` (Adult) — currently selected/highlighted
  2. `Pédiatrique` (Pediatric)
  3. `Nouveau né` (Neonate/Newborn)

**Visual layout:**
- Small dropdown appears overlaid in the top-center area of the screen
- The selected option is highlighted (darker background or colored text)
- Rest of the screen remains visible behind the popup (ECG area, vitals strip, APPL. ÉLECT. bar)

**Screen state both photos:**
- Timer: `00:04:06` and `00:04:01`
- Left sidebar shows: `Pace` label, `CO2` label, cross/medicine icon
- EtCO2 graph faintly visible (green/cyan line in the CO2 area)
- Right vitals strip: green FC bar, cyan PNI, EtCO2 label, "Vit" label (SpO2 waveform area), "Recherche"

**Notes for app:**
- "Adulte" click → dropdown with 3 options: Adult, Pediatric, Neonate
- Selecting a mode changes: patient mode label in status bar, default energy levels (joule presets)
- Adult default: 120J–200J range; Pediatric: weight-based (2J/kg); Neonate: lower fixed values
- This is a simple select/dropdown in the web app — no complex sub-form needed

---

## Screenshot 7 — Pédiatrique Mode Selected (Energy Changes)

**What it shows:** After selecting "Pédiatrique" from the mode dropdown. The bottom status bar has updated to reflect the pediatric mode and its default energy level.

**Bottom status bar change:**
- Now reads: `Mode Pédia.` (instead of `Mode Adulte`)
- Energy: **`50 J Sélectionné`** (down from 120 J — pediatric default is lower)
- `⚡ | 0` — shock counter still 0

**Status bar top:** `2026-04-05 | 08:11:08 | Pédiatrique` — mode label in the top bar also changed from "Adulte" to "Pédiatrique"

**Screen otherwise unchanged:** Still shows "APPL. ÉLECT.", "Vérifier électrodes", ECG placeholder dotted line, right vitals strip.

**EtCO2 graph area:** A faint purple/magenta flat line is visible in the CO2 section — EtCO2 line even when not active.

**Notes for app:**
- Switching mode updates BOTH the top bar label AND the bottom bar mode label
- Pediatric mode default energy = 50J
- Adult mode default energy = 120J
- Neonate mode default energy = TBD (ask paramedic friend)
- The energy selection range should change based on mode (e.g., pediatric max lower than adult)

---

## Screenshot 8 — CPR Mode ("Effectuer RCP") + CPR Timer

**What it shows:** CPR is active. A large bright blue banner "Effectuer RCP" (Perform CPR) overlays the center of the screen. The bottom bar has changed to show a CPR timer.

**CPR banner:**
- Large full-width blue/cyan banner across the center of the screen
- Text: **"Effectuer RCP"** (Perform CPR) in white bold text
- Replaces the area where ECG would be (or overlays it)

**Bottom status bar — CPR state:**
- `Mode Adulte | 120 J Sélectionné | Durée RCP: 1:48 | ⚡ | 0`
- `Durée RCP: 1:48` — CPR duration timer (counting up: 1 minute 48 seconds)
- This replaces or is added next to the energy/mode info

**Screen otherwise:**
- Timer top-right: `00:05:10` (session timer)
- EtCO2 graph line visible (purple/magenta)
- APPL. ÉLECT. not showing (perhaps electrodes are on but no rhythm detected)
- Right vitals: FC (green bar showing value), PNI, EtCO2 labels, "Vit EtCo2Lis", Recherche

**Notes for app:**
- CPR toggle ON → show large blue "Perform CPR" banner in center of ECG area
- Bottom bar gains `CPR Duration: MM:SS` timer that counts up from 0:00
- The CPR timer starts counting when CPR is toggled on
- CPR mode does NOT seem to change the waveform behind it — it covers the ECG area with the banner
- **This answers the CPR waveform question:** CPR mode shows a fullscreen banner overlay, not a waveform change
- CHARGE button appears lighter/greyed in this photo suggesting it may be disabled during CPR

---

## Screenshot 9 — "Page 1 Vitals, Graph and Buttons" — INITIAL BOOT STATE (from PDF doc)

**What it shows:** This is a PDF page with the heading "Page 1 Vitals, graph and buttons" and a caption: "For this section we're going to focus on what the paramedics need to see. The picture above is what the monitor looks like when they turn it on."

**This is the definitive STARTUP STATE of the monitor.**

**Full screen layout — confirmed from this clear photo:**

**Top status bar (row 1):**
- `2026-04-08 | 08:07:01 | Adulte` — date, time, patient mode
- Below it: `Calibrage CO2 recommandé` — EtCO2 calibration recommended (purple/blue sub-bar)
- Right side of top bar: `Act.` (red/pink label) | green battery bar | `00:00:10` (green session timer)

**Left sidebar icons (top to bottom, on dark background):**
- `+` (cross icon, top) — unclear
- `⬤` circle with lines (Pace icon)
- `12` — 12-lead button
- `CO2` — EtCO2 button
- Cross/medicine icon
- `Analyse` text button
- Print/paper roll icon
- `↩` back arrow (bottom)

**Main screen area (left/center):**
- `Elect` label + `1.0 cm/mV` — electrode sensitivity
- `Vérifier électrodes` — "Check electrodes" warning text (white)
- Green dotted line across center = ECG flatline placeholder
- `APPL. ÉLECT.` — large yellow bar (apply electrodes warning)

**Right vitals strip (narrow column, top to bottom):**
- `FC` [green bar with number] — Heart Rate
- `PNI` [cyan label + mmHg] — Blood Pressure (Non-Invasive)
- `EtCO2` [yellow/purple label] — EtCO2 value
- `SpO2` [yellow label] — SpO2 value
- `Recherche` — "Searching" (e.g., SpO2 probe searching)

**Bottom status bar:**
- `Mode Adulte` (left)
- `120 J Sélectionné` (center — joules)
- `⚡` lightning icon
- `0` shock counter (right)

**Physical buttons visible:**
1. ANALYSE (orange)
2. SÉLECTION D'ÉNERGIE ▲▼ (orange)
3. CHARGE (orange)
4. Large red shock button (right, labeled "choc")

**Notes for app:**
- This is the definitive reference for the student monitor view layout
- Main ECG area occupies the left ~75% of the screen
- Right vitals strip is a narrow ~25% column
- Bottom bar is always present on this page
- "Vérifier électrodes" + "APPL. ÉLECT." are the default state before any rhythm/signal is active

---

## Screenshot 10 — CRITICAL: Full Vitals Layout with Active SpO2 Waveform + EtCO2 Graph ("Step 1")

**What it shows:** TWO photos on one page. Top photo: highlights the EtCO2 area and the right vitals strip. Bottom photo: the main screen with ACTIVE SpO2 waveform and live vitals. This is the most detailed reference for the full layout.

---

### Top photo — EtCO2 section highlighted:
**Red rectangle left (main area):** Highlights the EtCO2 graph zone:
- `CO2` label on left sidebar button
- `CO2 0.0-63 mmHg` — EtCO2 range label
- `42` — EtCO2 value
- `28` — another value (likely end-tidal scale marker)
- `0` — baseline
- Purple/pink flatline = EtCO2 waveform (not yet calibrated)
- `APPL. ÉLECT.` yellow bar below

**Red rectangle right (vitals strip):** Highlights the right column:
- `EtCO2mmHg` — EtCO2 label (green? or yellow)
- `Vit` — SpO2 (vita) label
- `EtCo2Lis` — EtCO2 reading label
- `h/0` — unclear
- `Recherche` — searching (SpO2 probe)

**Notes:** When EtCO2 button is pressed (sidebar button 3), this EtCO2 graph section appears BELOW the main ECG area, replacing the SpO2 waveform. The main ECG still occupies the top portion.

---

### Bottom photo — LIVE VITALS STATE (most important reference):
**Screen state:** `2026-04-08 | 08:42:28 | Adulte` | Session timer: `3:00+`

**Main ECG area (left ~75%):**
- `Elect 1.0 cm/mV` — still showing electrode sensitivity label
- `Vérifier électrodes` — "check electrodes" warning still present
- Green dotted line (flatline ECG placeholder — no rhythm active)

**SpO2 waveform area (below ECG):**
- `SpO2 1x` — SpO2 waveform label + gain setting
- **YELLOW SpO2 waveform** — sharp peaked pulse-ox waveform, continuous, scrolling left-to-right
- This occupies the BOTTOM half of the main area (below the ECG line)

**Red rectangle (CO2 button highlighted):** CO2 sidebar button highlighted in red = this button replaces SpO2 waveform with EtCO2 graph

**Right vitals strip — LIVE VALUES:**
- `FP` (FC/HR): **89 bpm** — large green number
- `PNI mmHg`: **132 / 85 (101)** — systolic/diastolic (MAP) — large cyan numbers
  - `(08:41 Man.)` — last measurement time + manual notation
- `EtCO2 mmHg` — purple/magenta label (value cut off but present)
- `SpO2`: **99** — large yellow number
- `0.6` — SpO2 waveform value/indicator

**Vital value sizing:**
- HR: very large (primary)
- BP: large (two rows: systolic on top, diastolic below)
- SpO2: large
- EtCO2: medium

**CONFIRMED MAIN SCREEN LAYOUT:**
```
┌─────────────────────────────────┬──────────┐
│ [Top status bar: date/time/mode]│ timer    │
│ [Sub-bar: CO2 calibration msg]  │          │
├─────────────────────────────────┼──────────┤
│ ECG waveform area (~top 40%)    │ FC  89   │
│  "Elect 1.0 cm/mV"              │          │
│  "Vérifier électrodes"          │ PNI 132  │
│  ~~~~green ECG line~~~~         │     85   │
│                                 │   (101)  │
├─────────────────────────────────┤          │
│ SpO2 waveform (yellow)          │EtCO2 --  │
│  "SpO2  1x"                     │          │
│  /\/\/\/\ waveform              │ SpO2 99  │
├─────────────────────────────────┤    0.6   │
│ APPL. ÉLECT. [yellow bar]       │Recherche │
├─────────────────────────────────┴──────────┤
│ Mode Adulte  120 J Sélectionné  ⚡  0       │
└─────────────────────────────────────────────┘
```

**Notes for app:**
- Main screen has TWO waveform channels stacked vertically: ECG (top) and SpO2 (bottom)
- When EtCO2 button pressed: SpO2 waveform is REPLACED by EtCO2 waveform (SpO2 value stays in right strip)
- Right vitals strip shows large numeric values: HR (green), BP 2-line (cyan), EtCO2 label, SpO2 (yellow)
- BP format: `132 / 85 (101)` — systolic, diastolic, MAP in parentheses
- SpO2 waveform is YELLOW, peaks are sharp (pulse-ox style)
- All vital numbers are large, clear, colored by channel

---

## Screenshot 11 — Vitals Strip Detail + Vital Specs (from PDF text)

**What it shows:** Close-up of the right vitals strip only, plus the PDF text describing each vital channel's specs.

**Right vitals strip close-up (clean view):**
- Timer top: `3:00+` | Session: `00:20:26` | `Act.` label
- `FC` [green background label] `bpm` — HR channel header
- *(green dotted ECG line visible to the left)*
- `PNI` [cyan background label] `mmHg` — NIBP channel header
- `EtCO2mmHg` [purple/magenta background label] — EtCO2 channel header
- Yellow block below EtCO2 (SpO2 waveform placeholder / yellow box)
- `SpO2` [white label] `%` — SpO2 channel header
- `Recherche` [cyan background label] — "Searching" status
- Bottom: `⚡ | 0` (shock counter, bottom-right of vitals strip)

**CONFIRMED COLOR CODING:**
| Vital | Color |
|-------|-------|
| FC (HR) | Green |
| PNI (BP) | Cyan |
| EtCO2 | Purple/Magenta |
| SpO2 | Yellow |
| Searching status | Cyan |

**PDF text specs (verbatim from paramedic's doc):**

**Green FC (Heart Rate):**
- Full name: Fréquence cardiaque / Heart Rate
- Unit: BPM
- Min: 0 / Max: 300
- **Alarm triggers: If systolic BP below 90 → alarm. If above 200 → alarm** *(Note: text says "systolic value (top bp)" — this is an alarm on BP, not HR range. Likely a typo/confusion — probably means HR alarm threshold too. Confirm with paramedic.)*
- Alarm audio: file in `drive → animations and sounds → alarm` — must loop
- Format: values in a black box
- **ECG graph stays on forever — never replaced unless page changes (e.g., 12-lead)**

**Blood Pressure (PNI):**
- Unit: mmHg
- Format: values in a black box
- **NO waveform graph** — only numeric display
- More detail in later section (screenshot 12–13)

**EtCO2:**
- Unit: mmHg
- When EtCO2 button pressed → graph appears → **replaces SpO2 graph**
- More detail in later section

**SpO2:**
- Unit: %
- Min: 0 / Max: 100
- Format: values in a black box with a graph
- When EtCO2 button pressed → SpO2 graph is REPLACED by EtCO2 graph (SpO2 value stays in strip)

**Notes for app:**
- HR ECG waveform is permanent on main screen (never replaced)
- BP has NO waveform — just numbers
- SpO2 has a waveform that can be replaced by EtCO2 waveform via sidebar button
- Alarm: need to confirm exact threshold — likely HR <40 or >150 triggers alarm, BP systolic <90 or >200 triggers alarm
- All values displayed in "black box" = dark background container with colored text

---

## Screenshot 12 — CRITICAL: BP Animation Flow + Full Live Screen with SpO2 Waveform Active

**What it shows:** PDF page titled "Blood pressure additional information." Two photos: LEFT = initial state when BP button clicked (animation in progress), RIGHT = end result after BP measurement.

---

### SpO2 spec (top of page, continuation from previous):
- Unit: %
- Min 0% / Max 100%
- Values in black box + graph appears
- EtCO2 button pressed → replaces SpO2 **graph** (not value)

---

### Blood Pressure — Two-State Flow:

**LEFT photo (BP animation in progress):**
- Timer: `00:34:46` | `3:00+` | `Act.`
- HR: `98 bpm` (green, large)
- `PNI mmHg` label highlighted/active — cyan, red arrow pointing at it
- **SpO2 waveform (yellow):** ACTIVE — sharp /\/\/\ peaks scrolling, labeled `5` (likely gain)
- EtCO2 label (purple): visible in strip
- SpO2 value: `99`
- `⚡ 0` bottom right
- **BP area shows only `PNI mmHg` label — no numbers yet** (animation playing)
- The cyan arrow at bottom points to the CHOC (shock) button

**RIGHT photo (BP measurement complete):**
- Screen: `2026-04-09 | 08:42:20 | Adulte` | Session: `00:35:36` | `3:00+` | `Act.`
- Sub-bar: `Calibrage CO2 recommandé` (purple)
- Left area: `Elect 1.0 cm/mV` | `Vérifier électrodes` | green ECG dotted line
- **SpO2 waveform (yellow/green):** FULLY ACTIVE — large /\/\/\ peaks, scrolling, labeled `SpO2 1x`
- `APPL. ÉLECT.` yellow bar (still present even with waveform)
- Bottom bar: `Mode Adulte | 120 J Sélectionné | ⚡ | 0`
- **Right vitals strip — FULLY POPULATED:**
  - `FC` (green): `89` bpm
  - `PNI mmHg`: **`132 / 85 (101)`** — red arrow points here (end result)
    - Format confirmed: systolic on top, diastolic below, MAP in parentheses
    - `@09:41 Man.` — timestamp and "Manual" notation
  - `EtCO2mmHg` (purple): label visible, value partially cut off
  - `SpO2`: `99` (yellow)
    - `0.8` — SpO2 waveform amplitude/gain indicator

**PDF text description:**
> "The picture on the left is the initial when we click the **blood pressure button** (highlighted in red) and the picture on the right is the end result. So, for how I'd like it to be on their end, they click the bp button, the animation starts up (in the drive → animations and sounds → the bp one) and then the numbers pop up."

**Notes for app:**
- BP measurement is a **2-state animation flow**: click BP button → play BP animation → numbers appear
- Animation file is in the Google Drive under `animations and sounds` folder → `bp` animation
- After animation ends, BP numbers fill in: `132 / 85 (101)` format
- BP format is: `[systolic]\n[diastolic]\n([MAP])` stacked vertically
- `@HH:MM Man.` timestamp appears below BP (time of last measurement + "Manual" mode indicator)
- The PNI/BP section in vitals strip has NO waveform — only this numeric block
- SpO2 waveform confirmed: yellow, sharp /\/\ peaks, runs continuously in bottom-left of main area
- SpO2 gain/sensitivity shown as `1x` or numeric multiplier next to waveform label

---

## Screenshot 13 — CRITICAL: EtCO2 Toggle (Before/After) — FULLY VISIBLE

**What it shows:** Side-by-side: LEFT = SpO2 graph active (before CO2 button). RIGHT = EtCO2 graph active (after CO2 button pressed). PDF caption confirms behavior.

---

### LEFT photo — SpO2 waveform active (BEFORE EtCO2 button):
- `2026-04-08 | 08:42:28 | Adulte` | `3:00+` | `00:35:36`
- Sub-bar: `Calibrage CO2 recommandé` (red underline)
- Red arrow → points to `CO2` sidebar button (button to press)
- Left main area:
  - `Elect 1.0 cm/mV`
  - `Vérifier électrodes`
  - Green dotted ECG line (flatline)
  - **`SpO2  1x`** label — SpO2 waveform active below ECG
  - **Yellow /\/\/\ SpO2 waveform** — sharp peaks, continuous
  - `APPL. ÉLECT.` yellow bar (bottom of main area)
- Right strip:
  - `FP -- bpm` (FC, no number visible at top)
  - `89` — HR (green large)
  - `PNI mmHg`: **132 / 85 / (101)** `@08:41 Man.`
  - `EtCO2mmHg` label (purple, highlighted)
  - `SpO2: 99` | `0.6`
- Bottom bar: `Mode Adulte | 120 J Sélectionné | ⚡ | 0`

---

### RIGHT photo — EtCO2 waveform active (AFTER CO2 button):
- `2026-04-08 | 08:07:14 | Adulte` | `00:00:23`
- Sub-bar: `Calibrage CO2 recommandé` (still showing)
- Left main area:
  - `Elect 1.0 cm/mV`
  - `Vérifier électrodes`
  - Green dotted ECG line (top)
  - **`CO2  0.0-63 mmHg`** — EtCO2 waveform label + scale label
  - **Purple/pink flatline** — EtCO2 waveform (flat because not calibrated yet)
  - Scale markers: `63` (top), `20` (mid), `0` (bottom)
  - `APPL. ÉLECT.` yellow bar
- Right strip (annotated with arrows):
  - **Pink arrow** → points to `EtCO2mmHg` label (purple) in the strip
  - **Red arrow** → points to `Vit / Vitalize` area (SpO2 section — numeric value still there, but NO waveform)
  - `Recherche` (searching, at bottom)
- Bottom bar: `Mode Adulte | 120 J Sélectionné | ⚡ | 0`

**PDF caption text (verbatim):**
> "The picture on the left is before the **CO2 button is pressed**. On the right, that's after the button was pressed. It replaces the SPO2 graph and switches into **the ETC02 graph**. **The ETC02 box** on the bottom right will give us a number. The minimum value is 0 and max value of the etco2 would be 100."

**CONFIRMED EtCO2 toggle behavior:**
1. Before: SpO2 waveform shown in bottom-left waveform channel
2. CO2 sidebar button pressed → SpO2 waveform REPLACED by EtCO2 waveform
3. SpO2 **numeric value** remains in the right vitals strip (only the waveform is replaced)
4. EtCO2 waveform zone shows: scale labels (0, 20, 63 mmHg), purple/pink waveform line
5. EtCO2 numeric value appears in the right vitals strip under the EtCO2 label
6. EtCO2 range: min 0, max 100 mmHg

**Notes for app:**
- CO2 sidebar button is a TOGGLE: press once → EtCO2 mode (SpO2 waveform hidden, EtCO2 shown); press again → back to SpO2 waveform
- The EtCO2 waveform is a slow capnography wave (square-wave-ish, not a spike like ECG)
- Video file for EtCO2 waveform should be in the Google Drive
- SpO2 section in the right strip still shows numeric value during EtCO2 mode
- EtCO2 waveform has Y-axis scale labels: `0`, `20`, `63` mmHg (or similar)

---

## Screenshot 14 — 12-Lead Button (Sidebar Button 2) Highlighted

**What it shows:** Full device photo with the `12` (12-lead) sidebar button highlighted in a **red rectangle**. Caption at top: "12 lead page" + Loom URL.

**Screen state:** Default main monitoring page (no ECG active):
- `2026-04-08 | 08:07:01 | Adulte` — top status bar
- `Calibrage CO2 recommandé` — blue sub-bar
- `Elect 1.0 cm/mV` | `Vérifier électrodes`
- Green ECG dotted flatline
- `APPL. ÉLECT.` — large yellow bar
- Timer: `00:00:10`
- Bottom bar: `Mode Adulte | 120 J Sélectionné | ⚡ | 0`

**Right vitals strip (clearly visible, no values yet):**
- `FC` (green, no number — probe not connected)
- `PNI mmHg` (cyan label)
- `EtCO2mmHg` (purple label)
- `SpO2` (yellow-green label)
- `Recherche` (cyan — searching)

**Left sidebar (clearly visible):**
- `+` cross (top button)
- `⬤` — Pace button
- **`12` (with ECG squiggle icon)** — 12-LEAD BUTTON — **highlighted in RED RECTANGLE**
- `CO2` text button
- `✚` (cross/medicine)
- `Analyse` text
- Print/paper icon
- `↩` back arrow

**Physical buttons (bottom):**
- ANALYSE (1) | SÉLECTION D'ÉNERGIE ▲▼ (2) | CHARGE (3) | CHOC (red, large)

**Right navigation cluster (clearly visible):**
- Bell icon (alarm)
- Home icon
- Curved back arrow (`↩`)
- Circle / Enter button (`●`)
- Curved forward arrow
- Camera/snapshot icon

**Notes for app:**
- 12-lead button = sidebar button #3 (the `12` with squiggle icon)
- Pressing it navigates to the full 12-lead ECG page
- The right nav cluster has 6 buttons: alarm, home, back, enter/select, forward, snapshot
- These translate to functional UI elements in the web app header/sidebar

---

## Screenshot 15 — CRITICAL: Patient Info Popup ("Adulte" section → open popup) — FULLY VISIBLE

**What it shows:** The full device with the **"Info patient"** popup open. This is the popup triggered by clicking "Adulte" and confirms the patient info form fields exactly.

**Popup details:**
- Title row: `Info patient` (white text on dark background header)
- Form fields (left column label, right column value — green background):
  | Field | Value shown |
  |-------|-------------|
  | Âge du patient | **45** (highlighted cyan/blue) |
  | Sexe du patient | **M** |
  | Prénom du patient | *(empty)* |
  | 2e prénom patient | *(empty)* |
  | Nom du patient | *(empty)* |
  | ID du patient | **Patient 1135** |
- Bottom of popup: `←` back arrow button + `Exit` / `12` label
- Popup overlays the ECG area (main left section) — green background for form

**Top status bar visible above popup:**
- `2026-04-08 | 08:09:08 | Adulte` | `⚙` settings icon | `Act.` (red) | green battery bar | `00:02:17` timer
- Sub-bar: `Quelques limites alarme désact.` (Some alarm limits deactivated) — **cyan/blue warning sub-bar**

**Right vitals strip (partially visible behind popup):**
- `FC` (green label, value partially cut)
- `PNI mmHg` (cyan)
- `EtCO2mmHg` (purple/green)
- `Virt / FilterLine` label (cyan/yellow)
- `SpO2` (yellow-green)
- `Recherche` (cyan)

**Bottom of screen:**
- `APPL. ÉLECT.` yellow bar
- `Mode Adulte | 120 J Sélectionné | ⚡ | 0` — bottom status bar

**Physical buttons still visible:**
- ANALYSE (1) | SÉLECTION D'ÉNERGIE ▲▼ (2) | CHARGE (3) | CHOC (red)

**Right nav cluster visible:**
- Alarm bell, home, back arrow, circle enter, forward arrow, camera

**Sub-bar warning confirmed:** `Quelques limites alarme désact.` — "Some alarm limits deactivated" — this is a system status message in the secondary bar (same location as EtCO2 calibration message). Only one message shows at a time.

**Notes for app:**
- "Adulte" click → overlay popup with this patient form
- Fields: Age, Sex (M/F dropdown), First Name, Middle Name, Last Name, Patient ID
- Form is editable — instructor fills it in
- "Age du patient: 45" is pre-filled and highlighted (currently selected field)
- Back arrow / Exit closes popup and returns to main view
- Sub-bar can show various system status messages: CO2 calibration, alarm limits, etc.
- `FilterLine` visible in vitals strip = a SpO2 filter brand name (not relevant to implement)

---

## Screenshot 16 — CRITICAL: 12-Lead ECG Page (Real Device, Fully Visible)

**What it shows:** The actual 12-lead ECG view on the physical Zoll X Series device. All 12 channels visible simultaneously.

**Top status bar:**
- `2026-04-08 | 08:08:48 | Adulte` | settings icon | `Act.` (red) | green battery | `00:01:57` (timer)
- Sub-bar: `FilterLine du CO2 non connecté` (FilterLine CO2 not connected) — **yellow sub-bar**

**Main 12-lead layout — 2-column grid (left 6 leads, right 6 leads):**
| Left column | Right column |
|------------|--------------|
| `I` — `1.0 cm/mV` — `Défaut dériv.` | `V1` — `Défaut dériv.` |
| `II` — `Défaut dériv.` | `V2` — `Défaut dériv.` |
| `III` — `Défaut dériv.` | `V3` — `Défaut dériv.` |
| `aVR` — `Défaut dériv.` | `V4` — `Défaut dériv.` |
| `aVL` — `Défaut dériv.` | `V5` — `Défaut dériv.` |
| `aVF` — `Défaut dériv.` | `V6` — `Défaut dériv.` |

- `Défaut dériv.` = "Lead fault" / no signal (green dotted lines shown for each)
- Each lead row: lead label (left) + dotted green flatline + fault message
- First lead row (I) shows: `1.0 cm/mV` gain label
- Rows are evenly spaced, filling the full main area

**Right vitals strip (narrow column, same as main screen):**
- `FC bpm` — green (no value shown — leads disconnected)
- `PNI mmHg` — cyan
- `EtCO2mmHg` — purple
- `Véri FilterLine` — cyan-ish label (FilterLine status)
- `SpO2` — yellow label
- `Recherche` — cyan (searching)

**Left sidebar on 12-lead page:**
- `+` (top)
- `12` (highlighted/active — currently on 12-lead page)
- `⬤` (pace)
- White/grey spacer buttons
- `12` (again, bottom with `exit` label) — pressing this exits 12-lead back to main

**Bottom status bar (same as main):**
- `Mode Adulte | 120 J Sélectionné | ⚡ | 0`

**Physical buttons (unchanged):**
- ANALYSE (1) | SÉLECTION D'ÉNERGIE ▲▼ (2) | CHARGE (3) | CHOC (red)

**Notes for app:**
- 12-lead page replaces the main ECG view entirely
- Layout: 2-column × 6-row grid (left: I, II, III, aVR, aVL, aVF; right: V1–V6)
- Each cell contains: lead label + waveform video (looped, from Drive) + gain label
- "Défaut dériv." = no-signal placeholder — green dotted line
- When leads are connected/rhythm active, each cell shows its waveform video
- First lead (I) also shows the `cm/mV` gain
- Right vitals strip remains the same on 12-lead page
- Bottom status bar remains the same
- Exit: sidebar bottom `12 exit` button → returns to main screen
- The 12-lead page **hides** the APPL. ÉLECT. bar when showing waveforms
- Each lead row is ~equal height — divide main area height by 6 for each row
- Lead labels in green text, left-aligned

---

## Screenshot 17 — CRITICAL: Controller (Instructor) POV — Vitals Send Logic + Rhythm Selector + CPR + Waveform Strategy

**What it shows:** PDF page titled "Controllers POV" — this is the definitive spec for the instructor panel behavior.

---

### Instructor Panel — Vitals Send Behavior:

**Loom reference:** `https://www.loom.com/share/e4179b69a6114b629d8d355be9c6178b`

**Rules (verbatim from doc):**
1. **Send button** — "When I update a number, it doesn't update on their monitor until I click this button"
2. **Persistence** — "The number that's put on send stays until I click send again"
3. **Color change on edit** — "Whenever I change the number on the monitor, it's very important that it doesn't change when I input the number. I'd like that if I edit the number, I'd like its original color to change."

**What this means in practice:**
- Instructor types a new value in a vital field → field background/text color changes (indicating "pending/unsent" state)
- The student monitor DOES NOT update yet
- Instructor clicks "Send" → the new value is pushed to all student monitors
- The pending value stays pending until Send is clicked
- This is a **staged commit pattern**: edit locally → commit on Send

---

### Rhythm Selector (HR Tableau):

**Loom reference:** `https://www.loom.com/share/5756bc9538d24db8846cee3ab5271655`

**Behavior:**
- Instructor clicks on the **heart rate tableau** (HR display in instructor panel)
- A dropdown/list appears with **3 categories**: `Sinus`, `Cardiac Arrest`, `Arrhythmias`
- Each category is expandable — contains specific rhythm options
- Selecting a rhythm changes **3 connected things simultaneously:**
  1. **Main ECG waveform** — the looped video on the student monitor main screen
  2. **12-lead button** — changes what 12-lead page shows when opened
  3. **Image strip** — the rhythm strip image shown to students

---

### CPR:

**Loom reference:** `https://www.loom.com/share/70892c2986e549d5ad0afcaec8b29de5`

**Verbatim:** "Basically, I need a toggle button"

**Meaning:** CPR is simply a toggle button in the instructor panel. No complex logic — toggle ON/OFF. When ON → CPR banner shows on student monitor ("Effectuer RCP" / "Perform CPR") with timer.

---

### 🌟 KEY HIGHLIGHTED NOTE (yellow highlight in original):

> **"Set every graph to loop the video so it looks like a continuous rhythm"**

**This is the confirmed waveform rendering strategy:**
- ALL waveforms (ECG, SpO2, EtCO2, all 12-lead leads) are **video files that loop seamlessly**
- Not canvas-drawn, not SVG — actual `<video loop muted autoplay>` per rhythm/channel
- Rhythm change = swap the video `src`
- The videos come from the Google Drive provided by the paramedic friend

---

**Notes for app:**

**Instructor panel must implement:**
- Vital input fields (HR, BP sys/dia, SpO2, EtCO2) with pending-state color change
- Single **Send** button that broadcasts all pending values to student monitors via Supabase Realtime
- HR tableau click → rhythm selector (3 categories × N rhythms)
- CPR toggle button (ON/OFF)
- Defib controls: ANALYSE, SÉLECTION D'ÉNERGIE ▲▼, CHARGE, CHOC buttons

**Waveform implementation:**
- All waveforms = `<video loop muted autoplay playsinline>` HTML elements
- Video files organized by rhythm name in `/public/waveforms/`
- Rhythm selector → updates `src` attribute of the video element
- Seamless loop = video files trimmed to loop point

---

## END OF SCREENSHOTS SUMMARY

**Total screenshots analyzed:** 17/17

**Most critical references:**
- Screenshot 10 → confirmed full main screen layout (ASCII diagram)
- Screenshot 13 → confirmed EtCO2 toggle behavior
- Screenshot 15 → confirmed patient info popup fields
- Screenshot 16 → confirmed 12-lead grid layout
- Screenshot 17 → confirmed instructor panel Send logic, rhythm selector, CPR toggle, video loop strategy

