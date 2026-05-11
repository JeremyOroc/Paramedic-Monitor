# Real-time Canvas Waveforms (deferred)

> Reference doc. Not currently being implemented. Pick this up when the gif placeholders need to become live signals.

## Goal

Replace the 3 gif placeholders (`ECGCanvas`, SpO2 half + EtCO2 half of `SecondaryChannel`) with HTML canvas + `requestAnimationFrame`. Inputs come from the existing store: `confirmed.rhythm`, `confirmed.hr`, `confirmed.spo2_waveform`, `confirmed.etco2_waveform`. Classic Zoll "sweep cursor" — line draws left→right with a small erase band ahead. Rhythm changes appear immediately as the cursor sweeps over old pixels.

12-lead overlay stays on gifs (12 canvases is heavy).

## What to render

| Channel | Speed | Shapes |
|---|---|---|
| ECG | HR-driven for NSR/PEA; intrinsic for VF (chaotic sin-sum), 180bpm for VT, near-flat for Asystole | One P-QRS-T template (Float32Array) for NSR; piecewise math for the rest |
| SpO2 | HR-driven | Pulse template (rise + dicrotic notch + decay). Normal 0.8 amp, Weak 0.25 amp, Off → 0 |
| EtCO2 | Fixed 15/min (4s cycle) | Normal: trapezoid. Hypo: lower plateau, 8s cycle. Obstructed: shark-fin (exponential rise, no plateau). Off → 0 |

## Files

**New**
- `src/lib/waveforms/renderer.ts` — generic scroll-erase rAF renderer. Signature:
  ```ts
  startWaveformRenderer({ canvas, getSampler, color, pixelsPerSecond?, amplitude? }) => cleanup
  type Sampler = (t: number) => number  // seconds → y in [-1,1]
  ```
  Handles DPR, ResizeObserver, rAF cancellation. Reads `getSampler()` each frame so rhythm/hr swaps don't restart the loop.
- `src/lib/waveforms/ecg.ts` — `ecgSampler(rhythm, hr) → Sampler`
- `src/lib/waveforms/spo2.ts` — `spo2Sampler(waveform, hr) → Sampler`
- `src/lib/waveforms/etco2.ts` — `etco2Sampler(waveform, bpm) → Sampler`
- `src/components/monitor/WaveformCanvas.tsx` — shared component: holds canvasRef + samplerRef, wires `useEffect` for rAF
- Tests: `src/lib/waveforms/__tests__/{ecg,spo2,etco2}.test.ts` — sample-point assertions

**Modify**
- `src/components/monitor/ECGCanvas.tsx` — props change to `{ rhythm, hr }`, uses `WaveformCanvas` + `ecgSampler`
- `src/components/monitor/SecondaryChannel.tsx` — props change to `{ channel, spo2Waveform, etco2Waveform, hr }`, keeps label overlays, swaps inner `<VideoWaveform>` for `<WaveformCanvas>`
- `src/components/monitor/WaveformPanel.tsx` — props go from `ecgSrc/spo2Src/etco2Src` to `rhythm/hr/spo2Waveform/etco2Waveform`. Default `showApplyElectrodes` flips to `false`.
- `src/app/page.tsx` — pass raw store values instead of derived paths. Drop `waveformPaths` import.

**Delete**
- `src/lib/ecg/rhythms.ts`, `src/lib/ecg/renderer.ts`, `src/lib/ecg/` (empty stubs)
- `src/lib/waveformPaths.ts` (superseded)

`VideoWaveform.tsx` stays — `LeadCell` (12-lead) still uses it.

## Component skeleton

```tsx
// WaveformCanvas.tsx
const samplerRef = useRef(sampler)
useEffect(() => { samplerRef.current = sampler }, [sampler])
useEffect(() => {
  if (!canvasRef.current) return
  return startWaveformRenderer({
    canvas: canvasRef.current,
    getSampler: () => samplerRef.current,
    color,
  })
}, [color])
return <canvas ref={canvasRef} className="w-full h-full block" />
```

```tsx
// ECGCanvas.tsx
const sampler = useMemo(() => ecgSampler(rhythm, hr), [rhythm, hr])
return <WaveformCanvas sampler={sampler} color="#00ff41" />
```

## Renderer mechanics

- `width = canvas.clientWidth * dpr` on init + resize
- Each frame: `t = (now - startTime) / 1000`, `x = (t * pps) % width`
- Erase a 10–15px band ahead of `x`; stroke line from `(lastX, lastY)` to `(x, y)` where `y = h/2 - sampler(t) * h/2 * amplitude`
- On wrap (`x < lastX`): start a new path at `x` (don't connect across the wrap)
- Default `pixelsPerSecond` 200, `lineWidth` 2, `amplitude` 0.8

## Verification when implemented

- ECG NSR scrolls at HR rate; switching to VF makes the trace chaotic at the cursor onward; Asystole goes near-flat
- HR change immediately rescales the cycle
- SpO2 pulses sync to HR; Weak shrinks amplitude; Off flatlines
- EtCO2 cycles at 4s default; Obstructed shows shark-fin
- Browser resize re-fits cleanly; tab refresh resumes correctly
- `npm run test:run` — sampler tests pass alongside the existing 49
