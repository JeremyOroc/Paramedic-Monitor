import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { DEFAULT_CALLER_INFO } from '@/types/callerInfo'

import { CallerInfoModal } from '../CallerInfoModal'

describe('CallerInfoModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <CallerInfoModal open={false} info={DEFAULT_CALLER_INFO} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('renders confirmed caller info when open', () => {
    render(
      <CallerInfoModal
        open
        info={{
          ...DEFAULT_CALLER_INFO,
          interventionPriorityCode: 'Code 3',
          address: '123 Rue Principale',
          problem: 'Douleur thoracique',
          time: '14:45',
        }}
       
      />,
    )

    expect(screen.getByRole('heading', { name: 'Caller Info' })).toBeInTheDocument()
    expect(screen.getByText('Code 3')).toBeInTheDocument()
    expect(screen.getByText('123 Rue Principale')).toBeInTheDocument()
    expect(screen.getByText('Douleur thoracique')).toBeInTheDocument()
    expect(screen.getByText('14:45')).toBeInTheDocument()
  })

  it('uses custom extra labels when provided', () => {
    render(
      <CallerInfoModal
        open
        info={{
          ...DEFAULT_CALLER_INFO,
          extra1Label: 'Acces',
          extra1: 'Porte cote nord',
        }}
       
      />,
    )

    expect(screen.getByText('Acces')).toBeInTheDocument()
    expect(screen.getByText('Porte cote nord')).toBeInTheDocument()
    expect(screen.queryByText('Extra 1')).toBeNull()
    expect(screen.queryByText('Extra 2')).toBeNull()
    expect(screen.queryByText('Extra 3')).toBeNull()
  })

  it('falls back to generic extra labels when custom names are empty', () => {
    render(
      <CallerInfoModal
        open
        info={{
          ...DEFAULT_CALLER_INFO,
          extra1: 'Porte cote nord',
        }}
       
      />,
    )

    expect(screen.getByText('Extra 1')).toBeInTheDocument()
    expect(screen.getByText('Porte cote nord')).toBeInTheDocument()
  })

  it('renders extra rows after Heure in display order', () => {
    render(
      <CallerInfoModal
        open
        info={{
          ...DEFAULT_CALLER_INFO,
          time: '14:45',
          extra1Label: 'Acces',
          extra1: 'Porte cote nord',
        }}
       
      />,
    )

    const panelText = screen.getByLabelText('Caller info').textContent ?? ''
    expect(panelText.indexOf('Heure')).toBeGreaterThan(-1)
    expect(panelText.indexOf('Acces')).toBeGreaterThan(-1)
    expect(panelText.indexOf('Heure')).toBeLessThan(panelText.indexOf('Acces'))
  })

  it('closes when the close button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<CallerInfoModal open info={DEFAULT_CALLER_INFO} />)

    await user.click(screen.getByRole('button', { name: 'Close caller info' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
