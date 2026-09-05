import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'

import {
  adjacentSpectatorCorner,
  EmbeddedSpectatorPanel,
  spectatorCornerFromPoint,
  type SpectatorCorner,
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
const originalInnerWidth = Object.getOwnPropertyDescriptor(window, 'innerWidth')
const originalInnerHeight = Object.getOwnPropertyDescriptor(window, 'innerHeight')

const modeProps = {
  mode: 'docked' as const,
  onModeChange: () => {},
  onStopSpectating: () => {},
}

class TestPointerEvent extends MouseEvent {
  readonly pointerId: number
  readonly isPrimary: boolean

  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init)
    this.pointerId = init.pointerId ?? 0
    this.isPrimary = init.isPrimary ?? false
  }
}

function installPointerEventMock() {
  vi.stubGlobal('PointerEvent', TestPointerEvent)
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 })
}

function mockFloatingGeometry(player: HTMLElement) {
  return vi.spyOn(player, 'getBoundingClientRect').mockImplementation(() => {
    const corner = (player.dataset.spectatorCorner ?? 'bottom-right') as SpectatorCorner
    const x = corner.endsWith('left') ? 16 : 688
    const y = corner.startsWith('top') ? 16 : 502
    const dragX = Number.parseFloat(
      player.style.getPropertyValue('--spectator-drag-x'),
    ) || 0
    const dragY = Number.parseFloat(
      player.style.getPropertyValue('--spectator-drag-y'),
    ) || 0
    const left = x + dragX
    const top = y + dragY
    return {
      bottom: top + 250,
      height: 250,
      left,
      right: left + 320,
      top,
      width: 320,
      x: left,
      y: top,
      toJSON: () => ({}),
    }
  })
}

function mockWaitingProjection() {
  return vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({
    session: { status: 'active', active_attempt_version: 1 },
    participant: { nickname: 'Alice', last_seen_at: new Date().toISOString() },
    projection: null,
  }), { status: 200 }))
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

function RestartableSpectatorHarness() {
  const [mode, setMode] = useState<SpectatorPresentationMode>('floating')
  const [selectedParticipant, setSelectedParticipant] = useState<typeof participant | null>(
    participant,
  )

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSelectedParticipant(participant)
          setMode('floating')
        }}
      >
        Spectate Alice again
      </button>
      <EmbeddedSpectatorPanel
        code="ABC123"
        hostToken="host-token"
        participant={selectedParticipant}
        mode={mode}
        onModeChange={setMode}
        onStopSpectating={() => setSelectedParticipant(null)}
      />
    </>
  )
}

describe('EmbeddedSpectatorPanel', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    for (const [target, property, descriptor] of [
      [Element.prototype, 'requestFullscreen', originalRequestFullscreen],
      [document, 'fullscreenEnabled', originalFullscreenEnabled],
      [document, 'fullscreenElement', originalFullscreenElement],
      [document, 'exitFullscreen', originalExitFullscreen],
    ] as const) {
      if (descriptor) Object.defineProperty(target, property, descriptor)
      else Reflect.deleteProperty(target, property)
    }
    if (originalInnerWidth) Object.defineProperty(window, 'innerWidth', originalInnerWidth)
    if (originalInnerHeight) Object.defineProperty(window, 'innerHeight', originalInnerHeight)
  })

  it('maps pointer centers and arrow keys across the four corners', () => {
    expect(spectatorCornerFromPoint(100, 100, 1000, 800)).toBe('top-left')
    expect(spectatorCornerFromPoint(900, 100, 1000, 800)).toBe('top-right')
    expect(spectatorCornerFromPoint(100, 700, 1000, 800)).toBe('bottom-left')
    expect(spectatorCornerFromPoint(900, 700, 1000, 800)).toBe('bottom-right')
    expect(adjacentSpectatorCorner('bottom-right', 'ArrowUp')).toBe('top-right')
    expect(adjacentSpectatorCorner('top-right', 'ArrowLeft')).toBe('top-left')
    expect(adjacentSpectatorCorner('top-left', 'ArrowDown')).toBe('bottom-left')
    expect(adjacentSpectatorCorner('bottom-left', 'ArrowRight')).toBe('bottom-right')
    expect(adjacentSpectatorCorner('top-left', 'ArrowUp')).toBe('top-left')
  })

  it('provides a keyboard-accessible grip for all four pinned corners', () => {
    mockWaitingProjection()
    render(<SpectatorHarness initialMode="floating" />)

    const player = screen.getByLabelText('Spectating Alice')
    const handle = screen.getByRole('button', { name: 'Move spectator mini-player' })
    expect(handle).toHaveAttribute('title', 'Move spectator mini-player')
    expect(handle).toHaveAttribute(
      'aria-keyshortcuts',
      'ArrowUp ArrowDown ArrowLeft ArrowRight Escape',
    )
    expect(player).toHaveAttribute('data-spectator-corner', 'bottom-right')

    fireEvent.keyDown(handle, { key: 'ArrowUp' })
    expect(player).toHaveAttribute('data-spectator-corner', 'top-right')
    expect(screen.getByText('Mini-player pinned top right')).toBeInTheDocument()
    fireEvent.keyDown(handle, { key: 'ArrowLeft' })
    expect(player).toHaveAttribute('data-spectator-corner', 'top-left')
    fireEvent.keyDown(handle, { key: 'ArrowDown' })
    expect(player).toHaveAttribute('data-spectator-corner', 'bottom-left')
    fireEvent.keyDown(handle, { key: 'ArrowRight' })
    expect(player).toHaveAttribute('data-spectator-corner', 'bottom-right')
  })

  it('follows the primary pointer after 6px and pins by the player center quadrant', () => {
    installPointerEventMock()
    mockWaitingProjection()
    render(<SpectatorHarness initialMode="floating" />)

    const player = screen.getByLabelText('Spectating Alice')
    const handle = screen.getByRole('button', { name: 'Move spectator mini-player' })
    mockFloatingGeometry(player)

    fireEvent.pointerDown(handle, {
      button: 0,
      clientX: 800,
      clientY: 600,
      isPrimary: true,
      pointerId: 1,
    })
    fireEvent.pointerMove(handle, {
      button: 0,
      clientX: 100,
      clientY: 100,
      isPrimary: true,
      pointerId: 1,
    })

    expect(player).toHaveAttribute('data-spectator-drag-state', 'dragging')
    expect(player.style.getPropertyValue('--spectator-drag-x')).toBe('-688px')
    expect(player.style.getPropertyValue('--spectator-drag-y')).toBe('-500px')
    expect(screen.getByTestId('spectator-corner-target')).toHaveAttribute(
      'data-spectator-corner',
      'top-left',
    )

    fireEvent.pointerUp(handle, {
      button: 0,
      clientX: 100,
      clientY: 100,
      isPrimary: true,
      pointerId: 1,
    })

    expect(player).toHaveAttribute('data-spectator-corner', 'top-left')
    expect(player).toHaveAttribute('data-spectator-drag-state', 'snapping')
    expect(screen.queryByTestId('spectator-corner-target')).toBeNull()
    expect(screen.getByText('Mini-player pinned top left')).toBeInTheDocument()
  })

  it('ignores sub-threshold, secondary, and non-primary pointer gestures', () => {
    installPointerEventMock()
    mockWaitingProjection()
    render(<SpectatorHarness initialMode="floating" />)

    const player = screen.getByLabelText('Spectating Alice')
    const handle = screen.getByRole('button', { name: 'Move spectator mini-player' })
    mockFloatingGeometry(player)

    fireEvent.pointerDown(handle, {
      button: 0,
      clientX: 800,
      clientY: 600,
      isPrimary: true,
      pointerId: 1,
    })
    fireEvent.pointerMove(handle, {
      button: 0,
      clientX: 805,
      clientY: 600,
      isPrimary: true,
      pointerId: 1,
    })
    fireEvent.pointerUp(handle, {
      button: 0,
      clientX: 805,
      clientY: 600,
      isPrimary: true,
      pointerId: 1,
    })
    fireEvent.pointerDown(handle, {
      button: 2,
      clientX: 800,
      clientY: 600,
      isPrimary: true,
      pointerId: 2,
    })
    fireEvent.pointerMove(handle, {
      button: 2,
      clientX: 100,
      clientY: 100,
      isPrimary: true,
      pointerId: 2,
    })
    fireEvent.pointerDown(handle, {
      button: 0,
      clientX: 800,
      clientY: 600,
      isPrimary: false,
      pointerId: 3,
    })
    fireEvent.pointerMove(handle, {
      button: 0,
      clientX: 100,
      clientY: 100,
      isPrimary: false,
      pointerId: 3,
    })

    expect(player).toHaveAttribute('data-spectator-corner', 'bottom-right')
    expect(player).toHaveAttribute('data-spectator-drag-state', 'idle')
    expect(screen.queryByTestId('spectator-corner-target')).toBeNull()
  })

  it('restores the prior corner when Escape, pointer cancellation, or resize interrupts a drag', () => {
    installPointerEventMock()
    mockWaitingProjection()
    render(<SpectatorHarness initialMode="floating" />)

    const player = screen.getByLabelText('Spectating Alice')
    const handle = screen.getByRole('button', { name: 'Move spectator mini-player' })
    mockFloatingGeometry(player)

    const startDrag = (pointerId: number) => {
      fireEvent.pointerDown(handle, {
        button: 0,
        clientX: 800,
        clientY: 600,
        isPrimary: true,
        pointerId,
      })
      fireEvent.pointerMove(handle, {
        button: 0,
        clientX: 100,
        clientY: 100,
        isPrimary: true,
        pointerId,
      })
    }

    startDrag(1)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(player).toHaveAttribute('data-spectator-corner', 'bottom-right')
    expect(screen.queryByTestId('spectator-corner-target')).toBeNull()

    startDrag(2)
    fireEvent.pointerCancel(handle, { isPrimary: true, pointerId: 2 })
    expect(player).toHaveAttribute('data-spectator-corner', 'bottom-right')

    startDrag(3)
    fireEvent(window, new Event('resize'))
    expect(player).toHaveAttribute('data-spectator-corner', 'bottom-right')
    expect(screen.queryByTestId('spectator-corner-target')).toBeNull()
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

    fireEvent.keyDown(screen.getByRole('button', { name: 'Move spectator mini-player' }), {
      key: 'ArrowUp',
    })
    expect(screen.getByLabelText('Spectating Alice')).toHaveAttribute(
      'data-spectator-corner',
      'top-right',
    )

    await user.click(screen.getByRole('button', { name: 'Return spectator to dock' }))
    expect(screen.queryByText('Spectator pinned')).toBeNull()
    expect(screen.getByLabelText('Spectating Alice')).toHaveAttribute(
      'data-spectator-mode',
      'docked',
    )
    await waitFor(() => expect(screen.getByRole('button', { name: 'Pin spectator mini-player' })).toHaveFocus())

    await user.click(screen.getByRole('button', { name: 'Pin spectator mini-player' }))
    expect(screen.getByLabelText('Spectating Alice')).toHaveAttribute(
      'data-spectator-corner',
      'top-right',
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
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
    fireEvent.keyDown(screen.getByRole('button', { name: 'Move spectator mini-player' }), {
      key: 'ArrowUp',
    })
    expect(screen.getByLabelText('Spectating Alice')).toHaveAttribute(
      'data-spectator-corner',
      'top-right',
    )
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
    expect(screen.getByLabelText('Spectating Alice')).toHaveAttribute(
      'data-spectator-corner',
      'top-right',
    )
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

  it('resets the next floating player to bottom-right after Stop Spectating', async () => {
    const user = userEvent.setup()
    mockWaitingProjection()
    render(<RestartableSpectatorHarness />)

    fireEvent.keyDown(screen.getByRole('button', { name: 'Move spectator mini-player' }), {
      key: 'ArrowLeft',
    })
    expect(screen.getByLabelText('Spectating Alice')).toHaveAttribute(
      'data-spectator-corner',
      'bottom-left',
    )

    await user.click(screen.getByRole('button', { name: 'Stop spectating' }))
    await user.click(screen.getByRole('button', { name: 'Spectate Alice again' }))

    expect(screen.getByLabelText('Spectating Alice')).toHaveAttribute(
      'data-spectator-corner',
      'bottom-right',
    )
  })
})
