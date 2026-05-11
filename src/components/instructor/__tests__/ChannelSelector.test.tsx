import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChannelSelector } from '../ChannelSelector'
import { EcgRhythmSelector } from '../EcgRhythmSelector'
import { Spo2WaveformSelector } from '../Spo2WaveformSelector'
import { Etco2WaveformSelector } from '../Etco2WaveformSelector'
import { useMonitorStore } from '@/store/monitorStore'
import type { Spo2Waveform } from '@/types/vitals'

const SPO2_OPTIONS: ReadonlyArray<{ value: Spo2Waveform; label: string }> = [
  { value: 'normal', label: 'Normal' },
  { value: 'weak', label: 'Weak' },
  { value: 'off', label: 'Off' },
]

describe('ChannelSelector (generic)', () => {
  beforeEach(() => {
    useMonitorStore.getState().reset()
  })

  it('renders all option buttons with the given labels', () => {
    render(<ChannelSelector field="spo2_waveform" label="SpO2" options={SPO2_OPTIONS} />)
    expect(screen.getByRole('button', { name: 'Normal' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Weak' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Off' })).toBeInTheDocument()
  })

  it('marks the current draft value as pressed', () => {
    render(<ChannelSelector field="spo2_waveform" label="SpO2" options={SPO2_OPTIONS} />)
    expect(screen.getByRole('button', { name: 'Normal' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('clicking an option updates the draft and flips status to dirty', async () => {
    const user = userEvent.setup()
    render(<ChannelSelector field="spo2_waveform" label="SpO2" options={SPO2_OPTIONS} />)
    await user.click(screen.getByRole('button', { name: 'Weak' }))
    expect(useMonitorStore.getState().draft.spo2_waveform).toBe('weak')
    expect(screen.getByTestId('status-spo2_waveform')).toHaveTextContent('dirty')
  })

  it('reflects pending status after save and clean after send', async () => {
    const user = userEvent.setup()
    render(<ChannelSelector field="spo2_waveform" label="SpO2" options={SPO2_OPTIONS} />)
    await user.click(screen.getByRole('button', { name: 'Off' }))
    act(() => useMonitorStore.getState().save())
    expect(screen.getByTestId('status-spo2_waveform')).toHaveTextContent('pending')
    act(() => useMonitorStore.getState().send())
    expect(screen.getByTestId('status-spo2_waveform')).toHaveTextContent('—')
  })
})

describe('specialized selector wrappers', () => {
  beforeEach(() => {
    useMonitorStore.getState().reset()
  })

  it('EcgRhythmSelector renders 5 rhythm buttons', () => {
    render(<EcgRhythmSelector />)
    expect(screen.getByRole('button', { name: 'NSR' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'VF' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'VT' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Asystole' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'PEA' })).toBeInTheDocument()
  })

  it('Spo2WaveformSelector renders 3 option buttons', () => {
    render(<Spo2WaveformSelector />)
    expect(screen.getByRole('button', { name: 'Normal' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Weak' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Off' })).toBeInTheDocument()
  })

  it('Etco2WaveformSelector renders 4 option buttons', () => {
    render(<Etco2WaveformSelector />)
    expect(screen.getByRole('button', { name: 'Normal' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hypo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Obstr.' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Off' })).toBeInTheDocument()
  })
})
