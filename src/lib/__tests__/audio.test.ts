import { beforeEach, describe, expect, it, vi } from 'vitest'

// Each test imports a fresh copy of the module: it holds its own element state
// and registers its own one-shot gesture listeners at import time. Every test
// dispatches the gesture before finishing so no module is left pending unlock
// and leaking a resume into the next test.

type PlayCall = { src: string; muted: boolean }

let calls: PlayCall[]
let locked: boolean

function callsFor(file: string, opts: { muted: boolean }): PlayCall[] {
  return calls.filter((c) => c.src.endsWith(file) && c.muted === opts.muted)
}

beforeEach(() => {
  calls = []
  locked = true
  vi.resetModules()
  window.HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
    calls.push({ src: this.src, muted: this.muted })
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
