import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { SessionLandingPage } from '../SessionLandingPage'
import { DEFAULT_DISPATCH, useMonitorStore } from '@/store/monitorStore'

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

  it('resets leftover admin drill state when creating a room', async () => {
    const user = userEvent.setup()
    const store = useMonitorStore.getState()
    store.setDraft('hr', 145)
    store.setDispatchSeconds(30)
    store.save()
    store.send()
    expect(useMonitorStore.getState().dispatch.armed).toBe(true)
    expect(useMonitorStore.getState().dispatchConfirmedSeconds).toBe(30)

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

    const after = useMonitorStore.getState()
    expect(after.dispatch).toEqual(DEFAULT_DISPATCH)
    expect(after.dispatchSeconds).toBe(0)
    expect(after.dispatchConfirmedSeconds).toBe(0)
    expect(after.confirmed.hr).toBe(0)
    expect(after.draft.hr).toBe(0)
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
