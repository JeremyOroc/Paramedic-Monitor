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
        interventionPriorityCode: 'Code 3',
        address: '123 Rue Principale',
        problem: 'Douleur thoracique',
        time: '14:45',
      },
    })

    expect(screen.getByRole('heading', { name: 'Caller Info' })).toBeInTheDocument()
    expect(screen.getByText('Code 3')).toBeInTheDocument()
    expect(screen.getByText('123 Rue Principale')).toBeInTheDocument()
    expect(screen.getByText('Douleur thoracique')).toBeInTheDocument()
    expect(screen.getByText('14:45')).toBeInTheDocument()
  })

  it('renders as an external dispatch tablet surface', () => {
    renderModal()

    expect(screen.getByText('Dispatch Tablet')).toBeInTheDocument()
    expect(screen.getByText('CAD')).toBeInTheDocument()
    expect(screen.getByTestId('dispatch-tablet-frame')).toHaveClass('border-dispatch-bezel')
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

    expect(screen.getByText('Extra 1')).toBeInTheDocument()
    expect(screen.getByText('Porte cote nord')).toBeInTheDocument()
  })

  it('renders extra rows after Heure in display order', () => {
    renderModal({
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
  })

  it('renders Acknowledge, Arrival and Transport buttons', () => {
    renderModal()

    expect(screen.getByRole('button', { name: 'Acknowledge' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Arrival' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Transport' })).toBeInTheDocument()
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
    const { rerender } = renderModal()
    expect(screen.queryByLabelText('Dispatch countdown')).toBeNull()

    rerender(
      <CallerInfoModal
        open
        info={DEFAULT_CALLER_INFO}
        onCallerEvent={() => {}}
        buttonState={ALL_ENABLED}
        showCountdown
        countdownFormatted="04:59"
      />,
    )

    expect(screen.getByLabelText('Dispatch countdown')).toHaveTextContent('04:59')
  })

  it('can fill the full monitor screen for the locked dispatch touchscreen', () => {
    renderModal({ fullScreen: true })

    expect(screen.getByLabelText('Caller info')).toHaveClass('inset-0')
    expect(screen.getByLabelText('Caller info')).not.toHaveClass('left-[56px]')
    expect(screen.getByTestId('dispatch-tablet-frame')).toHaveClass('h-[90%]')
  })
})
