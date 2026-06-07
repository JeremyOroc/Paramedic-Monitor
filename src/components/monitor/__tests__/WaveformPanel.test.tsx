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
  it('renders disconnected dotted traces for each disabled graph channel', () => {
    render(
      <WaveformPanel
        {...baseProps}
        rhythm="off"
        spo2Waveform="off"
        etco2Waveform="off"
        showAllSecondaryChannels
      />,
    )

    const channels = screen
      .getAllByTestId('disconnected-waveform')
      .map((node) => node.getAttribute('data-channel'))
    expect(channels).toEqual(['ecg', 'etco2', 'spo2'])

    expect(screen.getAllByTestId('disconnected-dash-line')[0].style.backgroundImage)
      .toContain('20px 34px')
  })

  it('keeps enabled channels live while disabled channels stay dotted', () => {
    render(
      <WaveformPanel
        {...baseProps}
        spo2Waveform="off"
      />,
    )

    const channels = screen
      .getAllByTestId('disconnected-waveform')
      .map((node) => node.getAttribute('data-channel'))
    expect(channels).toEqual(['spo2'])
  })
})
