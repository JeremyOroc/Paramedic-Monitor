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
})
