import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { RoomLauncher } from '@/components/session/RoomLauncher'
import { useMonitorStore } from '@/store/monitorStore'

const push = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('RoomLauncher', () => {
  beforeEach(() => {
    localStorage.clear()
    push.mockClear()
    vi.restoreAllMocks()
    useMonitorStore.getState().reset()
  })

  it('creates an Account-owned Room, stores its controller locally, and opens a clean URL', async () => {
    const user = userEvent.setup()
    useMonitorStore.getState().setDraft('hr', 145)
    vi.spyOn(window, 'fetch').mockResolvedValue(jsonResponse({
      session: { code: 'ABC123' },
      controllerToken: 'controller-secret',
      instructorUrl: '/session/ABC123/instructor',
    }))

    render(<RoomLauncher />)
    await user.click(screen.getByRole('button', { name: 'Create Room' }))

    expect(fetch).toHaveBeenCalledWith('/api/session/create', { method: 'POST' })
    expect(push).toHaveBeenCalledWith('/session/ABC123/instructor')
    expect(localStorage.getItem('paramedic-monitor.controller.ABC123')).toContain('controller-secret')
    expect(useMonitorStore.getState().draft.hr).toBe(0)
  })

  it('offers to reopen the one live Room and claims this browser as controller', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.spyOn(window, 'fetch')
      .mockResolvedValueOnce(jsonResponse({
        error: 'You already have an active room',
        existingRoom: { code: 'LIVE12', status: 'active' },
      }, 409))
      .mockResolvedValueOnce(jsonResponse({ controllerToken: 'reopened-secret' }))

    render(<RoomLauncher />)
    await user.click(screen.getByRole('button', { name: 'Create Room' }))
    expect(await screen.findByText(/LIVE12/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reopen Room' }))

    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/session/LIVE12/control', { method: 'POST' })
    expect(localStorage.getItem('paramedic-monitor.controller.LIVE12')).toContain('reopened-secret')
    expect(push).toHaveBeenCalledWith('/session/LIVE12/instructor')
  })

  it('confirms before ending the existing Room and creating a replacement', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.spyOn(window, 'fetch')
      .mockResolvedValueOnce(jsonResponse({
        existingRoom: { code: 'LIVE12', status: 'waiting' },
      }, 409))
      .mockResolvedValueOnce(jsonResponse({ controllerToken: 'claimed-secret' }))
      .mockResolvedValueOnce(jsonResponse({ session: { status: 'ended' } }))
      .mockResolvedValueOnce(jsonResponse({
        session: { code: 'NEW123' },
        controllerToken: 'new-secret',
        instructorUrl: '/session/NEW123/instructor',
      }))

    render(<RoomLauncher />)
    await user.click(screen.getByRole('button', { name: 'Create Room' }))
    await user.click(await screen.findByRole('button', { name: 'End and create new' }))
    expect(screen.getByRole('alertdialog')).toHaveTextContent('End the existing Room?')

    await user.click(screen.getByRole('alertdialog').querySelectorAll('button')[1])

    await waitFor(() => expect(push).toHaveBeenCalledWith('/session/NEW123/instructor'))
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/session/LIVE12/end', {
      method: 'POST',
      headers: { 'x-room-controller-token': 'claimed-secret' },
    })
    expect(fetchMock).toHaveBeenNthCalledWith(4, '/api/session/create', { method: 'POST' })
  })
})
