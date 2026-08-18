import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MonitorModalAction } from '../MonitorModalAction'

describe('MonitorModalAction', () => {
  it('renders the shared boxed default treatment', () => {
    render(<MonitorModalAction selected={false}>Exit</MonitorModalAction>)

    expect(screen.getByText('Exit')).toHaveClass(
      'bg-black',
      'border-2',
      'border-white',
      'text-white',
    )
  })

  it('shows selected and disabled states without becoming interactive', () => {
    render(
      <MonitorModalAction selected disabled>
        Previous
      </MonitorModalAction>,
    )

    const action = screen.getByText('Previous')
    expect(action).toHaveClass('bg-[var(--color-selection-blue)]', 'opacity-30')
    expect(action).toHaveAttribute('aria-current', 'true')
    expect(action).toHaveAttribute('aria-disabled', 'true')
    expect(screen.queryByRole('button')).toBeNull()
  })
})
