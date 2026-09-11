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

  it('shows the existing Room immediately and claims this browser when reopening it', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.spyOn(window, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ controllerToken: 'reopened-secret' }))

    render(<RoomLauncher initialExistingRoom={{ code: 'LIVE12', status: 'active' }} />)
    expect(screen.getByText('Room LIVE12 is active.')).toBeInTheDocument()
    expect(screen.getByText(/You already own Room/)).toHaveTextContent('LIVE12')
    expect(screen.queryByRole('button', { name: 'Create Room' })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Reopen Room' }))

    expect(fetchMock).toHaveBeenCalledWith('/api/session/LIVE12/control', { method: 'POST' })
    expect(localStorage.getItem('paramedic-monitor.controller.LIVE12')).toContain('reopened-secret')
    expect(push).toHaveBeenCalledWith('/session/LIVE12/instructor')
  })

  it('still reveals a raced existing Room when Create Room reports a conflict', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'fetch').mockResolvedValue(jsonResponse({
      error: 'You already have an active room',
      existingRoom: { code: 'RACE12', status: 'waiting' },
    }, 409))

    render(<RoomLauncher />)
    await user.click(screen.getByRole('button', { name: 'Create Room' }))

    expect(await screen.findByText('Room RACE12 is waiting.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Create Room' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Close Room' })).toBeInTheDocument()
  })

  it('confirms before closing the existing Room and restores room creation', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.spyOn(window, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ controllerToken: 'claimed-secret' }))
      .mockResolvedValueOnce(jsonResponse({ session: { status: 'ended' } }))
    localStorage.setItem(
      'paramedic-monitor.controller.LIVE12',
      JSON.stringify({ controllerToken: 'old-secret' }),
    )

    render(<RoomLauncher initialExistingRoom={{ code: 'LIVE12', status: 'waiting' }} />)
    await user.click(screen.getByRole('button', { name: 'Close Room' }))
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Close the existing Room?')

    await user.click(screen.getByRole('alertdialog').querySelectorAll('button')[1])

    await waitFor(() => expect(screen.getByRole('button', { name: 'Create Room' })).toBeInTheDocument())
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/session/LIVE12/control', { method: 'POST' })
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/session/LIVE12/end', {
      method: 'POST',
      headers: { 'x-room-controller-token': 'claimed-secret' },
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(localStorage.getItem('paramedic-monitor.controller.LIVE12')).toBeNull()
    expect(push).not.toHaveBeenCalled()
  })
})
