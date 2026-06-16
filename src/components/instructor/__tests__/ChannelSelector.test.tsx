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
    expect(screen.getByRole('button', { name: 'Off' })).toHaveAttribute(
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
    await user.click(screen.getByRole('button', { name: 'Normal' }))
    act(() => useMonitorStore.getState().save())
    expect(screen.getByTestId('status-spo2_waveform')).toHaveTextContent('pending')
    act(() => useMonitorStore.getState().send())
    expect(screen.getByTestId('status-spo2_waveform')).toHaveTextContent('-')
  })

})

describe('specialized selector wrappers', () => {
  beforeEach(() => {
    useMonitorStore.getState().reset()
  })

  it('EcgRhythmSelector keeps the row compact until rhythm options are opened', () => {
    render(<EcgRhythmSelector />)
    expect(screen.getByRole('button', { name: 'ECG off' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByRole('button', { name: 'Rhythm Options' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(screen.queryByRole('button', { name: 'NSR' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Off' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'PEA' })).not.toBeInTheDocument()
  })

  it('EcgRhythmSelector opens categories and shows options for the selected category', async () => {
    const user = userEvent.setup()
    render(<EcgRhythmSelector />)

    await user.click(screen.getByRole('button', { name: 'Rhythm Options' }))

    expect(screen.getByTestId('ecg-rhythm-options')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'NSR' })).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Cardiac Arrest' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Heart Block' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bundle Branch Block' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'MI' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'VF' })).not.toBeInTheDocument()
    expect(screen.queryByText('No rhythms yet')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'MI' }))

    expect(screen.getByRole('button', { name: 'Anterior MI' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Inferior MI' })).toBeInTheDocument()
    expect(screen.queryByText('No rhythms yet')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cardiac Arrest' }))

    expect(screen.getByRole('button', { name: 'VF' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'VT' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Torsades' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Asystole' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Heart Block' }))

    expect(screen.getByText('No rhythms yet')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'VF' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'PEA' })).not.toBeInTheDocument()
  })

  it('EcgRhythmSelector selects a rhythm from the grouped menu and closes it', async () => {
    const user = userEvent.setup()
    render(<EcgRhythmSelector />)

    await user.click(screen.getByRole('button', { name: 'Rhythm Options' }))
    await user.click(screen.getByRole('button', { name: 'Cardiac Arrest' }))
    await user.click(screen.getByRole('button', { name: 'Torsades' }))

    expect(useMonitorStore.getState().draft.rhythm).toBe('torsades')
    expect(screen.queryByTestId('ecg-rhythm-options')).not.toBeInTheDocument()
    expect(screen.getByTestId('status-rhythm')).toHaveTextContent('-')
  })

  it('EcgRhythmSelector selects Anterior MI from the MI category', async () => {
    const user = userEvent.setup()
    render(<EcgRhythmSelector />)

    await user.click(screen.getByRole('button', { name: 'Rhythm Options' }))
    await user.click(screen.getByRole('button', { name: 'MI' }))
    await user.click(screen.getByRole('button', { name: 'Anterior MI' }))

    expect(useMonitorStore.getState().draft.rhythm).toBe('anterior-mi')
    expect(screen.queryByTestId('ecg-rhythm-options')).not.toBeInTheDocument()
    expect(screen.getByText('Anterior MI')).toBeInTheDocument()
  })

  it('EcgRhythmSelector selects Inferior MI from the MI category', async () => {
    const user = userEvent.setup()
    render(<EcgRhythmSelector />)

    await user.click(screen.getByRole('button', { name: 'Rhythm Options' }))
    await user.click(screen.getByRole('button', { name: 'MI' }))
    await user.click(screen.getByRole('button', { name: 'Inferior MI' }))

    expect(useMonitorStore.getState().draft.rhythm).toBe('inferior-mi')
    expect(screen.queryByTestId('ecg-rhythm-options')).not.toBeInTheDocument()
    expect(screen.getByText('Inferior MI')).toBeInTheDocument()
  })

  it('Spo2WaveformSelector renders as a toggle-only graph control', () => {
    render(<Spo2WaveformSelector />)
    expect(screen.getByRole('button', { name: 'SpO2 off' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.queryByRole('button', { name: 'Normal' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Weak' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Off' })).not.toBeInTheDocument()
  })

  it('Etco2WaveformSelector renders as a toggle-only graph control', () => {
    render(<Etco2WaveformSelector />)
    expect(screen.getByRole('button', { name: 'EtCO2 off' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.queryByRole('button', { name: 'Normal' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Hypo' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Obstr.' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Off' })).not.toBeInTheDocument()
  })

  it('shared disconnected toggles move graph channels between Off and default On states', async () => {
    const user = userEvent.setup()
    render(
      <>
        <EcgRhythmSelector />
        <Spo2WaveformSelector />
        <Etco2WaveformSelector />
      </>,
    )

    await user.click(screen.getByRole('button', { name: 'ECG off' }))
    await user.click(screen.getByRole('button', { name: 'SpO2 off' }))
    await user.click(screen.getByRole('button', { name: 'EtCO2 off' }))

    expect(useMonitorStore.getState().draft.rhythm).toBe('nsr')
    expect(useMonitorStore.getState().draft.spo2_waveform).toBe('normal')
    expect(useMonitorStore.getState().draft.etco2_waveform).toBe('normal')
    expect(screen.getByTestId('status-rhythm')).toHaveTextContent('-')
    expect(screen.getByTestId('status-spo2_waveform')).toHaveTextContent('-')
    expect(screen.getByTestId('status-etco2_waveform')).toHaveTextContent('-')

    await user.click(screen.getByRole('button', { name: 'ECG on' }))
    await user.click(screen.getByRole('button', { name: 'SpO2 on' }))
    await user.click(screen.getByRole('button', { name: 'EtCO2 on' }))

    expect(useMonitorStore.getState().draft.rhythm).toBe('off')
    expect(useMonitorStore.getState().draft.spo2_waveform).toBe('off')
    expect(useMonitorStore.getState().draft.etco2_waveform).toBe('off')
  })
})
