import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { SessionLandingPage } from '../SessionLandingPage'

const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}))

describe('SessionLandingPage', () => {
  beforeEach(() => {
    push.mockClear()
    localStorage.clear()
    window.history.replaceState(null, '', '/')
    vi.restoreAllMocks()
  })

  it('keeps Room creation behind Instructor sign-in', () => {
    render(<SessionLandingPage />)

    expect(screen.queryByRole('button', { name: 'Create Room' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Instructor sign in' })).toHaveAttribute(
      'href',
      '/instructor/login',
    )
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
    await user.type(screen.getByLabelText('Device nickname (optional)'), 'Zaid')
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

  it('prefills a normalized QR Room code without joining automatically', () => {
    const fetchSpy = vi.spyOn(window, 'fetch')
    window.history.replaceState(null, '', '/?code=abc234')

    render(<SessionLandingPage />)

    expect(screen.getByLabelText('Room code')).toHaveValue('ABC234')
    expect(screen.getByRole('button', { name: 'Join' })).toBeEnabled()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('synchronizes a valid Room code after client-side query navigation', async () => {
    const { rerender } = render(<SessionLandingPage />)
    expect(screen.getByLabelText('Room code')).toHaveValue('')

    window.history.replaceState(null, '', '/?code=def345')
    rerender(<SessionLandingPage />)

    await waitFor(() => expect(screen.getByLabelText('Room code')).toHaveValue('DEF345'))
    expect(screen.getByRole('button', { name: 'Join' })).toBeEnabled()
  })

  it('ignores an invalid prefilled Room code', () => {
    window.history.replaceState(null, '', '/?code=invalid')

    render(<SessionLandingPage />)

    expect(screen.getByLabelText('Room code')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Join' })).toBeDisabled()
  })

  it('joins with only a Room code and stores the assigned Device nickname', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          participantToken: 'participant_token',
          participant: { id: 'p1', nickname: 'Device 1' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    render(<SessionLandingPage />)
    await user.type(screen.getByLabelText('Room code'), 'abc234')

    const join = screen.getByRole('button', { name: 'Join' })
    expect(join).toBeEnabled()
    expect(screen.queryByText('Leave blank to receive a Device number.')).toBeNull()
    await user.click(join)

    expect(fetch).toHaveBeenCalledWith('/api/session/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: 'ABC234',
        nickname: '',
        participantToken: '',
      }),
    })
    expect(localStorage.getItem('paramedic-monitor.participant.ABC234')).toContain('Device 1')
    expect(push).toHaveBeenCalledWith('/session/ABC234/waiting')
  })
})
