import { beforeEach, describe, expect, it, vi } from 'vitest'

// Each test imports a fresh copy of the module: it holds its own element state
// and registers its own one-shot gesture listeners at import time. Every test
// dispatches the gesture before finishing so no module is left pending unlock
// and leaking a resume into the next test.

type PlayCall = { src: string; muted: boolean; volume: number }

let calls: PlayCall[]
let locked: boolean

function callsFor(file: string, opts: { muted: boolean }): PlayCall[] {
  return calls.filter((c) => c.src.endsWith(file) && c.muted === opts.muted)
}

/**
 * jsdom has no Web Audio, so by default the module falls back to el.volume.
 * This installs enough of an AudioContext to exercise the gain path that iOS
 * actually uses. createMediaElementSource and createGain are called strictly in
 * sequence per element, so pairing each gain with the most recent source is
 * reliable.
 */
type RoutedCue = { src: string; gain: number }

function installFakeAudioContext(): { routed: RoutedCue[]; resumes: number } {
  const routed: RoutedCue[] = []
  const state = { resumes: 0 }
  let pending: RoutedCue | null = null

  class FakeAudioContext {
    destination = { id: 'destination' }
    resume() {
      state.resumes += 1
      return Promise.resolve()
    }
    createMediaElementSource(el: HTMLAudioElement) {
      pending = { src: el.src, gain: 1 }
      routed.push(pending)
      return { connect: () => {} }
    }
    createGain() {
      const entry = pending
      return {
        gain: {
          set value(next: number) {
            if (entry) entry.gain = next
          },
          get value() {
            return entry?.gain ?? 1
          },
        },
        connect: () => {},
      }
    }
  }

  ;(window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext
  return {
    routed,
    get resumes() {
      return state.resumes
    },
  }
}

beforeEach(() => {
  calls = []
  locked = true
  vi.resetModules()
  delete (window as unknown as { AudioContext?: unknown }).AudioContext
  window.HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
    calls.push({ src: this.src, muted: this.muted, volume: this.volume })
    // Mirrors the browser autoplay policy: rejected until a user gesture.
    return locked
      ? Promise.reject(new DOMException('blocked', 'NotAllowedError'))
      : Promise.resolve()
  }
  window.HTMLMediaElement.prototype.pause = () => {}
})

describe('audio autoplay unlock', () => {
  it('resumes a looping cue that was blocked before the first gesture', async () => {
    const audio = await import('@/lib/audio')

    // Scenario start pushes alarming vitals before the trainee has clicked
    // anything — the browser rejects this and the .catch() swallows it.
    audio.playAlarm()
    expect(callsFor('alarm.mp3', { muted: false })).toHaveLength(1)

    locked = false
    window.dispatchEvent(new Event('pointerdown'))

    await vi.waitFor(() => {
      expect(callsFor('alarm.mp3', { muted: false }).length).toBeGreaterThan(1)
    })
  })

  it('primes muted so unlocking is inaudible', async () => {
    await import('@/lib/audio')

    locked = false
    window.dispatchEvent(new Event('pointerdown'))

    await vi.waitFor(() => {
      expect(callsFor('shock_ready_beep.mp3', { muted: true })).not.toHaveLength(0)
    })
    // Nothing was requested, so nothing should sound after priming.
    expect(callsFor('shock_ready_beep.mp3', { muted: false })).toHaveLength(0)
  })

  it('does not resume a looping cue that was paused before the gesture', async () => {
    const audio = await import('@/lib/audio')

    audio.playShockReadyBeep()
    audio.pauseShockReadyBeep()

    locked = false
    window.dispatchEvent(new Event('pointerdown'))

    await vi.waitFor(() => {
      expect(callsFor('shock_ready_beep.mp3', { muted: true })).not.toHaveLength(0)
    })
    // Only the original blocked attempt; the pause cleared the intent.
    expect(callsFor('shock_ready_beep.mp3', { muted: false })).toHaveLength(1)
  })

  it('does not replay one-shot cues late', async () => {
    const audio = await import('@/lib/audio')

    audio.playButtonClick()
    const before = callsFor('button_click.mp3', { muted: false }).length

    locked = false
    window.dispatchEvent(new Event('pointerdown'))

    await vi.waitFor(() => {
      expect(callsFor('button_click.mp3', { muted: true })).not.toHaveLength(0)
    })
    expect(callsFor('button_click.mp3', { muted: false })).toHaveLength(before)
  })

  it('unlocks only once', async () => {
    const audio = await import('@/lib/audio')

    locked = false
    audio.unlockAudio()
    await vi.waitFor(() => {
      expect(callsFor('alarm.mp3', { muted: true })).toHaveLength(1)
    })

    audio.unlockAudio()
    window.dispatchEvent(new Event('pointerdown'))
    expect(callsFor('alarm.mp3', { muted: true })).toHaveLength(1)
  })
})

describe('output gain', () => {
  it('routes every cue through a gain node at its configured level', async () => {
    const ctx = installFakeAudioContext()
    const { AUDIO_LEVELS } = await import('@/lib/audio')

    locked = false
    window.dispatchEvent(new Event('pointerdown'))

    const gainFor = (file: string) =>
      ctx.routed.find((entry) => entry.src.endsWith(file))?.gain

    expect(gainFor('shock_ready_beep.mp3')).toBe(AUDIO_LEVELS.shockReadyBeep)
    expect(gainFor('alarm.mp3')).toBe(AUDIO_LEVELS.alarm)
    expect(gainFor('charge_beep.mp3')).toBe(AUDIO_LEVELS.chargeBeep)
    expect(gainFor('button_click.mp3')).toBe(AUDIO_LEVELS.buttonClick)
    expect(gainFor('100_bpm.mp3')).toBe(AUDIO_LEVELS.metronome100Bpm)
  })

  it('hands level control to the gain node so it is not applied twice', async () => {
    installFakeAudioContext()
    const audio = await import('@/lib/audio')

    locked = false
    window.dispatchEvent(new Event('pointerdown'))
    await vi.waitFor(() => {
      expect(callsFor('shock_ready_beep.mp3', { muted: true })).not.toHaveLength(0)
    })

    audio.playShockReadyBeep()
    // Element volume is meaningless on iOS; once routed it must be wide open so
    // the gain node is the single point of attenuation.
    const played = callsFor('shock_ready_beep.mp3', { muted: false })
    expect(played).not.toHaveLength(0)
    expect(played.at(-1)?.volume).toBe(1)
  })

  it('resumes the context inside the gesture', async () => {
    const ctx = installFakeAudioContext()
    await import('@/lib/audio')
    expect(ctx.resumes).toBe(0)

    locked = false
    window.dispatchEvent(new Event('pointerdown'))
    expect(ctx.resumes).toBeGreaterThan(0)
  })

  it('routes voice prompt pools created after the first gesture', async () => {
    const ctx = installFakeAudioContext()
    const audio = await import('@/lib/audio')

    locked = false
    window.dispatchEvent(new Event('pointerdown'))
    expect(ctx.routed.some((e) => e.src.endsWith('stand_clear.mp3'))).toBe(false)

    // Pools are built on first use, well after unlock.
    audio.playSystemAudio('stand_clear.mp3')
    expect(ctx.routed.find((e) => e.src.endsWith('stand_clear.mp3'))?.gain).toBe(
      audio.AUDIO_LEVELS.voicePrompt,
    )
  })

  it('falls back to element volume where Web Audio is unavailable', async () => {
    // No AudioContext installed — the jsdom default, and old browsers.
    const audio = await import('@/lib/audio')

    locked = false
    window.dispatchEvent(new Event('pointerdown'))
    await vi.waitFor(() => {
      expect(callsFor('shock_ready_beep.mp3', { muted: true })).not.toHaveLength(0)
    })

    audio.playShockReadyBeep()
    const played = callsFor('shock_ready_beep.mp3', { muted: false })
    expect(played.at(-1)?.volume).toBe(audio.AUDIO_LEVELS.shockReadyBeep)
  })
})

describe('audio levels', () => {
  it('mixes looping cues below the one-shot voice prompts', async () => {
    const { AUDIO_LEVELS } = await import('@/lib/audio')

    expect(AUDIO_LEVELS.shockReadyBeep).toBeLessThan(AUDIO_LEVELS.voicePrompt)
    expect(AUDIO_LEVELS.chargeBeep).toBeLessThan(AUDIO_LEVELS.voicePrompt)
    expect(AUDIO_LEVELS.alarm).toBeLessThan(AUDIO_LEVELS.voicePrompt)

    for (const level of Object.values(AUDIO_LEVELS)) {
      expect(level).toBeGreaterThan(0)
      expect(level).toBeLessThanOrEqual(1)
    }

    window.dispatchEvent(new Event('pointerdown'))
  })
})
