import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import WaitingRoomPage from '../page'

const replace = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  useParams: () => ({ code: 'abc234' }),
  useRouter: () => ({ replace }),
}))

describe('WaitingRoomPage', () => {
  beforeEach(() => {
    replace.mockClear()
    localStorage.clear()
    localStorage.setItem(
      'paramedic-monitor.participant.ABC234',
      JSON.stringify({ nickname: 'Device 1', participantToken: 'participant_token' }),
    )
    vi.restoreAllMocks()
  })

  it('shows the assigned Device nickname without exposing instructor QR controls', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ session: { status: 'waiting' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    render(<WaitingRoomPage />)

    expect(await screen.findByText('Device 1, you are in the room.')).toBeInTheDocument()
    expect(screen.getByText('ABC234')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Generate QR Code for Room' })).toBeNull()
  })
})
