import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

import SpectatePage from '@/app/session/[code]/instructor/spectate/[participantId]/page'

vi.mock('next/navigation', () => ({
  useParams: () => ({ code: 'abc123', participantId: 'student-1' }),
}))

vi.mock('@/components/instructor/SpectatorMonitor', () => ({
  SpectatorMonitor: () => <div data-testid="projected-monitor">Projected monitor</div>,
}))

describe('SpectatePage', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem(
      'paramedic-monitor.host.ABC123',
      JSON.stringify({ hostToken: 'host-token' }),
    )
  })

  afterEach(() => vi.restoreAllMocks())

  it('shows a waiting state before the trainee publishes a monitor', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      session: { status: 'active', active_attempt_version: 1 },
      participant: { nickname: 'Alice' },
      projection: null,
    }), { status: 200 }))

    render(<SpectatePage />)

    expect(await screen.findByRole('status')).toHaveTextContent('Waiting for trainee monitor')
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('renders the latest frame inside an inert surface with live metadata', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      session: { status: 'active', active_attempt_version: 1 },
      participant: { nickname: 'Alice' },
      projection: {
        streamId: 'stream-1',
        clientSequence: 3,
        attemptVersion: 1,
        updatedAt: new Date().toISOString(),
        projection: { version: 1, model: 'wagamiZ' },
      },
    }), { status: 200 }))

    const { container } = render(<SpectatePage />)

    expect(await screen.findByTestId('projected-monitor')).toBeInTheDocument()
    expect(screen.getByText('Wagami Z')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Live')
    await waitFor(() => expect(container.querySelector('[inert]')).not.toBeNull())
  })

  it('distinguishes a stale trainee heartbeat from a spectator connection failure', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      session: { status: 'active', active_attempt_version: 1 },
      participant: { nickname: 'Alice' },
      projection: {
        streamId: 'stream-1',
        clientSequence: 3,
        attemptVersion: 1,
        updatedAt: new Date(Date.now() - 10_000).toISOString(),
        projection: { version: 1, model: 'wagamiX' },
      },
    }), { status: 200 }))

    render(<SpectatePage />)

    expect(await screen.findByTestId('projected-monitor')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Trainee offline')
  })

  it('reports spectator connection loss without discarding the page', async () => {
    vi.spyOn(window, 'fetch').mockRejectedValue(new Error('network down'))

    render(<SpectatePage />)

    expect(await screen.findByRole('status')).toHaveTextContent('Spectator connection lost')
    expect(screen.getByText('Waiting for trainee monitor', { selector: 'p' })).toBeInTheDocument()
  })

  it('keeps the last monitor visible after the instructor ends the room', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      session: { status: 'ended', active_attempt_version: 1 },
      participant: { nickname: 'Alice' },
      projection: {
        streamId: 'stream-1',
        clientSequence: 3,
        attemptVersion: 1,
        updatedAt: new Date().toISOString(),
        projection: { version: 1, model: 'wagamiX' },
      },
    }), { status: 200 }))

    render(<SpectatePage />)

    expect(await screen.findByTestId('projected-monitor')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Room ended')
  })

  it('clears the previous frame when a new attempt starts', async () => {
    const fetchMock = vi.spyOn(window, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({
        session: { status: 'active', active_attempt_version: 1 },
        participant: { nickname: 'Alice' },
        projection: {
          streamId: 'stream-1',
          clientSequence: 3,
          attemptVersion: 1,
          updatedAt: new Date().toISOString(),
          projection: { version: 1, model: 'wagamiX' },
        },
      }), { status: 200 }))
      .mockResolvedValue(new Response(JSON.stringify({
        session: { status: 'waiting', active_attempt_version: 2 },
        participant: { nickname: 'Alice' },
        projection: null,
      }), { status: 200 }))

    render(<SpectatePage />)
    expect(await screen.findByTestId('projected-monitor')).toBeInTheDocument()

    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(1), { timeout: 2500 })
    await waitFor(() => expect(screen.queryByTestId('projected-monitor')).toBeNull())
    expect(screen.getByText('Attempt 2')).toBeInTheDocument()
  })

  it('supports eight independently polling spectator views without a client-side cap', async () => {
    const fetchMock = vi.spyOn(window, 'fetch').mockImplementation(async () =>
      new Response(JSON.stringify({
        session: { status: 'active', active_attempt_version: 1 },
        participant: { nickname: 'Alice' },
        projection: {
          streamId: 'stream-1',
          clientSequence: 3,
          attemptVersion: 1,
          updatedAt: new Date().toISOString(),
          projection: { version: 1, model: 'wagamiX' },
        },
      }), { status: 200 }),
    )

    render(<>{Array.from({ length: 8 }, (_, index) => <SpectatePage key={index} />)}</>)

    await waitFor(() => expect(screen.getAllByTestId('projected-monitor')).toHaveLength(8))
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(8)
  })
})
