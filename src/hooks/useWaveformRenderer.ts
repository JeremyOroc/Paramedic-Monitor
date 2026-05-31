'use client'

import { useEffect, useRef, type DependencyList } from 'react'
import { startRenderer, type RendererOptions } from '@/lib/ecg/renderer'

export type WaveformRendererOptions = Omit<RendererOptions, 'canvas'>

/**
 * Shared React glue for the canvas waveform renderer.
 *
 * The long-lived `startRenderer` loop must read the latest reactive inputs
 * (rhythm, hr, channel shapes…) without being torn down on every prop change.
 * This hook keeps those inputs in a ref synced every render, exposes them to the
 * caller via a `getLatest` accessor, and (re)starts the renderer only when `deps`
 * change. It owns the `<canvas>` ref and the start/cleanup lifecycle; the per-view
 * renderer options (color, sweep, jitter, getWaveform/getSignalKey/getCycleMs)
 * stay in the calling component.
 */
export function useWaveformRenderer<T>(
  live: T,
  buildOptions: (getLatest: () => T) => WaveformRendererOptions,
  deps: DependencyList,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const liveRef = useRef(live)

  useEffect(() => {
    liveRef.current = live
  })

  useEffect(() => {
    if (!canvasRef.current) return
    return startRenderer({
      canvas: canvasRef.current,
      ...buildOptions(() => liveRef.current),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return canvasRef
}
