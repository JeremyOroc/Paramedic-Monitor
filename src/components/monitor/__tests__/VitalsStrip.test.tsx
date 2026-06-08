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

  it('keeps NIBP count-up as a single systolic-style value', () => {
    render(
      <VitalsStrip
        hr={80}
        bpSys={118}
        bpDia={76}
        etco2={35}
        spo2={98}
        nibpPhase="counting"
        nibpDisplayValue={73}
      />,
    )

    expect(screen.getByText('73')).toBeInTheDocument()
    expect(screen.queryByText('118')).not.toBeInTheDocument()
    expect(screen.queryByText('76')).not.toBeInTheDocument()
  })

  it('renders settled NIBP as stacked sys and dia with a divider', () => {
    const { container } = render(
      <VitalsStrip
        hr={80}
        bpSys={118}
        bpDia={76}
        etco2={35}
        spo2={98}
        nibpPhase="settled"
        nibpDisplayValue={118}
      />,
    )

    expect(screen.getByText('118')).toBeInTheDocument()
    expect(screen.getByText('76')).toBeInTheDocument()
    expect(container.querySelector('hr')).toBeInTheDocument()
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
    expect(screen.queryByText('%')).not.toBeInTheDocument()
    expect(screen.getByText('SpO2').closest('[data-alarming]')).toHaveAttribute(
      'data-alarming',
      'false',
    )
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
