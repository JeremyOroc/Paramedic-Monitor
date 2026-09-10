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
  })

  afterEach(() => vi.restoreAllMocks())

  it('shows a waiting state before the trainee publishes a monitor', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      session: { status: 'active', active_attempt_version: 1 },
      participant: { nickname: 'Alice', last_seen_at: new Date().toISOString() },
      projection: null,
    }), { status: 200 }))

    render(<SpectatePage />)

    expect(await screen.findByRole('status')).toHaveTextContent(
      'WAITING FOR TRAINEE MONITOR. The view appears when the trainee opens the monitor',
    )
    expect(screen.getByTestId('spectator-availability-overlay')).toHaveClass('bg-black')
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('renders the latest frame inside an inert surface with live metadata', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      session: { status: 'active', active_attempt_version: 1 },
      participant: { nickname: 'Alice', last_seen_at: new Date().toISOString() },
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
    expect(screen.getByRole('status')).toHaveTextContent('LIVE')
    expect(screen.queryByTestId('spectator-availability-overlay')).toBeNull()
    expect(screen.getAllByRole('status')).toHaveLength(1)
    await waitFor(() => expect(container.querySelector('[inert]')).not.toBeNull())
  })

  it('keeps a healthy projection Live when the simulated monitor is powered off', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      session: { status: 'active', active_attempt_version: 1 },
      participant: { nickname: 'Alice', last_seen_at: new Date().toISOString() },
      projection: {
        streamId: 'stream-1',
        clientSequence: 3,
        attemptVersion: 1,
        updatedAt: new Date().toISOString(),
        projection: { version: 1, model: 'wagamiX', powerState: 'off' },
      },
    }), { status: 200 }))

    render(<SpectatePage />)

    expect(await screen.findByTestId('projected-monitor')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('LIVE')
    expect(screen.queryByTestId('spectator-availability-overlay')).toBeNull()
  })

  it('distinguishes a stale trainee heartbeat from a spectator connection failure', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      session: { status: 'active', active_attempt_version: 1 },
      participant: { nickname: 'Alice', last_seen_at: new Date(Date.now() - 10_000).toISOString() },
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
    expect(screen.getByRole('status')).toHaveTextContent('TRAINEE OFFLINE')
    expect(screen.getByTestId('spectator-availability-overlay')).toHaveClass('bg-black/85')
    expect(screen.getByText(/Updated/)).toBeInTheDocument()
  })

  it('reports spectator connection loss without discarding the page', async () => {
    vi.spyOn(window, 'fetch').mockRejectedValue(new Error('network down'))

    render(<SpectatePage />)

    expect(await screen.findByRole('status')).toHaveTextContent(
      'SPECTATOR CONNECTION LOST. Trying to reconnect…',
    )
    expect(screen.getByTestId('spectator-availability-overlay')).toHaveClass('bg-black')
  })

  it('keeps the last monitor visible after the instructor ends the room', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      session: { status: 'ended', active_attempt_version: 1 },
      participant: { nickname: 'Alice', last_seen_at: new Date().toISOString() },
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
    expect(screen.getByRole('status')).toHaveTextContent('ROOM ENDED. Final monitor state')
    expect(screen.getByTestId('spectator-availability-overlay')).toHaveClass('bg-black/85')
  })

  it('clears the previous frame when a new attempt starts', async () => {
    const fetchMock = vi.spyOn(window, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({
        session: { status: 'active', active_attempt_version: 1 },
        participant: { nickname: 'Alice', last_seen_at: new Date().toISOString() },
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
        participant: { nickname: 'Alice', last_seen_at: new Date().toISOString() },
        projection: null,
      }), { status: 200 }))

    render(<SpectatePage />)
    expect(await screen.findByTestId('projected-monitor')).toBeInTheDocument()

    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(1), { timeout: 2500 })
    await waitFor(() => expect(screen.queryByTestId('projected-monitor')).toBeNull())
    expect(screen.getByText('Attempt 2')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      'ATTEMPT NOT STARTED. Start / Dispatch to begin the attempt',
    )
    expect(screen.getByTestId('spectator-availability-overlay')).toHaveClass('bg-black')
  })

  it('shows the first failed poll immediately and clears the veil on the next healthy poll', async () => {
    const fetchMock = vi.spyOn(window, 'fetch')
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValue(new Response(JSON.stringify({
        session: { status: 'active', active_attempt_version: 1 },
        participant: { nickname: 'Alice', last_seen_at: new Date().toISOString() },
        projection: {
          streamId: 'stream-1',
          clientSequence: 3,
          attemptVersion: 1,
          updatedAt: new Date().toISOString(),
          projection: { version: 1, model: 'wagamiX' },
        },
      }), { status: 200 }))

    render(<SpectatePage />)

    expect(await screen.findByRole('status')).toHaveTextContent('SPECTATOR CONNECTION LOST')
    expect(screen.getByTestId('spectator-availability-overlay')).toBeInTheDocument()
    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(1), { timeout: 2500 })
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('LIVE'))
    expect(screen.queryByTestId('spectator-availability-overlay')).toBeNull()
  })

  it('supports eight independently polling spectator views without a client-side cap', async () => {
    const fetchMock = vi.spyOn(window, 'fetch').mockImplementation(async () =>
      new Response(JSON.stringify({
        session: { status: 'active', active_attempt_version: 1 },
        participant: { nickname: 'Alice', last_seen_at: new Date().toISOString() },
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
