import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { RoomQrCode } from '../RoomQrCode'

describe('RoomQrCode', () => {
  it('replaces its action with a local inline QR card and restores it on hide', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(window, 'fetch')
    render(<RoomQrCode code="abc234" />)

    const trigger = screen.getByRole('button', { name: 'Generate QR Code for Room' })
    await user.click(trigger)

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(
      screen.getByRole('region', { name: 'QR code to join Room ABC234' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Scan to join Room ABC234')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'QR code for Room ABC234' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /download|print/i })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Generate QR Code for Room' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Hide QR code' })).toHaveFocus()
    expect(fetchSpy).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Hide QR code' }))
    expect(screen.queryByRole('region', { name: 'QR code to join Room ABC234' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Generate QR Code for Room' })).toHaveFocus()
  })

  it('resets the local disclosure when the Room changes', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<RoomQrCode key="ABC234" code="ABC234" />)

    await user.click(screen.getByRole('button', { name: 'Generate QR Code for Room' }))
    expect(screen.getByRole('region', { name: 'QR code to join Room ABC234' })).toBeInTheDocument()

    rerender(<RoomQrCode key="DEF345" code="DEF345" />)

    expect(screen.queryByRole('region', { name: 'QR code to join Room ABC234' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Generate QR Code for Room' })).toBeInTheDocument()
  })
})
