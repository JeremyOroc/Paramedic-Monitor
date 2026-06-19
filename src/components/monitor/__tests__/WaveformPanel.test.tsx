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

  it('uses the CPR ECG canvas override even when the normal ECG rhythm is off', () => {
    render(<WaveformPanel {...baseProps} rhythm="off" cprOverride />)

    expect(screen.getByTestId('cpr-ecg-canvas')).toBeInTheDocument()
    expect(screen.queryByTestId('cpr-ecg-video')).not.toBeInTheDocument()
    expect(screen.queryByTestId('live-ecg-canvas')).not.toBeInTheDocument()
    expect(screen.queryByTestId('disconnected-waveform')).not.toBeInTheDocument()
  })

  it('keeps the same ECG canvas mounted when CPR toggles on and off', () => {
    const { rerender } = render(<WaveformPanel {...baseProps} />)

    const liveCanvas = screen.getByTestId('live-ecg-canvas')

    rerender(<WaveformPanel {...baseProps} cprOverride />)
    const cprCanvas = screen.getByTestId('cpr-ecg-canvas')
    expect(cprCanvas).toBe(liveCanvas)

    rerender(<WaveformPanel {...baseProps} />)
    expect(screen.getByTestId('live-ecg-canvas')).toBe(liveCanvas)
  })

  it('renders Anterior MI as a live ECG rhythm', () => {
    render(<WaveformPanel {...baseProps} rhythm="anterior-mi" />)

    expect(screen.getByTestId('live-ecg-canvas')).toHaveAttribute(
      'data-rhythm',
      'anterior-mi',
    )
  })

  it('renders Inferior MI as a live ECG rhythm', () => {
    render(<WaveformPanel {...baseProps} rhythm="inferior-mi" />)

    expect(screen.getByTestId('live-ecg-canvas')).toHaveAttribute(
      'data-rhythm',
      'inferior-mi',
    )
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

  it('shows EtCO2 calibration in normal mode even before the channel is connected', () => {
    render(
      <WaveformPanel
        {...baseProps}
        secondaryChannel="etco2"
        etco2Waveform="off"
        etco2Loading
      />,
    )

    expect(screen.getByText('EtCO2')).toBeInTheDocument()
    expect(screen.getByTestId('etco2-loading-trace')).toBeInTheDocument()
    expect(screen.queryByText('SpO2')).not.toBeInTheDocument()
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
