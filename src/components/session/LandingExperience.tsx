'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { OpeningCinematic } from '@/components/session/OpeningCinematic'
import { SessionLandingPage } from '@/components/session/SessionLandingPage'
import { CinematicAudio } from '@/lib/cinematicAudio'

export function LandingExperience() {
  const [run, setRun] = useState({ id: 0, replay: false, active: true })
  const roomCode = useRef<HTMLInputElement>(null)
  const audio = useRef<CinematicAudio | null>(null)
  const focusAfter = useRef(false)

  useEffect(() => {
    audio.current = new CinematicAudio()
    const onRestore = (event: PageTransitionEvent) => {
      if (event.persisted) setRun((previous) => ({ id: previous.id + 1, replay: false, active: true }))
    }
    // Also runs when Next restores a cached route through its Activity boundary.
    const reset = window.setTimeout(() => {
      setRun((previous) => previous.active ? previous : { id: previous.id + 1, replay: false, active: true })
    }, 0)
    window.addEventListener('pageshow', onRestore)
    return () => {
      clearTimeout(reset)
      window.removeEventListener('pageshow', onRestore)
      audio.current?.dispose()
      audio.current = null
    }
  }, [])

  useEffect(() => {
    if (!run.active && focusAfter.current) {
      focusAfter.current = false
      roomCode.current?.focus({ preventScroll: true })
    }
  }, [run.active])

  const complete = useCallback((manual: boolean, replay: boolean) => {
    focusAfter.current = manual || replay
    setRun((previous) => ({ ...previous, active: false }))
    audio.current?.stop()
  }, [])

  const replay = () => {
    audio.current?.stop(0)
    audio.current?.unlock()
    setRun((previous) => ({ id: previous.id + 1, replay: true, active: true }))
  }

  return (
    <>
      <div inert={run.active} aria-hidden={run.active || undefined}>
        <SessionLandingPage roomCodeRef={roomCode} onReplay={replay} />
      </div>
      {run.active && (
        <OpeningCinematic key={run.id} replay={run.replay} audio={audio} onComplete={complete} />
      )}
    </>
  )
}
