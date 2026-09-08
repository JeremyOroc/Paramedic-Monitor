import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'

import { OpeningCinematic } from '@/components/session/OpeningCinematic'
import { CinematicAudio } from '@/lib/cinematicAudio'
import { CINEMATIC, preloadCinematicArt } from '@/lib/openingCinematic'

vi.mock('@/lib/openingCinematic', async (original) => ({
  ...await original<typeof import('@/lib/openingCinematic')>(),
  preloadCinematicArt: vi.fn(),
}))

let reduced = false
let motionChanged: (() => void) | undefined
const audio = { current: null as CinematicAudio | null }
const complete = vi.fn()
let play: ReturnType<typeof vi.spyOn>

async function start(replay = false) {
  const rendered = render(<OpeningCinematic replay={replay} audio={audio} onComplete={complete} />)
  await act(async () => { await Promise.resolve() })
  return rendered
}

describe('OpeningCinematic', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    reduced = false
    complete.mockReset()
    vi.mocked(preloadCinematicArt).mockReset().mockResolvedValue(true)
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: reduced,
      addEventListener: (_: string, cb: () => void) => { motionChanged = cb },
      removeEventListener: vi.fn(),
    })))
    audio.current = new CinematicAudio()
    play = vi.spyOn(audio.current, 'play')
  })
  afterEach(() => { cleanup(); audio.current?.dispose(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers() })

  it('protects the first strike then enables skip and synchronizes the exact title cue', async () => {
    await start()
    fireEvent.keyDown(window, { key: 'Escape' })
    fireEvent.click(screen.getByTestId('opening-cinematic'))
    expect(complete).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(CINEMATIC.gruntMs))
    expect(play).toHaveBeenCalledWith('grunt')
    act(() => vi.advanceTimersByTime(CINEMATIC.strikeMs - CINEMATIC.gruntMs))
    expect(screen.getByRole('button', { name: 'Skip opening cinematic' })).toBeEnabled()
    act(() => vi.advanceTimersByTime(CINEMATIC.titleMs - CINEMATIC.strikeMs))
    expect(play).toHaveBeenCalledWith('title')
    expect(screen.getByText('WAGAMI')).toBeInTheDocument()
    expect(screen.getByText('PARAMEDIC MONITOR')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(CINEMATIC.durationMs - CINEMATIC.titleMs))
    expect(complete).toHaveBeenCalledExactlyOnceWith(false, false)
  })

  it.each(['Escape', 'Enter', ' '])('skips with %s only after impact, cancelling subsequent cues', async (key) => {
    await start()
    act(() => vi.advanceTimersByTime(CINEMATIC.strikeMs))
    fireEvent.keyDown(window, { key })
    act(() => vi.advanceTimersByTime(5000))
    expect(complete).toHaveBeenCalledExactlyOnceWith(true, false)
    expect(play).not.toHaveBeenCalledWith('title')
  })

  it('allows immediate skip on replay, including during preload', async () => {
    vi.mocked(preloadCinematicArt).mockReturnValue(new Promise(() => {}))
    await start(true)
    fireEvent.click(screen.getByRole('button', { name: 'Skip opening cinematic' }))
    expect(complete).toHaveBeenCalledExactlyOnceWith(true, true)
  })

  it('has decorative images, an opening announcement, and accessible mute without accidental skip', async () => {
    const mute = vi.spyOn(audio.current!, 'mute')
    await start()
    act(() => vi.advanceTimersByTime(1500))
    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.getByRole('status')).toHaveTextContent('Opening Paramedic Monitor')
    fireEvent.click(screen.getByRole('button', { name: 'Mute cinematic sound' }))
    expect(mute).toHaveBeenCalledOnce()
    expect(complete).not.toHaveBeenCalled()
  })

  it('uses a static title-only reduced-motion presentation and never fetches character art', async () => {
    reduced = true
    await start()
    expect(preloadCinematicArt).not.toHaveBeenCalled()
    expect(screen.getByTestId('opening-cinematic')).toHaveAttribute('data-presentation', 'reduced')
    expect(document.querySelector('.cinematic-figure')).toBeNull()
    act(() => vi.advanceTimersByTime(CINEMATIC.reducedMs))
    expect(play).toHaveBeenCalledExactlyOnceWith('title')
    expect(complete).toHaveBeenCalledExactlyOnceWith(false, false)
  })

  it('fails open quickly when critical art cannot load', async () => {
    vi.mocked(preloadCinematicArt).mockResolvedValue(false)
    await start()
    expect(screen.getByTestId('opening-cinematic')).toHaveAttribute('data-presentation', 'fallback')
    act(() => vi.advanceTimersByTime(CINEMATIC.fallbackMs))
    expect(complete).toHaveBeenCalledExactlyOnceWith(false, false)
    expect(play).not.toHaveBeenCalled()
  })

  it('aborts timers, listeners and scroll lock on unmount', async () => {
    const { unmount } = await start()
    expect(document.documentElement).toHaveClass('cinematic-scroll-lock')
    unmount()
    expect(document.documentElement).not.toHaveClass('cinematic-scroll-lock')
    act(() => vi.advanceTimersByTime(6000))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(complete).not.toHaveBeenCalled()
    expect(play).not.toHaveBeenCalled()
  })

  it('ignores late preload resolution after immediate replay skip', async () => {
    let resolve!: (ready: boolean) => void
    vi.mocked(preloadCinematicArt).mockReturnValue(new Promise((done) => { resolve = done }))
    await start(true)
    fireEvent.keyDown(window, { key: 'Escape' })
    await act(async () => resolve(true))
    act(() => vi.advanceTimersByTime(6000))
    expect(complete).toHaveBeenCalledOnce()
    expect(play).not.toHaveBeenCalled()
  })

  it('responds to a live reduced-motion preference change', async () => {
    const media = { matches: false, addEventListener: (_: string, cb: () => void) => { motionChanged = cb }, removeEventListener: vi.fn() }
    vi.mocked(matchMedia).mockReturnValue(media as unknown as MediaQueryList)
    await start()
    media.matches = true
    act(() => motionChanged?.())
    expect(screen.getByTestId('opening-cinematic')).toHaveAttribute('data-presentation', 'reduced')
    act(() => vi.advanceTimersByTime(3000))
    expect(play).toHaveBeenCalledExactlyOnceWith('title')
  })

  it('does not restart the title cue when late preload follows a reduced-motion change', async () => {
    let resolve!: (ready: boolean) => void
    vi.mocked(preloadCinematicArt).mockReturnValue(new Promise((done) => { resolve = done }))
    const media = { matches: false, addEventListener: (_: string, cb: () => void) => { motionChanged = cb }, removeEventListener: vi.fn() }
    vi.mocked(matchMedia).mockReturnValue(media as unknown as MediaQueryList)
    await start()
    media.matches = true
    act(() => motionChanged?.())
    act(() => vi.advanceTimersByTime(200))
    await act(async () => resolve(true))
    act(() => vi.advanceTimersByTime(3000))
    expect(play).toHaveBeenCalledExactlyOnceWith('title')
    expect(complete).toHaveBeenCalledOnce()
  })

  it('stops and fails open when the document becomes hidden', async () => {
    const stop = vi.spyOn(audio.current!, 'stop')
    await start()
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    fireEvent(document, new Event('visibilitychange'))
    expect(stop).toHaveBeenCalledWith(0)
    act(() => vi.advanceTimersByTime(5000))
    expect(complete).toHaveBeenCalledExactlyOnceWith(false, false)
    expect(play).not.toHaveBeenCalled()
  })
})
