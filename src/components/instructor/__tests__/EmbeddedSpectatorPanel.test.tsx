import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'

import {
  EmbeddedSpectatorPanel,
  type SpectatorPresentationMode,
} from '@/components/instructor/EmbeddedSpectatorPanel'

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
const originalRequestFullscreen = Object.getOwnPropertyDescriptor(
  Element.prototype,
  'requestFullscreen',
)
const originalFullscreenEnabled = Object.getOwnPropertyDescriptor(
  document,
  'fullscreenEnabled',
)
const originalFullscreenElement = Object.getOwnPropertyDescriptor(
  document,
  'fullscreenElement',
)
const originalExitFullscreen = Object.getOwnPropertyDescriptor(document, 'exitFullscreen')

const modeProps = {
  mode: 'docked' as const,
  onModeChange: () => {},
  onStopSpectating: () => {},
}

function installFullscreenMock() {
  let fullscreenElement: Element | null = null
  Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true })
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    get: () => fullscreenElement,
  })
  Object.defineProperty(Element.prototype, 'requestFullscreen', {
    configurable: true,
    value: vi.fn(() => {
      fullscreenElement = document.querySelector('[data-spectator-mode]')
      document.dispatchEvent(new Event('fullscreenchange'))
      return Promise.resolve()
    }),
  })
  Object.defineProperty(document, 'exitFullscreen', {
    configurable: true,
    value: vi.fn(() => {
      fullscreenElement = null
      document.dispatchEvent(new Event('fullscreenchange'))
      return Promise.resolve()
    }),
  })

  return {
    simulateNativeExit: () => {
      fullscreenElement = null
      document.dispatchEvent(new Event('fullscreenchange'))
    },
  }
}

function SpectatorHarness({
  initialMode = 'docked',
}: {
  initialMode?: SpectatorPresentationMode
}) {
  const [mode, setMode] = useState<SpectatorPresentationMode>(initialMode)
  const [selectedParticipant, setSelectedParticipant] = useState<typeof participant | null>(
    participant,
  )

  return (
    <EmbeddedSpectatorPanel
      code="ABC123"
      hostToken="host-token"
      participant={selectedParticipant}
      mode={mode}
      onModeChange={setMode}
      onStopSpectating={() => setSelectedParticipant(null)}
    />
  )
}

describe('EmbeddedSpectatorPanel', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    for (const [target, property, descriptor] of [
      [Element.prototype, 'requestFullscreen', originalRequestFullscreen],
      [document, 'fullscreenEnabled', originalFullscreenEnabled],
      [document, 'fullscreenElement', originalFullscreenElement],
      [document, 'exitFullscreen', originalExitFullscreen],
    ] as const) {
      if (descriptor) Object.defineProperty(target, property, descriptor)
      else Reflect.deleteProperty(target, property)
    }
  })

  it('renders the empty black half without starting a poll', () => {
    const fetchMock = vi.spyOn(window, 'fetch')

    render(
      <EmbeddedSpectatorPanel
        code="ABC123"
        hostToken="host-token"
        participant={null}
        {...modeProps}
      />,
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
      <EmbeddedSpectatorPanel code="ABC123" hostToken="host-token" participant={participant} {...modeProps} />,
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
      <EmbeddedSpectatorPanel code="ABC123" hostToken="host-token" participant={participant} {...modeProps} />,
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
      <EmbeddedSpectatorPanel code="ABC123" hostToken="host-token" participant={participant} {...modeProps} />,
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
      <EmbeddedSpectatorPanel code="ABC123" hostToken="host-token" participant={participant} {...modeProps} />,
    )

    expect(await screen.findByTestId('projected-monitor')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Room ended')
    await waitFor(() => expect(screen.getByText(/Updated/)).toBeInTheDocument())
  })

  it('pins and restores one player without starting another projection poll', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      session: { status: 'active', active_attempt_version: 1 },
      participant: { nickname: 'Alice', last_seen_at: new Date().toISOString() },
      projection: null,
    }), { status: 200 }))

    render(<SpectatorHarness />)
    await screen.findByText('Waiting for trainee monitor', { selector: 'p' })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Pin spectator mini-player' }))
    expect(screen.getByText('Spectator pinned')).toBeInTheDocument()
    expect(screen.getByLabelText('Spectating Alice')).toHaveAttribute(
      'data-spectator-mode',
      'floating',
    )
    expect(screen.getByLabelText('Spectating Alice')).toHaveClass('fixed', 'z-40')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Return spectator to dock' })).toHaveFocus())
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Return spectator to dock' }))
    expect(screen.queryByText('Spectator pinned')).toBeNull()
    expect(screen.getByLabelText('Spectating Alice')).toHaveAttribute(
      'data-spectator-mode',
      'docked',
    )
    await waitFor(() => expect(screen.getByRole('button', { name: 'Pin spectator mini-player' })).toHaveFocus())
  })

  it('returns fullscreen to the mode it was entered from', async () => {
    const user = userEvent.setup()
    installFullscreenMock()
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      session: { status: 'active', active_attempt_version: 1 },
      participant: { nickname: 'Alice', last_seen_at: new Date().toISOString() },
      projection: null,
    }), { status: 200 }))

    render(<SpectatorHarness initialMode="floating" />)
    await user.click(screen.getByRole('button', { name: 'Enter spectator fullscreen' }))
    await waitFor(() => expect(screen.getByLabelText('Spectating Alice')).toHaveAttribute(
      'data-spectator-mode',
      'fullscreen',
    ))
    expect(screen.getByRole('button', { name: 'Exit spectator fullscreen' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Exit spectator fullscreen' }))
    await waitFor(() => expect(screen.getByLabelText('Spectating Alice')).toHaveAttribute(
      'data-spectator-mode',
      'floating',
    ))
    expect(screen.getByText('Spectator pinned')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Enter spectator fullscreen' })).toHaveFocus())
  })

  it('uses native fullscreen exit events to restore the prior docked mode', async () => {
    const user = userEvent.setup()
    const fullscreen = installFullscreenMock()
    vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          session: { status: 'active', active_attempt_version: 1 },
          participant: { nickname: 'Alice', last_seen_at: new Date().toISOString() },
          projection: null,
        }),
        { status: 200 },
      ),
    )

    render(<SpectatorHarness />)
    await user.click(screen.getByRole('button', { name: 'Enter spectator fullscreen' }))
    await waitFor(() =>
      expect(screen.getByLabelText('Spectating Alice')).toHaveAttribute(
        'data-spectator-mode',
        'fullscreen',
      ),
    )

    act(() => fullscreen.simulateNativeExit())

    await waitFor(() =>
      expect(screen.getByLabelText('Spectating Alice')).toHaveAttribute(
        'data-spectator-mode',
        'docked',
      ),
    )
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Enter spectator fullscreen' })).toHaveFocus(),
    )
  })

  it('keeps the current mode and reports a rejected fullscreen request', async () => {
    const timeoutSpy = vi.spyOn(window, 'setTimeout')
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true })
    Object.defineProperty(Element.prototype, 'requestFullscreen', {
      configurable: true,
      value: vi.fn().mockRejectedValue(new Error('denied')),
    })
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      session: { status: 'active', active_attempt_version: 1 },
      participant: { nickname: 'Alice', last_seen_at: new Date().toISOString() },
      projection: null,
    }), { status: 200 }))

    render(<SpectatorHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'Enter spectator fullscreen' }))
    await act(async () => Promise.resolve())

    expect(await screen.findByRole('status')).toHaveTextContent('Fullscreen unavailable')
    expect(screen.getByLabelText('Spectating Alice')).toHaveAttribute(
      'data-spectator-mode',
      'docked',
    )

    const errorTimer = timeoutSpy.mock.calls.find(([, delay]) => delay === 3000)?.[0]
    expect(errorTimer).toBeTypeOf('function')
    if (typeof errorTimer === 'function') act(() => errorTimer())
    expect(screen.getByRole('status')).toHaveTextContent('Waiting for trainee monitor')
  })

  it('disables fullscreen with an explanatory tooltip when the API is unavailable', () => {
    Reflect.deleteProperty(Element.prototype, 'requestFullscreen')
    Object.defineProperty(document, 'fullscreenEnabled', {
      configurable: true,
      value: false,
    })
    vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          session: { status: 'active', active_attempt_version: 1 },
          participant: { nickname: 'Alice', last_seen_at: new Date().toISOString() },
          projection: null,
        }),
        { status: 200 },
      ),
    )

    render(<SpectatorHarness />)

    const fullscreenButton = screen.getByRole('button', {
      name: 'Fullscreen is not supported by this browser',
    })
    expect(fullscreenButton).toBeDisabled()
    expect(fullscreenButton).toHaveAttribute(
      'title',
      'Fullscreen is not supported by this browser',
    )
  })

  it('stops directly from the floating player', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      session: { status: 'active', active_attempt_version: 1 },
      participant: { nickname: 'Alice', last_seen_at: new Date().toISOString() },
      projection: null,
    }), { status: 200 }))

    render(<SpectatorHarness initialMode="floating" />)
    await user.click(screen.getByRole('button', { name: 'Stop spectating' }))

    expect(screen.getByText('Select a student to spectate')).toBeInTheDocument()
    expect(screen.queryByText('Spectator pinned')).toBeNull()
  })
})
