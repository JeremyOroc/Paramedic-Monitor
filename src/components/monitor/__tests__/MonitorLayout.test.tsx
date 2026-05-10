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
        rightNav={<div>right-nav</div>}
        bottomBar={<div>bottom-bar</div>}
        defibRow={<div>defib-row</div>}
      />,
    )
    expect(screen.getByText('top-bar')).toBeInTheDocument()
    expect(screen.getByText('sub-bar')).toBeInTheDocument()
    expect(screen.getByText('sidebar')).toBeInTheDocument()
    expect(screen.getByText('main-content')).toBeInTheDocument()
    expect(screen.getByText('vitals-strip')).toBeInTheDocument()
    expect(screen.getByText('right-nav')).toBeInTheDocument()
    expect(screen.getByText('bottom-bar')).toBeInTheDocument()
    expect(screen.getByText('defib-row')).toBeInTheDocument()
  })

  it('hides bottom bar and defib row when set to null', () => {
    render(
      <MonitorLayout
        topBar={<div>top</div>}
        subBar={<div>sub</div>}
        sidebar={<div>side</div>}
        main={<div>main</div>}
        vitals={<div>vitals</div>}
        rightNav={<div>nav</div>}
        bottomBar={null}
        defibRow={null}
      />,
    )
    expect(screen.queryByText('bottom-bar')).toBeNull()
    expect(screen.queryByText('defib-row')).toBeNull()
  })
})
