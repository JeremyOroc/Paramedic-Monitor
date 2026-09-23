import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Etco2Waveform, Spo2Waveform } from '@/types/vitals'
import { SecondaryChannel } from '../SecondaryChannel'

const { useWaveformRenderer } = vi.hoisted(() => ({
  useWaveformRenderer: vi.fn((...args: unknown[]) => {
    void args
    return { current: null }
  }),
}))

vi.mock('@/hooks/useWaveformRenderer', () => ({ useWaveformRenderer }))

const baseProps = {
  hr: 80,
  spo2: 98,
  etco2: 35,
  spo2Waveform: 'normal' as const,
  etco2Waveform: 'normal' as const,
}

type SecondaryState = {
  channel: 'spo2' | 'etco2'
  hr: number
  spo2: number
  etco2: number
  spo2Waveform: Spo2Waveform
  etco2Waveform: Etco2Waveform
}

describe('SecondaryChannel', () => {
  beforeEach(() => {
    useWaveformRenderer.mockClear()
  })

  it('shows the SpO2 label with 1x scale metadata', () => {
    render(<SecondaryChannel {...baseProps} channel="spo2" />)

    expect(screen.getByText('SpO2')).toBeInTheDocument()
    expect(screen.getByText('1x')).toBeInTheDocument()
  })

  it('shows the displayed EtCO2 range without changing renderer scale labels', () => {
    render(<SecondaryChannel {...baseProps} channel="etco2" />)

    expect(screen.getByText('EtCO2')).toBeInTheDocument()
    expect(screen.getByText('0 to 60 mmHg')).toBeInTheDocument()
    expect(screen.getByText('150')).toBeInTheDocument()
    expect(screen.getByText('75')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('shows the EtCO2 loading trace before live or disconnected waveform output', () => {
    render(<SecondaryChannel {...baseProps} channel="etco2" connected={false} loading />)

    expect(screen.getByTestId('etco2-loading-trace')).toBeInTheDocument()
    expect(screen.getByTestId('etco2-loading-trace').querySelector('.etco2-calibration-progress'))
      .toBeInTheDocument()
    expect(screen.queryByTestId('disconnected-waveform')).not.toBeInTheDocument()
  })

  it('applies blue selection to title metadata independently', () => {
    render(
      <SecondaryChannel
        {...baseProps}
        channel="spo2"
        selectedLabel
        selectedScale
      />,
    )

    expect(screen.getByText('SpO2')).toHaveClass('bg-[var(--color-selection-blue)]', 'text-white')
    expect(screen.getByText('1x')).toHaveClass('bg-[var(--color-selection-blue)]', 'text-white')
  })

  it('updates SpO2 cadence from FC without changing waveform identity', () => {
    render(<SecondaryChannel {...baseProps} channel="spo2" />)

    const call = useWaveformRenderer.mock.calls[0] as unknown as [
      unknown,
      (get: () => SecondaryState) => {
        getSignalKey?: () => string
        getTimingKey?: () => string
        getCycleMs: () => number
      },
    ]
    const buildOptions = call[1]
    const normal = buildOptions(() => ({ ...baseProps, channel: 'spo2' }))
    const faster = buildOptions(() => ({ ...baseProps, channel: 'spo2', hr: 120 }))
    const lowerSaturation = buildOptions(() => ({ ...baseProps, channel: 'spo2', hr: 120, spo2: 82 }))
    const weak = buildOptions(() => ({ ...baseProps, channel: 'spo2', hr: 120, spo2Waveform: 'weak' }))

    expect(normal.getSignalKey?.()).toBe('spo2:normal:98')
    expect(faster.getSignalKey?.()).toBe('spo2:normal:98')
    expect(normal.getTimingKey?.()).toBe('spo2:80')
    expect(faster.getTimingKey?.()).toBe('spo2:120')
    expect(normal.getCycleMs()).toBe(750)
    expect(faster.getCycleMs()).toBe(500)
    expect(lowerSaturation.getSignalKey?.()).toBe('spo2:normal:82')
    expect(weak.getSignalKey?.()).toBe('spo2:weak:98')
  })

  it('retains EtCO2 morphology and value identity', () => {
    render(<SecondaryChannel {...baseProps} channel="etco2" />)

    const call = useWaveformRenderer.mock.calls[0] as unknown as [
      unknown,
      (get: () => SecondaryState) => {
        getSignalKey?: () => string
        getTimingKey?: () => string
      },
    ]
    const buildOptions = call[1]
    const normal = buildOptions(() => ({ ...baseProps, channel: 'etco2' }))
    const changedValue = buildOptions(() => ({ ...baseProps, channel: 'etco2', etco2: 48 }))
    const obstructed = buildOptions(() => ({ ...baseProps, channel: 'etco2', etco2Waveform: 'obstructed' }))

    expect(normal.getSignalKey?.()).toBe('etco2:normal:35')
    expect(normal.getTimingKey?.()).toBe('etco2')
    expect(changedValue.getSignalKey?.()).toBe('etco2:normal:48')
    expect(obstructed.getSignalKey?.()).toBe('etco2:obstructed:35')
  })
})
