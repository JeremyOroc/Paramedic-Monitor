import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { SessionLandingPage } from '../SessionLandingPage'

const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

describe('SessionLandingPage', () => {
  beforeEach(() => {
    push.mockClear()
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('creates a room and redirects to the private instructor URL', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          instructorUrl: 'http://localhost/session/ABC234/instructor?host=host_token',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    render(<SessionLandingPage />)
    await user.click(screen.getByRole('button', { name: 'Create Room' }))

    expect(fetch).toHaveBeenCalledWith('/api/session/create', { method: 'POST' })
    expect(push).toHaveBeenCalledWith('http://localhost/session/ABC234/instructor?host=host_token')
  })

  it('joins with code and nickname, stores the participant token, and opens waiting room', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          participantToken: 'participant_token',
          participant: { id: 'p1', nickname: 'Zaid' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    render(<SessionLandingPage />)
    await user.type(screen.getByLabelText('Room code'), 'abc234')
    await user.type(screen.getByLabelText('Nickname'), 'Zaid')
    await user.click(screen.getByRole('button', { name: 'Join' }))

    expect(fetch).toHaveBeenCalledWith('/api/session/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: 'ABC234',
        nickname: 'Zaid',
        participantToken: '',
      }),
    })
    expect(localStorage.getItem('paramedic-monitor.participant.ABC234')).toContain(
      'participant_token',
    )
    expect(push).toHaveBeenCalledWith('/session/ABC234/waiting')
  })
})
