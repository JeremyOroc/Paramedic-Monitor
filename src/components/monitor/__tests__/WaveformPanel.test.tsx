import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { WaveformPanel } from '../WaveformPanel'

const baseProps = {
  secondaryChannel: 'spo2' as const,
  rhythm: 'nsr' as const,
  hr: 80,
  spo2: 98,
  etco2: 35,
  spo2Waveform: 'normal' as const,
  etco2Waveform: 'normal' as const,
}

describe('WaveformPanel', () => {
  it('shows selected SpO2 in normal mode when SpO2 is on', () => {
    render(
      <WaveformPanel
        {...baseProps}
        etco2Waveform="off"
      />,
    )

    expect(screen.getByText('SpO2')).toBeInTheDocument()
    expect(screen.queryByText('EtCO2')).not.toBeInTheDocument()
    expect(screen.queryByTestId('disconnected-waveform')).not.toBeInTheDocument()
  })

  it('shows selected EtCO2 in normal mode when EtCO2 is on', () => {
    render(
      <WaveformPanel
        {...baseProps}
        secondaryChannel="etco2"
        spo2Waveform="off"
      />,
    )

    expect(screen.getByText('EtCO2')).toBeInTheDocument()
    expect(screen.queryByText('SpO2')).not.toBeInTheDocument()
    expect(screen.queryByTestId('disconnected-waveform')).not.toBeInTheDocument()
  })

  it('hides the normal secondary row when selected channel is off and the other is on', () => {
    render(
      <WaveformPanel
        {...baseProps}
        secondaryChannel="etco2"
        etco2Waveform="off"
      />,
    )

    expect(screen.queryByText('SpO2')).not.toBeInTheDocument()
    expect(screen.queryByText('EtCO2')).not.toBeInTheDocument()
    expect(screen.queryByTestId('disconnected-waveform')).not.toBeInTheDocument()
  })

  it('shows selected disconnected trace in normal mode when both secondary channels are off', () => {
    render(
      <WaveformPanel
        {...baseProps}
        spo2Waveform="off"
        etco2Waveform="off"
      />,
    )

    const channels = screen
      .getAllByTestId('disconnected-waveform')
      .map((node) => node.getAttribute('data-channel'))
    expect(channels).toEqual(['spo2'])
    expect(screen.getByText('SpO2')).toBeInTheDocument()
    expect(screen.queryByText('EtCO2')).not.toBeInTheDocument()
  })

  it('shows both secondary rows in expanded mode and uses dashed traces for off rows', () => {
    render(
      <WaveformPanel
        {...baseProps}
        etco2Waveform="off"
        showAllSecondaryChannels
      />,
    )

    expect(screen.getByText('EtCO2')).toBeInTheDocument()
    expect(screen.getByText('SpO2')).toBeInTheDocument()
    expect(screen.getByText('EtCO2').compareDocumentPosition(screen.getByText('SpO2')))
      .toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    const channels = screen
      .getAllByTestId('disconnected-waveform')
      .map((node) => node.getAttribute('data-channel'))
    expect(channels).toEqual(['etco2'])
  })
})
