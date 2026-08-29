import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { ConfirmationDialog } from '../ConfirmationDialog'

function DialogHarness({ onConfirm = vi.fn() }: { onConfirm?: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Open dialog</button>
      <ConfirmationDialog
        open={open}
        title="Delete scenario"
        description="This cannot be undone."
        confirmLabel="Delete"
        onConfirm={onConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  )
}

describe('ConfirmationDialog', () => {
  it('renders the confirmed console styling and runs the confirm action', async () => {
    const onConfirm = vi.fn()
    const user = userEvent.setup()
    render(<DialogHarness onConfirm={onConfirm} />)

    await user.click(screen.getByRole('button', { name: 'Open dialog' }))
    const dialog = screen.getByRole('alertdialog', { name: 'Delete scenario' })
    expect(dialog).toHaveClass('border-pending-amber', 'bg-neutral-950')
    expect(screen.getByRole('heading', { name: 'Delete scenario' })).toHaveClass(
      'text-pending-amber',
    )
    expect(screen.getByText('This cannot be undone.')).toHaveClass('text-white')
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('cancels from the backdrop or Escape but not from the dialog surface', async () => {
    const user = userEvent.setup()
    render(<DialogHarness />)
    const trigger = screen.getByRole('button', { name: 'Open dialog' })

    await user.click(trigger)
    fireEvent.click(screen.getByRole('alertdialog'))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('confirmation-backdrop'))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(trigger).toHaveFocus()

    await user.click(trigger)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(trigger).toHaveFocus()
  })

  it('traps keyboard focus inside the dialog', async () => {
    const user = userEvent.setup()
    render(<DialogHarness />)

    await user.click(screen.getByRole('button', { name: 'Open dialog' }))
    const cancel = screen.getByRole('button', { name: 'Cancel' })
    const confirm = screen.getByRole('button', { name: 'Delete' })
    expect(cancel).toHaveFocus()

    await user.tab({ shift: true })
    expect(confirm).toHaveFocus()
    await user.tab()
    expect(cancel).toHaveFocus()
  })
})
