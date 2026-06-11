import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  Spo2PulseBar,
  getSpo2PulseCycleMs,
  getSpo2PulseFillStep,
} from '../Spo2PulseBar'

describe('Spo2PulseBar', () => {
  let rafCallbacks: FrameRequestCallback[]

  beforeEach(() => {
    rafCallbacks = []
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafCallbacks.push(cb)
      return rafCallbacks.length
    })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders a yellow outlined black pulse bar with yellow fill', () => {
    render(<Spo2PulseBar hr={80} spo2={98} spo2Waveform="normal" />)

    expect(screen.getByTestId('spo2-pulse-bar')).toHaveClass(
      'border-yellow-spo2',
      'bg-black',
    )
    expect(screen.getByTestId('spo2-pulse-fill')).toHaveClass('bg-yellow-spo2')
  })

  it('uses waveform cycle timing when the SpO2 waveform provides one', () => {
    expect(getSpo2PulseCycleMs(120, 98, 'off')).toBe(1000)
  })

  it('falls back to HR-based timing for normal SpO2 pleth waveforms', () => {
    expect(getSpo2PulseCycleMs(120, 98, 'normal')).toBe(500)
    expect(getSpo2PulseCycleMs(10, 98, 'normal')).toBe(3000)
  })

  it('derives fill steps from sampled SpO2 waveform data', () => {
    const cycleMs = 300
    const data = new Float32Array([0, 1, 0])

    expect(getSpo2PulseFillStep(0, cycleMs, data)).toBe(0)
    expect(getSpo2PulseFillStep(100, cycleMs, data)).toBe(8)
    expect(getSpo2PulseFillStep(200, cycleMs, data)).toBe(0)
  })

  it('advances fill classes over a simulated pulse cycle', () => {
    const cycleMs = getSpo2PulseCycleMs(60, 98, 'normal')
    render(<Spo2PulseBar hr={60} spo2={98} spo2Waveform="normal" />)

    act(() => rafCallbacks.shift()?.(1000))
    expect(screen.getByTestId('spo2-pulse-fill')).toHaveAttribute('data-fill-step', '0')

    act(() => rafCallbacks.shift()?.(1000 + cycleMs * 0.22))
    expect(screen.getByTestId('spo2-pulse-fill')).toHaveAttribute('data-fill-step', '8')
    expect(screen.getByTestId('spo2-pulse-fill')).toHaveClass('h-full')
  })
})
