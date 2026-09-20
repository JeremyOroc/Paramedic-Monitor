import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('dev=3'),
}))

import MonitorPageRoute from '../page'

describe('/?dev=3 isolated route', () => {
  it('enters the A preview before the test-mode X route and without a Room landing', () => {
    render(<MonitorPageRoute />)

    expect(screen.getByTestId('wagami-a-preview')).toBeInTheDocument()
    expect(screen.queryByTestId('device-shell')).not.toBeInTheDocument()
    expect(screen.queryByText('Join Room')).not.toBeInTheDocument()
  })
})
