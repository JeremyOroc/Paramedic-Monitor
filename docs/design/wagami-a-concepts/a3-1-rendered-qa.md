# Wagami A A3.1 rendered QA — 2026-09-15

The approved [v3 concept](precision-graphite-shell-controls-v3.png) is an illustrative design
reference, not a shipped UI bitmap. The current code-native [1024×768 render](a3-1-render-1024.png)
and [1536×1024 render](a3-1-render-1536.png) show the A3.1 implementation. Browser checks found no
horizontal/vertical scrollbars or page errors at either supported size; Power off/on worked.
The 900×700 narrow viewport showed only the landscape guidance. Real iPad review remains A6.

## Fidelity ledger

| V3 target | A3.1 render | Disposition |
| --- | --- | --- |
| Rugged graphite housing, recessed display | Original CSS faceted graphite housing and bezel | Geometry preserved; material is intentionally flatter than illustrative bitmap. Programmer accepted A3/A3.1 as done on 2026-09-15. |
| Right clinical stack: Analyse, Charge, guarded Choc | Same vertical order, all on outer shell; isolated upper-right Power | Implemented. Clinical callbacks await A4. |
| Left mute and Patient mode high, cuff/gauge PNI low | Same positions; original SVG cuff/gauge line icon | Implemented; supplied BP icon was not embedded or traced. A4 enables clinical actions. |
| Three circular lower-shell navigation keys | Left/Enter/Right ring of enabled inner actions only | Implemented; direct preview ring disabled honestly until A4/A5 actions exist. |
| Six immediate right-side task launchers | Six 2×3 touchscreen tiles stay visible | Implemented; destinations await A5. |
| Vital/waveform hierarchy and defib status | Four fixed cards, ECG/SpO₂/EtCO₂ traces, separate read-only defib status | Preserved from A3; live preview values and trace timing intentionally differ from invented concept readings. |

Copy change: `Imprimer / capturer` is now `Journal des signes vitaux` (English: Vital Log).
There is no independent print/capture tile; 12-lead printing/capture stays within the A5
12-lead workflow. No touchscreen Analyze, mute, or PNI-reading action remains. The A5
French/English language toggle and localized shell labels are not part of A3.1.

The broad right-side hardware-column motif should be included in renewed A-versus-X/Z
distinctness review. These renders do not constitute real-iPad validation or legal clearance.
