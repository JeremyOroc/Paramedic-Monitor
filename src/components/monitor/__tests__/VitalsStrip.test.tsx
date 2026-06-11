import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VitalsStrip } from '../VitalsStrip'

describe('VitalsStrip', () => {
  it('renders all four vitals', () => {
    render(
      <VitalsStrip hr={80} bpSys={120} bpDia={89} etco2={35} spo2={98} />,
    )
    expect(screen.getByText('FC')).toBeInTheDocument()
    expect(screen.getByText('PNI')).toBeInTheDocument()
    expect(screen.getByText('EtCO2')).toBeInTheDocument()
    expect(screen.getByText('SpO2')).toBeInTheDocument()
  })

  it('renders NIBP as stacked numbers, not as sys/dia string', () => {
    render(
      <VitalsStrip hr={80} bpSys={120} bpDia={89} etco2={35} spo2={98} />,
    )
    expect(screen.getByText('120')).toBeInTheDocument()
    expect(screen.getByText('89')).toBeInTheDocument()
    expect(screen.queryByText('120/89')).toBeNull()
  })

  it('supports inactive blank vitals with SpO2 OFF', () => {
    render(
      <VitalsStrip
        hr=""
        bpSys=""
        bpDia=""
        etco2=""
        spo2="SpO2 OFF"
        spo2Unit=""
        activeAlarms={[]}
      />,
    )

    const values = screen.getAllByTestId('vital-value').map((node) => node.textContent)
    expect(values).toEqual(['', '', '', 'SpO2 OFF'])
    expect(screen.getByText('SpO2 OFF')).toHaveClass('text-[1.25rem]')
    expect(screen.queryByText('%')).not.toBeInTheDocument()
    expect(screen.getByText('SpO2').closest('[data-alarming]')).toHaveAttribute(
      'data-alarming',
      'false',
    )
  })

  it('renders the monitor SpO2 numeric value slightly smaller than the other single vitals', () => {
    render(
      <VitalsStrip hr={80} bpSys={120} bpDia={89} etco2={35} spo2={98} />,
    )

    expect(screen.getByText('98')).toHaveClass('text-[2.35rem]')
  })

  it('alarms HR, the whole NIBP box, and SpO2 from thresholds', () => {
    render(
      <VitalsStrip hr={141} bpSys={120} bpDia={226} etco2={35} spo2={89} />,
    )

    expect(screen.getByText('FC').closest('[data-alarming]')).toHaveAttribute('data-alarming', 'true')
    expect(screen.getByText('PNI').closest('[data-alarming]')).toHaveAttribute('data-alarming', 'true')
    expect(screen.getByText('EtCO2').closest('[data-alarming]')).toHaveAttribute('data-alarming', 'false')
    expect(screen.getByText('SpO2').closest('[data-alarming]')).toHaveAttribute('data-alarming', 'true')
  })

  it('keeps threshold boundary values in the normal range', () => {
    render(
      <VitalsStrip hr={40} bpSys={90} bpDia={25} etco2={0} spo2={90} />,
    )

    expect(screen.getByText('FC').closest('[data-alarming]')).toHaveAttribute('data-alarming', 'false')
    expect(screen.getByText('PNI').closest('[data-alarming]')).toHaveAttribute('data-alarming', 'false')
    expect(screen.getByText('SpO2').closest('[data-alarming]')).toHaveAttribute('data-alarming', 'false')
  })
})
