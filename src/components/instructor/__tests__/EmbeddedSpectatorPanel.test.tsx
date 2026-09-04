import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

import { EmbeddedSpectatorPanel } from '@/components/instructor/EmbeddedSpectatorPanel'

vi.mock('@/components/instructor/SpectatorMonitor', () => ({
  SpectatorMonitor: ({
    projection,
    embedded,
  }: {
    projection: { model: string }
    embedded?: boolean
  }) => (
    <div data-testid="projected-monitor" data-embedded={String(embedded)}>
      {projection.model}
    </div>
  ),
}))

const participant = {
  id: 'student-1',
  nickname: 'Alice',
  last_seen_at: new Date().toISOString(),
}

describe('EmbeddedSpectatorPanel', () => {
  afterEach(() => vi.restoreAllMocks())

  it('renders the empty black half without starting a poll', () => {
    const fetchMock = vi.spyOn(window, 'fetch')

    render(
      <EmbeddedSpectatorPanel code="ABC123" hostToken="host-token" participant={null} />,
    )

    const panel = screen.getByLabelText('Embedded spectator')
    expect(panel).toHaveClass('h-[480px]', 'bg-black')
    expect(panel).not.toHaveClass('border-cyan-bp/60')
    expect(screen.getByText('Select a student to spectate')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('distinguishes connected waiting from offline with no monitor', async () => {
    const fetchMock = vi.spyOn(window, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({
        session: { status: 'active', active_attempt_version: 1 },
        participant: { nickname: 'Alice', last_seen_at: new Date().toISOString() },
        projection: null,
      }), { status: 200 }))

    const { unmount } = render(
      <EmbeddedSpectatorPanel code="ABC123" hostToken="host-token" participant={participant} />,
    )
    expect(await screen.findByRole('status')).toHaveTextContent('Waiting for trainee monitor')
    unmount()

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      session: { status: 'active', active_attempt_version: 1 },
      participant: {
        nickname: 'Alice',
        last_seen_at: new Date(Date.now() - 20_000).toISOString(),
      },
      projection: null,
    }), { status: 200 }))
    render(
      <EmbeddedSpectatorPanel code="ABC123" hostToken="host-token" participant={participant} />,
    )
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Trainee offline · No monitor received',
    )
  })

  it('contains the full frame in one inert uniformly-scaled canvas', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      session: { status: 'active', active_attempt_version: 1 },
      participant: { nickname: 'Alice', last_seen_at: new Date().toISOString() },
      projection: {
        updatedAt: new Date().toISOString(),
        projection: { model: 'wagamiZ' },
      },
    }), { status: 200 }))

    const { container } = render(
      <EmbeddedSpectatorPanel code="ABC123" hostToken="host-token" participant={participant} />,
    )

    expect(await screen.findByTestId('projected-monitor')).toHaveAttribute('data-embedded', 'true')
    expect(screen.getByText('Wagami Z')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Live')
    expect(screen.queryByText(/Updated/)).toBeNull()
    expect(container.querySelector('[inert]')).not.toBeNull()
    expect(container.querySelector('.embedded-spectator-canvas')).toHaveClass(
      'h-[753px]',
      'w-[1024px]',
    )
  })

  it('keeps the final frame and shows its timestamp after the room ends', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      session: { status: 'ended', active_attempt_version: 1 },
      participant: { nickname: 'Alice', last_seen_at: new Date().toISOString() },
      projection: {
        updatedAt: new Date().toISOString(),
        projection: { model: 'wagamiX' },
      },
    }), { status: 200 }))

    render(
      <EmbeddedSpectatorPanel code="ABC123" hostToken="host-token" participant={participant} />,
    )

    expect(await screen.findByTestId('projected-monitor')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Room ended')
    await waitFor(() => expect(screen.getByText(/Updated/)).toBeInTheDocument())
  })
})
