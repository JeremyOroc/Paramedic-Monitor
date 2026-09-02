import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MonitorLayout } from '../MonitorLayout'

describe('MonitorLayout', () => {
  it('renders all required regions', () => {
    render(
      <MonitorLayout
        topBar={<div>top-bar</div>}
        subBar={<div>sub-bar</div>}
        sidebar={<div>sidebar</div>}
        main={<div>main-content</div>}
        vitals={<div>vitals-strip</div>}
        bottomBar={<div>bottom-bar</div>}
      />,
    )
    expect(screen.getByText('top-bar')).toBeInTheDocument()
    expect(screen.getByText('sub-bar')).toBeInTheDocument()
    expect(screen.getByText('sidebar')).toBeInTheDocument()
    expect(screen.getByText('main-content')).toBeInTheDocument()
    expect(screen.getByText('vitals-strip')).toBeInTheDocument()
    expect(screen.getByText('bottom-bar')).toBeInTheDocument()
    expect(screen.getByTestId('monitor-vitals-region')).toHaveAttribute(
      'data-placement',
      'right',
    )
  })

  it('hides bottom bar when set to null', () => {
    render(
      <MonitorLayout
        topBar={<div>top</div>}
        subBar={<div>sub</div>}
        sidebar={<div>side</div>}
        main={<div>main</div>}
        vitals={<div>vitals</div>}
        bottomBar={null}
      />,
    )
    expect(screen.queryByText('bottom-bar')).toBeNull()
  })

  it('places vitals in the fixed bottom row without a right-side column', () => {
    const { container } = render(
      <MonitorLayout
        topBar={<div>top</div>}
        subBar={<div>sub</div>}
        sidebar={<div>side</div>}
        main={<div>main</div>}
        vitals={<div>resting-vitals</div>}
        vitalsPlacement="bottom"
      />,
    )

    expect(screen.getByTestId('monitor-vitals-region')).toHaveAttribute(
      'data-placement',
      'bottom',
    )
    expect(screen.getByTestId('monitor-vitals-region')).toHaveClass(
      'row-start-4',
      'col-start-2',
    )
    expect(container.firstChild).toHaveClass(
      'grid-cols-[56px_1fr]',
      'grid-rows-[32px_24px_1fr_110px]',
    )
  })

  it('renders the energy scale and right-side vitals together', () => {
    const { container } = render(
      <MonitorLayout
        topBar={<div>top</div>}
        subBar={<div>sub</div>}
        sidebar={<div>side</div>}
        main={<div>main</div>}
        vitals={<div>defib-vitals</div>}
        energyColumn={<div>energy-scale</div>}
        bottomBar={<div>charge-status</div>}
      />,
    )

    expect(container.firstChild).toHaveClass(
      'grid-cols-[56px_1fr_80px_96px]',
    )
    expect(screen.getByTestId('monitor-energy-region')).toBeInTheDocument()
    expect(screen.getByTestId('monitor-vitals-region')).toHaveAttribute(
      'data-placement',
      'right',
    )
    expect(screen.getByText('charge-status')).toBeInTheDocument()
  })
})
