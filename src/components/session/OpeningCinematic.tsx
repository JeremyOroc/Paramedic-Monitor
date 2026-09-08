'use client'

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

import type { CinematicAudio } from '@/lib/cinematicAudio'
import { CINEMATIC, CINEMATIC_ART, preloadCinematicArt } from '@/lib/openingCinematic'
import { cn } from '@/lib/utils'

import './openingCinematic.css'

interface OpeningCinematicProps {
  replay: boolean
  audio: RefObject<CinematicAudio | null>
  onComplete: (manual: boolean, replay: boolean) => void
}

type Presentation = 'loading' | 'full' | 'reduced' | 'fallback'

export function OpeningCinematic({ replay, audio, onComplete }: OpeningCinematicProps) {
  const [presentation, setPresentation] = useState<Presentation>('loading')
  const [canSkip, setCanSkip] = useState(replay)
  const [muted, setMuted] = useState(false)
  const ended = useRef(false)
  const skipAllowed = useRef(replay)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const skipButton = useRef<HTMLButtonElement>(null)

  const complete = useCallback((manual: boolean) => {
    if (ended.current) return
    if (manual && !skipAllowed.current) return
    ended.current = true
    timers.current.forEach(clearTimeout)
    // A disappearing focused Skip is a manual keyboard interaction too.
    onComplete(manual || document.activeElement === skipButton.current, replay)
  }, [onComplete, replay])

  useEffect(() => {
    ended.current = false
    const pendingTimers = timers.current
    const abort = new AbortController()
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let started = false
    const later = (callback: () => void, ms: number) => {
      pendingTimers.push(setTimeout(() => { if (!ended.current) callback() }, ms))
    }
    const start = (mode: Exclude<Presentation, 'loading'>) => {
      if (abort.signal.aborted || ended.current) return
      started = true
      pendingTimers.forEach(clearTimeout)
      pendingTimers.length = 0
      setPresentation(mode)
      skipAllowed.current = replay || mode !== 'full'
      setCanSkip(skipAllowed.current)
      audio.current?.resume()
      if (mode === 'full') {
        later(() => audio.current?.play('grunt'), CINEMATIC.gruntMs)
        later(() => { skipAllowed.current = true; setCanSkip(true) }, CINEMATIC.strikeMs)
        later(() => audio.current?.play('title'), CINEMATIC.titleMs)
        later(() => complete(false), CINEMATIC.durationMs)
      } else {
        if (mode === 'reduced') later(() => audio.current?.play('title'), 100)
        later(() => complete(false), mode === 'reduced' ? CINEMATIC.reducedMs : CINEMATIC.fallbackMs)
      }
    }
    if (motion.matches) {
      queueMicrotask(() => start('reduced'))
    } else {
      void preloadCinematicArt(abort.signal).then((ready) => {
        // A preference change may already have started the static presentation.
        if (!started) start(motion.matches ? 'reduced' : ready ? 'full' : 'fallback')
      })
    }
    const onMotion = () => {
      if (motion.matches) { audio.current?.stop(0); start('reduced') }
    }
    const onKey = (event: KeyboardEvent) => {
      if (!skipAllowed.current) return
      if (event.key === 'Escape' || ((event.key === 'Enter' || event.key === ' ')
        && !(event.target instanceof Element && event.target.closest('[data-cinematic-sound]')))) {
        event.preventDefault()
        complete(true)
      }
    }
    const onHidden = () => {
      if (document.hidden) { audio.current?.stop(0); complete(false) }
    }
    motion.addEventListener('change', onMotion)
    window.addEventListener('keydown', onKey)
    document.addEventListener('visibilitychange', onHidden)
    document.documentElement.classList.add('cinematic-scroll-lock')
    return () => {
      abort.abort()
      pendingTimers.forEach(clearTimeout)
      motion.removeEventListener('change', onMotion)
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('visibilitychange', onHidden)
      document.documentElement.classList.remove('cinematic-scroll-lock')
    }
  }, [audio, complete, replay])

  return (
    <section aria-label="Opening cinematic" data-testid="opening-cinematic"
      data-presentation={presentation}
      onClick={(event) => {
        if (!(event.target instanceof Element && event.target.closest('button'))) complete(true)
      }}
      className={cn('cinematic fixed inset-0 z-[100] isolate grid overflow-hidden bg-monitor-bg text-white',
        presentation === 'full' && 'cinematic-running',
        (presentation === 'reduced' || presentation === 'fallback') && 'cinematic-static')}>
      <p role="status" className="sr-only">Opening Paramedic Monitor</p>
      <div className="cinematic-art absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="cinematic-aura absolute inset-0" />
        {presentation === 'full' && (
          <>
            <div className="cinematic-figure cinematic-windup">
              {/* Eager, already decoded local sprites: no image optimizer request at impact. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={CINEMATIC_ART.windup} alt="" draggable={false} />
            </div>
            <div className="cinematic-figure cinematic-apex">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={CINEMATIC_ART.apex} alt="" draggable={false} />
            </div>
            <svg className="cinematic-chains" viewBox="0 0 1000 600" fill="none">
              <path d="M500 300 Q270 600 -100 160 M500 300 Q730 0 1100 440"
                stroke="currentColor" strokeWidth="5" strokeDasharray="11 7" />
              <path d="M500 300 Q270 600 -100 160 M500 300 Q730 0 1100 440"
                stroke="currentColor" strokeWidth="1" />
            </svg>
            <div className="cinematic-flying-blade cinematic-blade-left">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={CINEMATIC_ART.blade} alt="" draggable={false} />
            </div>
            <div className="cinematic-flying-blade cinematic-blade-right">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={CINEMATIC_ART.blade} alt="" draggable={false} />
            </div>
            <div className="cinematic-slash cinematic-slash-first" />
            <div className="cinematic-slash cinematic-slash-second" />
            <div className="cinematic-impact" />
            <div className="cinematic-embers">{Array.from({ length: 18 }, (_, index) => <i key={index} />)}</div>
          </>
        )}
        <div className="cinematic-slab cinematic-slab-upper" />
        <div className="cinematic-slab cinematic-slab-lower" />
        <div className="cinematic-seam" />
        <div className="cinematic-title cinematic-title-upper">
          <span className="cinematic-wordmark">WAGAMI</span>
        </div>
        <div className="cinematic-title cinematic-title-lower">
          <span className="cinematic-subtitle">PARAMEDIC MONITOR</span>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-6 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-9">
        <button type="button" data-cinematic-sound
          className="min-h-11 px-2 font-mono text-[10px] tracking-[0.18em] text-neutral-400 hover:text-cyan-bp focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-bp"
          aria-label={muted ? 'Enable cinematic sound' : 'Mute cinematic sound'}
          onClick={() => {
            if (muted) audio.current?.unlock()
            else audio.current?.mute()
            setMuted(!muted)
          }}>
          {muted ? 'SOUND OFF' : 'MUTE SOUND'}
        </button>
        <button ref={skipButton} type="button" disabled={!canSkip} onClick={() => complete(true)}
          className={cn('min-h-11 px-3 font-mono text-xs tracking-[0.3em] text-dispatch-paper hover:text-cyan-bp focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-bp', !canSkip && 'invisible')}
          aria-label="Skip opening cinematic">SKIP ›</button>
      </div>
    </section>
  )
}
