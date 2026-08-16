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

function installFakeAudioContext(
  initialState: AudioContextState = 'running',
): {
  routed: RoutedCue[]
  resumes: number
  started: Array<{ loop: boolean; gain: number }>
  stopped: number[]
  ctx: () => { state: AudioContextState }
} {
  const routed: RoutedCue[] = []
  const started: Array<{ loop: boolean; gain: number }> = []
  const stopped: number[] = []
  const lastGain = { value: 1 }
  const state = { resumes: 0 }
  let pending: RoutedCue | null = null
  // Context state lives in the closure rather than on the instance so tests can
  // suspend it without the helper having to hand back `this`.
  const ctxState = { value: initialState }

  class FakeAudioContext {
    destination = { id: 'destination' }
    // A suspended context makes routed cues silent, so canStartCue refuses to
    // start them and tries to resume. Without a truthful state here that retry
    // never settles and the module spins.
    get state(): AudioContextState {
      return ctxState.value
    }
    resume() {
      state.resumes += 1
      ctxState.value = 'running'
      return Promise.resolve()
    }
    createMediaElementSource(el: HTMLAudioElement) {
      pending = { src: el.src, gain: 1 }
      routed.push(pending)
      return { connect: () => {} }
    }
    createGain() {
      const entry = pending
      const node = {
        gain: {
          set value(next: number) {
            if (entry) entry.gain = next
            lastGain.value = next
          },
          get value() {
            return entry?.gain ?? 1
          },
        },
        connect: () => {},
      }
      return node
    }
    decodeAudioData(bytes: ArrayBuffer) {
      return Promise.resolve({ duration: 1, byteLength: bytes.byteLength } as unknown as AudioBuffer)
    }
    createBuffer() {
      return { duration: 1 } as unknown as AudioBuffer
    }
    createBufferSource() {
      const node = {
        buffer: null as AudioBuffer | null,
        loop: false,
        connect: () => {},
        disconnect: () => {},
        addEventListener: () => {},
        start: () => {
          started.push({ loop: node.loop, gain: lastGain.value })
        },
        stop: () => {
          stopped.push(1)
        },
      }
      return node
    }
  }

  ;(window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext
  return {
    routed,
    started,
    stopped,
    get resumes() {
      return state.resumes
    },
    ctx: () => ({
      get state(): AudioContextState {
        return ctxState.value
      },
      set state(next: AudioContextState) {
        ctxState.value = next
      },
    }),
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

  it('makes no sound of its own on unlock', async () => {
    await import('@/lib/audio')

    locked = false
    window.dispatchEvent(new Event('pointerdown'))
    await new Promise((resolve) => setTimeout(resolve, 30))

    // An earlier version primed every element on the first gesture to unlock
    // them individually. Once cues are routed through the graph the element's
    // own muted flag no longer silences it, so that first click on a freshly
    // loaded page — typing a room code — played every cue at once.
    //
    // The silent keep-alive is excluded: it is inaudible by construction and
    // exists precisely so later timer-driven cues are allowed through on iOS.
    expect(calls.filter((c) => !c.src.startsWith('data:'))).toHaveLength(0)
  })

  it('starts a silent keep-alive so timer-driven cues are allowed on iOS', async () => {
    await import('@/lib/audio')

    locked = false
    window.dispatchEvent(new Event('pointerdown'))
    await new Promise((resolve) => setTimeout(resolve, 20))

    // iOS only allows play() inside a gesture's call stack and suspends the
    // session when nothing sounds, so cues fired from timers — the dispatch
    // alert, "press shock", the shock-ready beep — were silent on iPad while
    // cues fired straight from a tap played. A silent loop holds the session
    // open so the timer-driven ones get through.
    // Counted rather than asserted as exactly one: the recovery listeners are
    // deliberately not one-shot, so modules imported by earlier tests are still
    // bound to window and restart their own keep-alive on the same event. In
    // the app there is a single module instance. Remove the keep-alive and
    // every module stops creating one, so this still drops to zero.
    const keepAlive = calls.filter((c) => c.src.startsWith('data:audio/wav'))
    expect(keepAlive.length).toBeGreaterThanOrEqual(1)
  })

  it('does not resume a looping cue that was paused before the gesture', async () => {
    const audio = await import('@/lib/audio')

    audio.playShockReadyBeep()
    audio.pauseShockReadyBeep()
    const before = callsFor('shock_ready_beep.mp3', { muted: false }).length

    locked = false
    window.dispatchEvent(new Event('pointerdown'))
    await new Promise((resolve) => setTimeout(resolve, 30))

    // The pause cleared the intent, so unlock has nothing to restore.
    expect(callsFor('shock_ready_beep.mp3', { muted: false })).toHaveLength(before)
  })

  it('does not replay one-shot cues late', async () => {
    const audio = await import('@/lib/audio')

    audio.playButtonClick()
    const before = callsFor('button_click.mp3', { muted: false }).length

    locked = false
    window.dispatchEvent(new Event('pointerdown'))
    await new Promise((resolve) => setTimeout(resolve, 30))

    expect(callsFor('button_click.mp3', { muted: false })).toHaveLength(before)
  })

  it('unlocks only once', async () => {
    const audio = await import('@/lib/audio')

    audio.playAlarm()
    locked = false
    const before = callsFor('alarm.mp3', { muted: false }).length

    audio.unlockAudio()
    await new Promise((resolve) => setTimeout(resolve, 20))
    const afterFirst = callsFor('alarm.mp3', { muted: false }).length
    expect(afterFirst).toBeGreaterThan(before)

    audio.unlockAudio()
    window.dispatchEvent(new Event('pointerdown'))
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(callsFor('alarm.mp3', { muted: false })).toHaveLength(afterFirst)
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

  it('does not start cues into a suspended context, and restores them on resume', async () => {
    // A suspended graph is total silence while play() still succeeds, so a
    // looping cue would run inaudibly and every one of them would become
    // hearable at the same instant the context resumed.
    const ctx = installFakeAudioContext('suspended')
    const audio = await import('@/lib/audio')

    locked = false
    window.dispatchEvent(new Event('pointerdown'))
    expect(ctx.routed.length).toBeGreaterThan(0)
    ctx.ctx().state = 'suspended'
    calls = []

    audio.playAlarm()
    expect(callsFor('alarm.mp3', { muted: false })).toHaveLength(0)

    // The intent survives, so the alarm starts once the context is running
    // rather than being lost — but it starts then, not silently before.
    await vi.waitFor(() => {
      expect(callsFor('alarm.mp3', { muted: false })).not.toHaveLength(0)
    })
  })

  it('drops one-shots requested against a suspended context', async () => {
    const ctx = installFakeAudioContext('suspended')
    const audio = await import('@/lib/audio')

    locked = false
    window.dispatchEvent(new Event('pointerdown'))
    expect(ctx.routed.length).toBeGreaterThan(0)
    ctx.ctx().state = 'suspended'
    calls = []

    // Replaying a voice prompt late is what produced the "everything fired at
    // once" pile-up, so its moment is allowed to pass.
    audio.playSystemAudio('stand_clear.mp3')
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(callsFor('stand_clear.mp3', { muted: false })).toHaveLength(0)
  })

  it('falls back to element volume where Web Audio is unavailable', async () => {
    // No AudioContext installed — the jsdom default, and old browsers.
    const audio = await import('@/lib/audio')

    locked = false
    window.dispatchEvent(new Event('pointerdown'))

    audio.playShockReadyBeep()
    const played = callsFor('shock_ready_beep.mp3', { muted: false })
    expect(played.at(-1)?.volume).toBe(audio.AUDIO_LEVELS.shockReadyBeep)
  })
})

describe('decoded cue playback', () => {
  function stubFetch() {
    vi.stubGlobal('fetch', () =>
      Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) }),
    )
  }

  it('plays cues from decoded buffers rather than media elements', async () => {
    stubFetch()
    const ctx = installFakeAudioContext()
    const audio = await import('@/lib/audio')

    locked = false
    window.dispatchEvent(new Event('pointerdown'))
    // Decoding is async and fire-and-forget; nothing can come from a buffer
    // until it lands. The silent keep-alive loop starts immediately, so
    // counting started sources is not a signal that decoding finished.
    await new Promise((resolve) => setTimeout(resolve, 50))
    ctx.started.length = 0
    calls = []

    // iOS refuses element play() outside a tap's call stack, which is why the
    // dispatch alert, "press shock" and the shock-ready beep were silent while
    // tap-fired cues played. A buffer source has no such rule.
    audio.playShockReadyBeep()

    expect(ctx.started.length).toBeGreaterThan(0)
    expect(callsFor('shock_ready_beep.mp3', { muted: false })).toHaveLength(0)
    vi.unstubAllGlobals()
  })

  it('applies the cue level to the buffer gain', async () => {
    stubFetch()
    const ctx = installFakeAudioContext()
    const audio = await import('@/lib/audio')

    locked = false
    window.dispatchEvent(new Event('pointerdown'))
    await new Promise((resolve) => setTimeout(resolve, 50))
    ctx.started.length = 0

    audio.playShockReadyBeep()
    const last = ctx.started.at(-1)
    expect(last?.gain).toBe(audio.AUDIO_LEVELS.shockReadyBeep)
    expect(last?.loop).toBe(true)
    vi.unstubAllGlobals()
  })

  it('stops a looping buffer when the cue is paused', async () => {
    stubFetch()
    const ctx = installFakeAudioContext()
    const audio = await import('@/lib/audio')

    locked = false
    window.dispatchEvent(new Event('pointerdown'))
    await new Promise((resolve) => setTimeout(resolve, 50))

    audio.playAlarm()
    const before = ctx.stopped.length
    audio.pauseAlarm()

    expect(ctx.stopped.length).toBeGreaterThan(before)
    vi.unstubAllGlobals()
  })

  it('falls back to the element when a cue has not decoded', async () => {
    // Decoding never resolves, so the buffer path is unavailable.
    vi.stubGlobal('fetch', () => new Promise(() => {}))
    installFakeAudioContext()
    const audio = await import('@/lib/audio')

    locked = false
    window.dispatchEvent(new Event('pointerdown'))
    calls = []

    audio.playShockReadyBeep()

    expect(callsFor('shock_ready_beep.mp3', { muted: false })).not.toHaveLength(0)
    vi.unstubAllGlobals()
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
