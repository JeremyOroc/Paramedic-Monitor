import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { SessionInstructorClient } from '@/components/session/SessionInstructorClient'

vi.mock('@/components/instructor/AdminPage', () => ({
  default: ({
    session,
  }: {
    session?: {
      code: string
      controllerToken: string
      canControl?: boolean
      onTakeControl?: () => void
    }
  }) => (
    <div data-testid="admin-stub">
      <span>{session?.code}:{session?.controllerToken}:{String(session?.canControl)}</span>
      <button type="button" onClick={session?.onTakeControl}>Take control stub</button>
    </div>
  ),
}))

const STORAGE_KEY = 'paramedic-monitor.controller.ABC123'

describe('SessionInstructorClient', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('resumes controller access from browser storage without placing a secret in the URL', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ controllerToken: 'stored-secret' }))
    const fetchMock = vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      session: { code: 'ABC123', status: 'active' },
      canControl: true,
    }), { status: 200 }))

    render(<SessionInstructorClient code="ABC123" />)

    await waitFor(() => {
      expect(screen.getByTestId('admin-stub')).toHaveTextContent('ABC123:stored-secret:true')
    })
    expect(fetchMock).toHaveBeenCalledWith('/api/session/ABC123/control', {
      headers: { 'x-room-controller-token': 'stored-secret' },
      cache: 'no-store',
    })
  })

  it('opens read-only and requires confirmation before rotating controller access', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.spyOn(window, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({
        session: { code: 'ABC123', status: 'active' },
        canControl: false,
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        controllerToken: 'rotated-secret',
      }), { status: 200 }))

    render(<SessionInstructorClient code="ABC123" />)
    await waitFor(() => expect(screen.getByTestId('admin-stub')).toHaveTextContent('ABC123::false'))

    await user.click(screen.getByRole('button', { name: 'Take control stub' }))
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Take control of this Room?')
    await user.click(screen.getByRole('button', { name: 'Take control' }))

    await waitFor(() => {
      expect(screen.getByTestId('admin-stub')).toHaveTextContent('ABC123:rotated-secret:true')
    })
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/session/ABC123/control', { method: 'POST' })
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')).toEqual({
      controllerToken: 'rotated-secret',
    })
  })

  it('shows Room unavailable when ownership cannot be established', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response(
      JSON.stringify({ error: 'Room not found' }),
      { status: 404 },
    ))

    render(<SessionInstructorClient code="ABC123" />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Room not found')
    expect(screen.queryByTestId('admin-stub')).toBeNull()
    expect(screen.getByRole('link', { name: 'Return to console' })).toHaveAttribute('href', '/instructor')
  })
})
