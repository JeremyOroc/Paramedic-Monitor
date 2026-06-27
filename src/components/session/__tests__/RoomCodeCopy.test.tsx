import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { RoomCodeCopy } from '../RoomCodeCopy'

describe('RoomCodeCopy', () => {
  it('renders a selectable uppercase room code and copies it', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    render(<RoomCodeCopy code="abc123" />)

    expect(screen.getByText('ABC123')).toHaveClass('select-all')

    await user.click(screen.getByRole('button', { name: 'Copy' }))

    expect(writeText).toHaveBeenCalledWith('ABC123')
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })
})
