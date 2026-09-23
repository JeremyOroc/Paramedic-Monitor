import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'

import { getTorsadesPacketDurationMs } from '@/lib/automaticHeartRate'
import type { Rhythm } from '@/types/vitals'
import { ECGCanvas } from '../ECGCanvas'

const { useWaveformRenderer } = vi.hoisted(() => ({
  useWaveformRenderer: vi.fn((...args: unknown[]) => {
    void args
    return { current: null }
  }),
}))

vi.mock('@/hooks/useWaveformRenderer', () => ({ useWaveformRenderer }))

type LiveState = {
  rhythm: Rhythm
  hr: number
  cprOverride: boolean
}

type BuiltOptions = {
  getSignalKey?: () => string
  getTimingKey?: () => string
  getCycleMs: () => number
}

const RHYTHMS: Rhythm[] = [
  'off',
  'nsr',
  'vf',
  'vt',
  'torsades',
  'asystole',
  'first-degree',
  'second-degree-type-1',
  'second-degree-type-2',
  'third-degree',
  'anterior-mi',
  'inferior-mi',
]

function buildEcgOptions(): (get: () => LiveState) => BuiltOptions {
  const call = useWaveformRenderer.mock.calls[0] as unknown as [
    LiveState,
    (get: () => LiveState) => BuiltOptions,
  ]
  return call[1]
}

describe('ECGCanvas waveform identity', () => {
  beforeEach(() => {
    useWaveformRenderer.mockClear()
  })

  it.each(RHYTHMS)('keeps %s identity stable across FC changes', (rhythm) => {
    render(<ECGCanvas rhythm={rhythm} hr={80} connected />)
    const buildOptions = buildEcgOptions()
    const original = buildOptions(() => ({ rhythm, hr: 80, cprOverride: false }))
    const updated = buildOptions(() => ({ rhythm, hr: 220, cprOverride: false }))

    expect(original.getSignalKey?.()).toBe(rhythm)
    expect(updated.getSignalKey?.()).toBe(rhythm)
  })

  it('still changes identity for a genuine rhythm or CPR-mode transition', () => {
    render(<ECGCanvas rhythm="nsr" hr={80} connected />)
    const buildOptions = buildEcgOptions()

    expect(buildOptions(() => ({ rhythm: 'nsr', hr: 80, cprOverride: false })).getSignalKey?.()).toBe('nsr')
    expect(buildOptions(() => ({ rhythm: 'vf', hr: 190, cprOverride: false })).getSignalKey?.()).toBe('vf')
    expect(buildOptions(() => ({ rhythm: 'vf', hr: 120, cprOverride: true })).getSignalKey?.()).toBe('cpr-compression')
  })

  it('reads the latest FC for rate-controlled rhythms, Torsades, and CPR', () => {
    render(<ECGCanvas rhythm="nsr" hr={80} connected />)
    const buildOptions = buildEcgOptions()

    expect(buildOptions(() => ({ rhythm: 'nsr', hr: 80, cprOverride: false })).getCycleMs()).toBe(750)
    expect(buildOptions(() => ({ rhythm: 'nsr', hr: 120, cprOverride: false })).getCycleMs()).toBe(500)
    expect(buildOptions(() => ({ rhythm: 'torsades', hr: 150, cprOverride: false })).getCycleMs()).toBe(getTorsadesPacketDurationMs(150))
    expect(buildOptions(() => ({ rhythm: 'torsades', hr: 250, cprOverride: false })).getCycleMs()).toBe(getTorsadesPacketDurationMs(250))
    expect(buildOptions(() => ({ rhythm: 'nsr', hr: 90, cprOverride: true })).getCycleMs()).toBeCloseTo(60000 / 90)
    expect(buildOptions(() => ({ rhythm: 'nsr', hr: 120, cprOverride: true })).getCycleMs()).toBe(500)
  })

  it('tracks cadence separately from waveform identity', () => {
    render(<ECGCanvas rhythm="nsr" hr={80} connected />)
    const buildOptions = buildEcgOptions()

    expect(buildOptions(() => ({ rhythm: 'nsr', hr: 80, cprOverride: false })).getTimingKey?.()).toBe('nsr:80')
    expect(buildOptions(() => ({ rhythm: 'nsr', hr: 120, cprOverride: false })).getTimingKey?.()).toBe('nsr:120')
    expect(buildOptions(() => ({ rhythm: 'torsades', hr: 150, cprOverride: false })).getTimingKey?.()).toBe('torsades:150')
    expect(buildOptions(() => ({ rhythm: 'nsr', hr: 100, cprOverride: true })).getTimingKey?.()).toBe('cpr-compression:100')

    // VF owns a fixed packet duration, so its displayed FC may change without
    // changing either the waveform shape or the renderer timeline.
    expect(buildOptions(() => ({ rhythm: 'vf', hr: 190, cprOverride: false })).getTimingKey?.()).toBe('vf')
    expect(buildOptions(() => ({ rhythm: 'vf', hr: 220, cprOverride: false })).getTimingKey?.()).toBe('vf')
  })
})
