import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { DEFAULT_CALLER_INFO } from '@/types/callerInfo'

import { CallerInfoModal } from '../CallerInfoModal'

const ALL_ENABLED = {
  acknowledge: { disabled: false },
  arrival: { disabled: false },
  transport: { disabled: false },
}

function renderModal(props: Partial<React.ComponentProps<typeof CallerInfoModal>> = {}) {
  return render(
    <CallerInfoModal
      open
      info={DEFAULT_CALLER_INFO}
      onCallerEvent={() => {}}
      buttonState={ALL_ENABLED}
      {...props}
    />,
  )
}

describe('CallerInfoModal', () => {
  it('renders nothing when closed', () => {
    const { container } = renderModal({ open: false })

    expect(container).toBeEmptyDOMElement()
  })

  it('renders confirmed caller info when open', () => {
    renderModal({
      info: {
        ...DEFAULT_CALLER_INFO,
        callNumber: 'C-2026-15',
        priority: 'P1',
        mpdsCode: '06D02',
        address: '123 Rue Principale',
        problem: 'Douleur thoracique',
        time: '14:45',
      },
    })

    expect(screen.getByRole('heading', { name: 'New Assignment' })).toBeInTheDocument()
    expect(screen.getByText('C-2026-15')).toBeInTheDocument()
    expect(screen.getAllByText('P1').length).toBeGreaterThan(0)
    expect(screen.getByText('06D02')).toBeInTheDocument()
    expect(screen.getAllByText('123 Rue Principale').length).toBeGreaterThan(0)
    expect(screen.getByText('Douleur thoracique')).toBeInTheDocument()
    expect(screen.getAllByText('14:45').length).toBeGreaterThan(0)
  })

  it('uses the assignment priority badge without a duplicate Priority detail row', () => {
    renderModal({
      info: {
        ...DEFAULT_CALLER_INFO,
        callNumber: 'C-2026-15',
        priority: 'P1',
        mpdsCode: '06D02',
      },
    })

    expect(screen.getByText('Call Assignment')).toBeInTheDocument()
    expect(screen.getByText('P1')).toBeInTheDocument()
    expect(screen.getByText('Lights & Sirens')).toBeInTheDocument()
    expect(screen.queryByTestId('assignment-info-priority')).toBeNull()
    expect(screen.getByTestId('assignment-info-callNumber')).toHaveTextContent('C-2026-15')
    expect(screen.getByTestId('assignment-info-mpdsCode')).toHaveTextContent('06D02')
  })

  it('renders the assignment dashboard variant by default', () => {
    renderModal()

    expect(screen.getByText('Connected')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'New Assignment' })).toBeInTheDocument()
    expect(screen.getByTestId('assignment-dashboard')).toBeInTheDocument()
    expect(screen.queryByText('CAD')).not.toBeInTheDocument()
    expect(screen.getByTestId('dispatch-tablet-frame')).toHaveClass('border-dispatch-bezel')
  })

  it('can render the classic dispatch tablet variant for A/B comparison', () => {
    renderModal({ variant: 'classic' })

    expect(screen.getByText('Dispatch Tablet')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Caller Info' })).toBeInTheDocument()
    expect(screen.queryByTestId('assignment-dashboard')).not.toBeInTheDocument()
  })

  it('uses custom extra labels when provided', () => {
    renderModal({
      info: {
        ...DEFAULT_CALLER_INFO,
        extra1Label: 'Acces',
        extra1: 'Porte cote nord',
      },
    })

    expect(screen.getByText('Acces')).toBeInTheDocument()
    expect(screen.getByText('Porte cote nord')).toBeInTheDocument()
    expect(screen.queryByText('Extra 1')).toBeNull()
    expect(screen.queryByText('Extra 2')).toBeNull()
    expect(screen.queryByText('Extra 3')).toBeNull()
  })

  it('falls back to generic extra labels when custom names are empty', () => {
    renderModal({
      info: {
        ...DEFAULT_CALLER_INFO,
        extra1: 'Porte cote nord',
      },
    })

    expect(screen.getByText('Notes')).toBeInTheDocument()
    expect(screen.getByText('Porte cote nord')).toBeInTheDocument()
  })

  it('renders extra rows after Heure in classic display order', () => {
    renderModal({
      variant: 'classic',
      info: {
        ...DEFAULT_CALLER_INFO,
        time: '14:45',
        extra1Label: 'Acces',
        extra1: 'Porte cote nord',
      },
    })

    const panelText = screen.getByLabelText('Caller info').textContent ?? ''
    expect(panelText.indexOf('Heure')).toBeGreaterThan(-1)
    expect(panelText.indexOf('Acces')).toBeGreaterThan(-1)
    expect(panelText.indexOf('Heure')).toBeLessThan(panelText.indexOf('Acces'))
  })

  it('has no in-panel close button (dismissed with the Back key)', () => {
    renderModal()

    expect(screen.queryByRole('button', { name: 'Close caller info' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Back to monitor' })).toBeNull()
  })

  it('shows a tablet Back button when provided', () => {
    const onBack = vi.fn()
    renderModal({ fullScreen: true, onBack })

    fireEvent.click(screen.getByRole('button', { name: 'Back to monitor' }))

    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('renders Acknowledge, Arrival and Transport buttons', () => {
    renderModal()

    expect(screen.getByRole('button', { name: 'Acknowledge' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Arrival' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Transport' })).toBeInTheDocument()
  })

  it('keeps assignment action buttons visible even when disabled', () => {
    renderModal({
      buttonState: {
        acknowledge: { disabled: true },
        arrival: { disabled: true },
        transport: { disabled: true },
      },
    })

    expect(screen.getByRole('button', { name: 'Acknowledge' })).toHaveClass(
      'min-h-[42px]',
      'disabled:bg-neutral-700',
      'disabled:text-neutral-300',
    )
    expect(screen.getByRole('button', { name: 'Arrival' })).toHaveClass(
      'min-h-[42px]',
      'disabled:bg-neutral-700',
      'disabled:text-neutral-300',
    )
    expect(screen.getByRole('button', { name: 'Transport' })).toHaveClass(
      'min-h-[42px]',
      'disabled:bg-neutral-700',
      'disabled:text-neutral-300',
    )
  })

  it('fires onCallerEvent with the matching key when a button is clicked', () => {
    const onCallerEvent = vi.fn()
    renderModal({ onCallerEvent })

    fireEvent.click(screen.getByRole('button', { name: 'Arrival' }))

    expect(onCallerEvent).toHaveBeenCalledTimes(1)
    expect(onCallerEvent).toHaveBeenCalledWith('arrival')
  })

  it('disables buttons per buttonState', () => {
    renderModal({
      buttonState: {
        acknowledge: { disabled: true },
        arrival: { disabled: true },
        transport: { disabled: false },
      },
    })

    expect(screen.getByRole('button', { name: 'Acknowledge' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Arrival' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Transport' })).toBeEnabled()
  })

  it('shows the dispatch countdown only when showCountdown is set', () => {
    const { rerender } = renderModal({ variant: 'classic' })
    expect(screen.queryByLabelText('Dispatch countdown')).toBeNull()

    rerender(
      <CallerInfoModal
        open
        variant="classic"
        info={DEFAULT_CALLER_INFO}
        onCallerEvent={() => {}}
        buttonState={ALL_ENABLED}
        showCountdown
        countdownFormatted="04:59"
      />,
    )

    expect(screen.getByLabelText('Dispatch countdown')).toHaveTextContent('04:59')
  })

  it('shows response timer separately from the ETA countdown in assignment view', () => {
    renderModal({
      showCountdown: true,
      countdownFormatted: '04:59',
      responseFormatted: '01:12',
    })

    expect(screen.getByLabelText('Response timer')).toHaveTextContent('01:12')
    expect(screen.getByLabelText('ETA')).toHaveTextContent('04:59')
  })

  it('can fill the full monitor screen for the locked dispatch touchscreen', () => {
    renderModal({ fullScreen: true })

    expect(screen.getByLabelText('Caller info')).toHaveClass('fixed', 'inset-0')
    expect(screen.getByLabelText('Caller info')).not.toHaveClass('left-[56px]')
    expect(screen.getByTestId('dispatch-tablet-frame')).toHaveClass(
      'dispatch-tablet-frame-assignment',
    )
  })
})
