'use client'

import { useEffect, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'

import { SpectatorMonitor } from '@/components/instructor/SpectatorMonitor'
import { useSpectatorProjection } from '@/hooks/useSpectatorProjection'
import { isConnected } from '@/lib/sessionRoster'
import { cn } from '@/lib/utils'

export type SpectatorPresentationMode = 'docked' | 'floating' | 'fullscreen'

type EmbeddedSpectatorParticipant = {
  id: string
  nickname: string
  last_seen_at: string | null
}

type EmbeddedSpectatorPanelProps = {
  code: string
  hostToken: string
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

function focusAfterRender(ref: RefObject<HTMLButtonElement | null>) {
  window.setTimeout(() => ref.current?.focus(), 0)
}

export function EmbeddedSpectatorPanel({
  code,
  hostToken,
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
  const [fullscreenError, setFullscreenError] = useState('')
  const { data, connectionLost, connecting, now } = useSpectatorProjection({
    code,
    hostToken,
    participantId: participant?.id ?? null,
  })
  const fullscreenSupported =
    typeof Element !== 'undefined' &&
    'requestFullscreen' in Element.prototype &&
    (document.fullscreenEnabled ?? true)

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
    }
  }, [])

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
      <section
        key="spectator-player"
        ref={playerRef}
        aria-label={`Spectating ${participant.nickname}`}
        data-spectator-mode={mode}
        className={cn(
          'spectator-mode-player flex min-w-0 flex-col overflow-hidden bg-black',
          mode === 'docked' && 'spectator-mode-docked relative h-[480px]',
          mode === 'floating' && 'spectator-mode-floating fixed z-40 border border-neutral-700 shadow-2xl shadow-black/80',
          mode === 'fullscreen' && 'spectator-mode-fullscreen h-screen w-screen',
        )}
      >
        <header
          className={cn(
            'relative z-10 flex h-9 shrink-0 items-center gap-3 border-b border-neutral-900 font-mono uppercase tracking-wider',
            mode === 'floating' ? 'px-12 text-[9px]' : 'px-3 text-[10px]',
            mode === 'fullscreen' && 'pr-14',
          )}
        >
          <strong className="truncate text-white">{participant.nickname}</strong>
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
              'ml-auto truncate text-right font-bold',
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
      </section>
    </>
  )
}
