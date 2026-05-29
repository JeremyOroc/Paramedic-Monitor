import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PatientModeModal } from '../PatientModeModal'

describe('PatientModeModal', () => {
  it('does not render when closed', () => {
    render(
      <PatientModeModal open={false} current="adult" highlighted="adult" onSelect={vi.fn()} onClose={vi.fn()} />,
    )
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders three options when open', () => {
    render(
      <PatientModeModal open={true} current="adult" highlighted="adult" onSelect={vi.fn()} onClose={vi.fn()} />,
    )
    expect(screen.getByRole('option', { name: 'Adulte' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Pédiatrique' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Néonatal' })).toBeInTheDocument()
  })

  it('marks the current mode as selected', () => {
    render(
      <PatientModeModal
        open={true}
        current="pediatric"
        highlighted="pediatric"
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByRole('option', { name: 'Pédiatrique' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('does not call onSelect when an option div is clicked', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <PatientModeModal open={true} current="adult" highlighted="adult" onSelect={onSelect} onClose={vi.fn()} />,
    )
    // Options are display-only divs; clicking them must not trigger selection
    await user.click(screen.getByRole('option', { name: 'Néonatal' }))
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('does not call onClose when the backdrop area is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <PatientModeModal open={true} current="adult" highlighted="adult" onSelect={vi.fn()} onClose={onClose} />,
    )
    // Backdrop is an inert div — clicking inside the dialog must not close it
    await user.click(screen.getByRole('dialog'))
    expect(onClose).not.toHaveBeenCalled()
  })
})
