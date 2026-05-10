import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PatientModeModal } from '../PatientModeModal'

describe('PatientModeModal', () => {
  it('does not render when closed', () => {
    render(
      <PatientModeModal open={false} current="adult" onSelect={vi.fn()} onClose={vi.fn()} />,
    )
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders three options when open', () => {
    render(
      <PatientModeModal open={true} current="adult" onSelect={vi.fn()} onClose={vi.fn()} />,
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
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByRole('option', { name: 'Pédiatrique' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('calls onSelect when an option is clicked', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <PatientModeModal open={true} current="adult" onSelect={onSelect} onClose={vi.fn()} />,
    )
    await user.click(screen.getByRole('option', { name: 'Néonatal' }))
    expect(onSelect).toHaveBeenCalledWith('neonate')
  })

  it('calls onClose when backdrop is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <PatientModeModal open={true} current="adult" onSelect={vi.fn()} onClose={onClose} />,
    )
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalled()
  })
})
