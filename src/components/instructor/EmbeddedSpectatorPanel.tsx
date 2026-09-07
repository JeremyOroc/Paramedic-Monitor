'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  RefObject,
} from 'react'

import { SpectatorMonitor } from '@/components/instructor/SpectatorMonitor'
import { useSpectatorProjection } from '@/hooks/useSpectatorProjection'
import { isConnected } from '@/lib/sessionRoster'
import { cn } from '@/lib/utils'

export type SpectatorPresentationMode = 'docked' | 'floating' | 'fullscreen'
export type SpectatorCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

const DEFAULT_SPECTATOR_CORNER: SpectatorCorner = 'bottom-right'
const DRAG_THRESHOLD_PX = 6
const CORNER_SNAP_DURATION_MS = 180

type EmbeddedSpectatorParticipant = {
  id: string
  nickname: string
  last_seen_at: string | null
}

type EmbeddedSpectatorPanelProps = {
  code: string
  participant: EmbeddedSpectatorParticipant | null
  mode: SpectatorPresentationMode
  onModeChange: (mode: SpectatorPresentationMode) => void
  onStopSpectating: () => void
}

type ModeButtonProps = {
  label: string
  buttonRef?: RefObject<HTMLButtonElement | null>
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}

type ActiveDrag = {
  pointerId: number
  startX: number
  startY: number
  startRect: DOMRect
  priorCorner: SpectatorCorner
  moved: boolean
}

function cornerLabel(corner: SpectatorCorner) {
  return corner.replace('-', ' ')
}

export function spectatorCornerFromPoint(
  x: number,
  y: number,
  viewportWidth: number,
  viewportHeight: number,
): SpectatorCorner {
  const horizontal = x < viewportWidth / 2 ? 'left' : 'right'
  const vertical = y < viewportHeight / 2 ? 'top' : 'bottom'
  return `${vertical}-${horizontal}`
}

export function adjacentSpectatorCorner(
  corner: SpectatorCorner,
  key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight',
): SpectatorCorner {
  const [vertical, horizontal] = corner.split('-') as [
    'top' | 'bottom',
    'left' | 'right',
  ]
  const nextVertical = key === 'ArrowUp'
    ? 'top'
    : key === 'ArrowDown'
      ? 'bottom'
      : vertical
  const nextHorizontal = key === 'ArrowLeft'
    ? 'left'
    : key === 'ArrowRight'
      ? 'right'
      : horizontal
  return `${nextVertical}-${nextHorizontal}`
}

function clearDragCoordinates(player: HTMLElement) {
  player.style.removeProperty('--spectator-drag-x')
  player.style.removeProperty('--spectator-drag-y')
}

function ModeButton({
  label,
  buttonRef,
  disabled = false,
  onClick,
  children,
}: ModeButtonProps) {
  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-9 w-9 place-items-center border border-neutral-700 bg-black/80 text-neutral-300 shadow-lg shadow-black/60 hover:border-cyan-bp hover:text-cyan-bp focus:outline-none focus:ring-2 focus:ring-cyan-bp disabled:cursor-not-allowed disabled:opacity-35"
    >
      {children}
    </button>
  )
}

function PinIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-[18px] w-[18px] fill-none stroke-current stroke-2">
      <path d="M6 3h8l-1.5 5 2.5 2.5H5L7.5 8 6 3Z" />
      <path d="M10 10.5V17" />
    </svg>
  )
}

function ReturnIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-[18px] w-[18px] fill-none stroke-current stroke-2">
      <path d="M4 8V4h4M4.5 4.5l5 5M16 12v4h-4M15.5 15.5l-5-5" />
    </svg>
  )
}

function FullscreenIcon({ exit = false }: { exit?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-[18px] w-[18px] fill-none stroke-current stroke-2">
      {exit ? (
        <path d="M8 3v5H3M12 3v5h5M8 17v-5H3M12 17v-5h5" />
      ) : (
        <path d="M8 3H3v5M12 3h5v5M8 17H3v-5M12 17h5v-5" />
      )}
    </svg>
  )
}

function StopIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current stroke-2">
      <path d="m5 5 10 10M15 5 5 15" />
    </svg>
  )
}

function DragHandleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-[18px] w-[18px] fill-current">
      <circle cx="7" cy="5" r="1.25" />
      <circle cx="13" cy="5" r="1.25" />
      <circle cx="7" cy="10" r="1.25" />
      <circle cx="13" cy="10" r="1.25" />
      <circle cx="7" cy="15" r="1.25" />
      <circle cx="13" cy="15" r="1.25" />
    </svg>
  )
}

function focusAfterRender(ref: RefObject<HTMLButtonElement | null>) {
  window.setTimeout(() => ref.current?.focus(), 0)
}

export function EmbeddedSpectatorPanel({
  code,
  participant,
  mode,
  onModeChange,
  onStopSpectating,
}: EmbeddedSpectatorPanelProps) {
  const playerRef = useRef<HTMLElement>(null)
  const pinButtonRef = useRef<HTMLButtonElement>(null)
  const returnButtonRef = useRef<HTMLButtonElement>(null)
  const fullscreenButtonRef = useRef<HTMLButtonElement>(null)
  const exitFullscreenButtonRef = useRef<HTMLButtonElement>(null)
  const fullscreenReturnModeRef = useRef<'docked' | 'floating'>('docked')
  const stoppingRef = useRef(false)
  const fullscreenErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const snapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dragHandleRef = useRef<HTMLButtonElement>(null)
  const activeDragRef = useRef<ActiveDrag | null>(null)
  const cornerRef = useRef<SpectatorCorner>(DEFAULT_SPECTATOR_CORNER)
  const previousParticipantIdRef = useRef(participant?.id ?? null)
  const previousCodeRef = useRef(code)
  const [fullscreenError, setFullscreenError] = useState('')
  const [corner, setCorner] = useState<SpectatorCorner>(DEFAULT_SPECTATOR_CORNER)
  const [dragTarget, setDragTarget] = useState<SpectatorCorner | null>(null)
  const [cornerAnnouncement, setCornerAnnouncement] = useState('')
  const { data, connectionLost, connecting, now } = useSpectatorProjection({
    code,
    participantId: participant?.id ?? null,
  })
  const fullscreenSupported =
    typeof Element !== 'undefined' &&
    'requestFullscreen' in Element.prototype &&
    (document.fullscreenEnabled ?? true)

  const clearSnapTimer = useCallback(() => {
    if (!snapTimerRef.current) return
    clearTimeout(snapTimerRef.current)
    snapTimerRef.current = null
  }, [])

  const finishSnap = useCallback(() => {
    const player = playerRef.current
    clearSnapTimer()
    if (!player) return
    clearDragCoordinates(player)
    player.dataset.spectatorDragState = 'idle'
  }, [clearSnapTimer])

  const moveToCorner = useCallback((corner: SpectatorCorner, announce: boolean) => {
    const player = playerRef.current
    if (!player) {
      cornerRef.current = corner
      setCorner(corner)
      return
    }

    clearSnapTimer()
    const currentRect = player.getBoundingClientRect()
    player.dataset.spectatorDragState = 'dragging'
    clearDragCoordinates(player)
    player.dataset.spectatorCorner = corner
    cornerRef.current = corner
    setCorner(corner)

    const targetRect = player.getBoundingClientRect()
    player.style.setProperty(
      '--spectator-drag-x',
      `${currentRect.left - targetRect.left}px`,
    )
    player.style.setProperty(
      '--spectator-drag-y',
      `${currentRect.top - targetRect.top}px`,
    )
    void player.getBoundingClientRect()
    player.dataset.spectatorDragState = 'snapping'
    player.style.setProperty('--spectator-drag-x', '0px')
    player.style.setProperty('--spectator-drag-y', '0px')

    if (announce) setCornerAnnouncement(`Mini-player pinned ${cornerLabel(corner)}`)
    snapTimerRef.current = setTimeout(finishSnap, CORNER_SNAP_DURATION_MS)
  }, [clearSnapTimer, finishSnap])

  const releasePointerCapture = useCallback((pointerId: number) => {
    const handle = dragHandleRef.current
    if (
      handle &&
      typeof handle.hasPointerCapture === 'function' &&
      handle.hasPointerCapture(pointerId)
    ) {
      handle.releasePointerCapture(pointerId)
    }
  }, [])

  const cancelActiveDrag = useCallback((animate: boolean) => {
    const activeDrag = activeDragRef.current
    if (!activeDrag) return
    activeDragRef.current = null
    releasePointerCapture(activeDrag.pointerId)
    setDragTarget(null)
    if (animate && activeDrag.moved) {
      moveToCorner(activeDrag.priorCorner, false)
      return
    }
    finishSnap()
  }, [finishSnap, moveToCorner, releasePointerCapture])

  const handleDragPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (mode !== 'floating' || !event.isPrimary || event.button !== 0) return
    finishSnap()
    const player = playerRef.current
    if (!player) return
    activeDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startRect: player.getBoundingClientRect(),
      priorCorner: cornerRef.current,
      moved: false,
    }
    if (typeof event.currentTarget.setPointerCapture === 'function') {
      event.currentTarget.setPointerCapture(event.pointerId)
    }
  }

  const handleDragPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const activeDrag = activeDragRef.current
    const player = playerRef.current
    if (!activeDrag || !player || event.pointerId !== activeDrag.pointerId) return

    const rawX = event.clientX - activeDrag.startX
    const rawY = event.clientY - activeDrag.startY
    if (!activeDrag.moved && Math.hypot(rawX, rawY) < DRAG_THRESHOLD_PX) return

    activeDrag.moved = true
    event.preventDefault()
    const maxLeft = Math.max(0, window.innerWidth - activeDrag.startRect.width)
    const maxTop = Math.max(0, window.innerHeight - activeDrag.startRect.height)
    const left = Math.min(maxLeft, Math.max(0, activeDrag.startRect.left + rawX))
    const top = Math.min(maxTop, Math.max(0, activeDrag.startRect.top + rawY))
    player.dataset.spectatorDragState = 'dragging'
    player.style.setProperty(
      '--spectator-drag-x',
      `${left - activeDrag.startRect.left}px`,
    )
    player.style.setProperty(
      '--spectator-drag-y',
      `${top - activeDrag.startRect.top}px`,
    )

    const target = spectatorCornerFromPoint(
      left + activeDrag.startRect.width / 2,
      top + activeDrag.startRect.height / 2,
      window.innerWidth,
      window.innerHeight,
    )
    setDragTarget((current) => current === target ? current : target)
  }

  const handleDragPointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const activeDrag = activeDragRef.current
    if (!activeDrag || event.pointerId !== activeDrag.pointerId) return
    activeDragRef.current = null
    releasePointerCapture(activeDrag.pointerId)
    setDragTarget(null)
    if (!activeDrag.moved) {
      finishSnap()
      return
    }

    const player = playerRef.current
    if (!player) return
    const currentRect = player.getBoundingClientRect()
    moveToCorner(spectatorCornerFromPoint(
      currentRect.left + currentRect.width / 2,
      currentRect.top + currentRect.height / 2,
      window.innerWidth,
      window.innerHeight,
    ), true)
  }

  const handleDragPointerCancel = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (activeDragRef.current?.pointerId === event.pointerId) cancelActiveDrag(true)
  }

  const handleDragKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape' && activeDragRef.current) {
      event.preventDefault()
      cancelActiveDrag(true)
      return
    }
    if (
      event.key !== 'ArrowUp' &&
      event.key !== 'ArrowDown' &&
      event.key !== 'ArrowLeft' &&
      event.key !== 'ArrowRight'
    ) {
      return
    }
    event.preventDefault()
    const nextCorner = adjacentSpectatorCorner(cornerRef.current, event.key)
    if (nextCorner !== cornerRef.current) moveToCorner(nextCorner, true)
  }

  const showFullscreenError = () => {
    if (fullscreenErrorTimerRef.current) clearTimeout(fullscreenErrorTimerRef.current)
    setFullscreenError('Fullscreen unavailable')
    fullscreenErrorTimerRef.current = setTimeout(() => {
      setFullscreenError('')
      fullscreenErrorTimerRef.current = null
    }, 3000)
  }

  useEffect(() => {
    return () => {
      if (fullscreenErrorTimerRef.current) clearTimeout(fullscreenErrorTimerRef.current)
      clearSnapTimer()
    }
  }, [clearSnapTimer])

  useEffect(() => {
    const handleResize = () => cancelActiveDrag(true)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') cancelActiveDrag(false)
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !activeDragRef.current) return
      event.preventDefault()
      cancelActiveDrag(true)
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('keydown', handleEscape)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('keydown', handleEscape)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [cancelActiveDrag])

  useEffect(() => {
    if (mode !== 'floating') cancelActiveDrag(false)
  }, [cancelActiveDrag, mode])

  useEffect(() => {
    const participantId = participant?.id ?? null
    const participantChanged = previousParticipantIdRef.current !== participantId
    const roomChanged = previousCodeRef.current !== code
    if (!participantChanged && !roomChanged) return

    cancelActiveDrag(false)
    if (!participantId || roomChanged) {
      cornerRef.current = DEFAULT_SPECTATOR_CORNER
      setCorner(DEFAULT_SPECTATOR_CORNER)
      setCornerAnnouncement('')
    }
    previousParticipantIdRef.current = participantId
    previousCodeRef.current = code
  }, [cancelActiveDrag, code, participant?.id])

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (
        mode !== 'fullscreen' ||
        document.fullscreenElement === playerRef.current ||
        stoppingRef.current
      ) {
        return
      }
      onModeChange(fullscreenReturnModeRef.current)
      focusAfterRender(fullscreenButtonRef)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [mode, onModeChange])

  if (!participant) {
    return (
      <section
        aria-label="Embedded spectator"
        className="grid h-[480px] min-w-0 place-items-center overflow-hidden bg-black"
      >
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-neutral-700">
          Select a student to spectate
        </p>
      </section>
    )
  }

  const envelope = data?.projection ?? null
  const lastSeenAt = data?.participant.last_seen_at ?? participant.last_seen_at
  const traineeConnected = isConnected(lastSeenAt, now)
  const roomEnded = data?.session.status === 'ended'
  const connectionLabel = connecting
    ? `Connecting to ${participant.nickname}…`
    : connectionLost
      ? 'Spectator connection lost'
      : roomEnded
        ? 'Room ended'
        : !traineeConnected && !envelope
          ? 'Trainee offline · No monitor received'
          : !traineeConnected
            ? 'Trainee offline'
            : envelope
              ? 'Live'
              : 'Waiting for trainee monitor'
  const showUpdatedAt = Boolean(
    envelope && (connectionLost || roomEnded || !traineeConnected),
  )
  const updatedLabel = envelope
    ? `Updated ${new Date(envelope.updatedAt).toLocaleTimeString()}`
    : ''
  const displayedStatus = fullscreenError || (
    mode === 'floating' && showUpdatedAt
      ? `${connectionLabel} · ${updatedLabel}`
      : connectionLabel
  )

  const enterFullscreen = async () => {
    const player = playerRef.current
    if (!player || !fullscreenSupported) return
    fullscreenReturnModeRef.current = mode === 'floating' ? 'floating' : 'docked'
    try {
      await player.requestFullscreen()
      onModeChange('fullscreen')
      focusAfterRender(exitFullscreenButtonRef)
    } catch {
      showFullscreenError()
    }
  }

  const exitFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      onModeChange(fullscreenReturnModeRef.current)
      focusAfterRender(fullscreenButtonRef)
    } catch {
      showFullscreenError()
    }
  }

  const stopSpectating = async () => {
    stoppingRef.current = true
    cancelActiveDrag(false)
    cornerRef.current = DEFAULT_SPECTATOR_CORNER
    setCorner(DEFAULT_SPECTATOR_CORNER)
    setCornerAnnouncement('')
    try {
      if (document.fullscreenElement === playerRef.current) {
        await document.exitFullscreen()
      }
    } catch {
      // Removing the fullscreen element still lets the browser clean up while
      // the instructor's explicit Stop action takes effect immediately.
    }
    onModeChange('docked')
    onStopSpectating()
    window.setTimeout(() => {
      stoppingRef.current = false
    }, 0)
  }

  return (
    <>
      {mode === 'floating' ? (
        <section
          aria-label="Floating spectator placeholder"
          className="grid h-[480px] min-w-0 place-items-center overflow-hidden bg-black"
        >
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-neutral-700">
            Spectator pinned
          </p>
        </section>
      ) : null}
      {mode === 'floating' && dragTarget ? (
        <div
          aria-hidden="true"
          data-spectator-corner={dragTarget}
          data-testid="spectator-corner-target"
          className="spectator-corner-position spectator-corner-target pointer-events-none fixed z-30 border border-cyan-bp/60 shadow-lg shadow-cyan-bp/30"
        />
      ) : null}
      <section
        key="spectator-player"
        ref={playerRef}
        aria-label={`Spectating ${participant.nickname}`}
        data-spectator-corner={corner}
        data-spectator-drag-state="idle"
        data-spectator-mode={mode}
        className={cn(
          'spectator-mode-player flex min-w-0 flex-col overflow-hidden bg-black',
          mode === 'docked' && 'spectator-mode-docked relative h-[480px]',
          mode === 'floating' && 'spectator-corner-position spectator-mode-floating fixed z-40 border border-neutral-700 shadow-2xl shadow-black/80',
          mode === 'fullscreen' && 'spectator-mode-fullscreen h-screen w-screen',
        )}
      >
        <header
          className={cn(
            'relative z-10 h-9 shrink-0 items-center border-b border-neutral-900 font-mono uppercase tracking-wider',
            mode === 'floating'
              ? 'grid grid-cols-[minmax(0,1fr)_36px_minmax(0,1fr)] gap-2 px-12 text-[9px]'
              : 'flex gap-3 px-3 text-[10px]',
            mode === 'fullscreen' && 'pr-14',
          )}
        >
          <strong
            className={cn(
              'truncate text-white',
              mode === 'floating' && 'col-start-1 row-start-1',
            )}
          >
            {participant.nickname}
          </strong>
          {mode !== 'floating' ? (
            <span className="shrink-0 text-neutral-500">
              {envelope?.projection.model === 'wagamiZ'
                ? 'Wagami Z'
                : envelope
                  ? 'Wagami X'
                  : 'Monitor pending'}
            </span>
          ) : null}
          <span
            role="status"
            aria-live="polite"
            className={cn(
              'truncate text-right font-bold',
              mode === 'floating'
                ? 'col-start-3 row-start-1'
                : 'ml-auto',
              fullscreenError
                ? 'text-pending-amber'
                : connectionLabel === 'Live'
                  ? 'text-ecg-green'
                  : connectionLost || !traineeConnected
                    ? 'text-pending-amber'
                    : 'text-neutral-500',
            )}
          >
            {displayedStatus}
          </span>
          {mode !== 'floating' && showUpdatedAt ? (
            <span className="shrink-0 text-neutral-600">{updatedLabel}</span>
          ) : null}
          {mode === 'floating' ? (
            <button
              ref={dragHandleRef}
              type="button"
              aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Escape"
              aria-label="Move spectator mini-player"
              title="Move spectator mini-player"
              onKeyDown={handleDragKeyDown}
              onLostPointerCapture={handleDragPointerCancel}
              onPointerCancel={handleDragPointerCancel}
              onPointerDown={handleDragPointerDown}
              onPointerMove={handleDragPointerMove}
              onPointerUp={handleDragPointerUp}
              className="spectator-drag-handle col-start-2 row-start-1 z-20 grid h-9 w-9 touch-none cursor-grab place-items-center border-x border-neutral-800 bg-black/90 text-neutral-500 hover:border-cyan-bp/70 hover:text-cyan-bp focus:outline-none focus:ring-2 focus:ring-inset focus:ring-cyan-bp"
            >
              <DragHandleIcon />
            </button>
          ) : null}
        </header>
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {envelope ? (
            <div
              inert
              aria-label="Read-only student monitor"
              className="embedded-spectator-viewport pointer-events-none relative h-full w-full select-none overflow-hidden"
            >
              <div className="embedded-spectator-canvas h-[753px] w-[1024px] overflow-hidden bg-black">
                <SpectatorMonitor embedded projection={envelope.projection} />
              </div>
            </div>
          ) : (
            <div className="grid h-full place-items-center bg-black px-6 text-center">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-600">
                {connectionLabel}
              </p>
            </div>
          )}
        </div>

        {mode === 'docked' ? (
          <div className="absolute bottom-3 right-3 z-20 flex gap-2">
            <ModeButton
              label="Pin spectator mini-player"
              buttonRef={pinButtonRef}
              onClick={() => {
                onModeChange('floating')
                focusAfterRender(returnButtonRef)
              }}
            >
              <PinIcon />
            </ModeButton>
            <ModeButton
              label={fullscreenSupported ? 'Enter spectator fullscreen' : 'Fullscreen is not supported by this browser'}
              buttonRef={fullscreenButtonRef}
              disabled={!fullscreenSupported}
              onClick={() => void enterFullscreen()}
            >
              <FullscreenIcon />
            </ModeButton>
          </div>
        ) : null}

        {mode === 'floating' ? (
          <>
            <div className="absolute left-2 top-2 z-20">
              <ModeButton
                label="Return spectator to dock"
                buttonRef={returnButtonRef}
                onClick={() => {
                  onModeChange('docked')
                  focusAfterRender(pinButtonRef)
                }}
              >
                <ReturnIcon />
              </ModeButton>
            </div>
            <div className="absolute right-2 top-2 z-20">
              <ModeButton label="Stop spectating" onClick={() => void stopSpectating()}>
                <StopIcon />
              </ModeButton>
            </div>
            <div className="absolute bottom-2 right-2 z-20">
              <ModeButton
                label={fullscreenSupported ? 'Enter spectator fullscreen' : 'Fullscreen is not supported by this browser'}
                buttonRef={fullscreenButtonRef}
                disabled={!fullscreenSupported}
                onClick={() => void enterFullscreen()}
              >
                <FullscreenIcon />
              </ModeButton>
            </div>
          </>
        ) : null}

        {mode === 'fullscreen' ? (
          <>
            <div className="absolute right-3 top-3 z-20">
              <ModeButton label="Stop spectating" onClick={() => void stopSpectating()}>
                <StopIcon />
              </ModeButton>
            </div>
            <div className="absolute bottom-3 right-3 z-20">
              <ModeButton
                label="Exit spectator fullscreen"
                buttonRef={exitFullscreenButtonRef}
                onClick={() => void exitFullscreen()}
              >
                <FullscreenIcon exit />
              </ModeButton>
            </div>
          </>
        ) : null}
        <p aria-live="polite" className="sr-only">
          {cornerAnnouncement}
        </p>
      </section>
    </>
  )
}
