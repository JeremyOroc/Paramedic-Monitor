import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SecondaryChannel } from '../SecondaryChannel'

vi.mock('@/lib/ecg/renderer', () => ({
  startRenderer: vi.fn(() => () => {}),
}))

const baseProps = {
  hr: 80,
  spo2: 98,
  etco2: 35,
  spo2Waveform: 'normal' as const,
  etco2Waveform: 'normal' as const,
}

describe('SecondaryChannel', () => {
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
})
