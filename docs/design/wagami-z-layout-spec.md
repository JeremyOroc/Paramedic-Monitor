# Wagami Z layout specification

This code-native specification records normalized measurements extracted from the approved Image #1 without embedding or redistributing the reference image. Percentages are relative to the complete blue device shell unless a table says otherwise.

## Device landmarks

| Landmark | X / centre X | Y / centre Y | Width | Height | Acceptance |
|---|---:|---:|---:|---:|---:|
| Complete shell in 1920×1080 viewport | centred | centred | 72% viewport | 96% viewport | ±2% viewport |
| Upper blue housing | 0% | 0% | 100% | 93.5% | ±2% shell |
| Silver face | 3.3% | 2.8% | 93.4% | 81.9% | ±2% shell |
| Screen bezel | 10.5% | 14.8% | 73.7% | 65.6% | ±2% shell |
| Inner display | 13.5% | 17.4% | 67.8% | 60.2% | ±2% shell |
| Power control | 17.7% | 8.6% | 5.6% | 5.6% | ±2% shell |
| WAGAMI wordmark | 50% | 9.2% | intrinsic | intrinsic | ±2% shell |
| Readiness window | 75.8% | 8.7% | 10% | 6.2% | ±2% shell |
| Shock control | 91% | 23.8% | 6.5% | 6.5% | ±2% shell |
| Charge control | 91% | 40% | 5.7% | 5.7% | ±2% shell |
| Rotary control | 91.1% | 69.7% | 8.9% | 8.9% | ±2% shell |
| Z wordmark | 50% | 83.6% | intrinsic | intrinsic | ±2% shell |
| Speaker pod | 50% | 88.5% | 14.8% | 7.5% | ±2% shell |
| Sculpted lower body | 3% | 83.7% | 94% | 16.3% | ±2% shell |

Secondary indicators, highlights, seams, ridges, shadows, and grille details use a ±4% landmark tolerance and visual material review.

## Touchscreen grid

The inner display uses fixed simulated-device typography and the following normalized grid:

| Region | Proportion |
|---|---:|
| Status row | 5.6% height |
| Mode navigation | 9.7% height |
| Clinical content | remaining height |
| Bottom actions | 11.8% height |
| Waveform column | 80.5% clinical-content width |
| Vital column | 19.5% clinical-content width |
| ECG / EtCO2 / SpO2 / blank-PNI rows | 32% / 24% / 21% / 23% |
| Mode navigation widths | 27% / 18% / 12.5% / 16% / 26.5% |
| Bottom action widths | 9.5% / 9.8% / 12.2% / 12.2% / 12% / 12% / 11.9% / 20.4% |

## Visual system

- Palette: shared `COLORS` clinical constants plus `WAGAMI_Z_COLORS` shell tokens from `src/lib/constants.ts`.
- Shell: layered blue polymer, cool metallic face, deep raised black bezel, sculpted lower housing, restrained specular highlights, and black stage vignette.
- Typography: bold sans-serif for shell branding and controls; tabular monospaced figures for clinical values and status metadata.
- Icons: filled or medium-weight code-native SVGs matching the approved reference; overflow is icon-only.
- Interaction: power retains its two-second boot behavior. Every other physical and touchscreen control remains an accessible visual no-op with a minimum approximate 44×44 CSS-pixel hit area.
