import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CinematicAudio, CINEMATIC_AUDIO } from '@/lib/cinematicAudio'

function createSource() {
  return { buffer: null, connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null as (() => void) | null }
}
function createGain() {
  return { connect: vi.fn(), disconnect: vi.fn(), gain: {
    value: 0.6, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), cancelScheduledValues: vi.fn(),
  } }
}
class AudioContextDouble {
  static instances: AudioContextDouble[] = []
  state = 'running'
  currentTime = 10
  destination = {}
  sources: ReturnType<typeof createSource>[] = []
  gains: ReturnType<typeof createGain>[] = []
  resume = vi.fn(async () => {})
  close = vi.fn(async () => {})
  decodeAudioData = vi.fn(async () => ({ duration: 2.769 }))
  createBufferSource() { const source = createSource(); this.sources.push(source); return source }
  createGain() { const gain = createGain(); this.gains.push(gain); return gain }
  constructor() { AudioContextDouble.instances.push(this) }
}
const fetchAudio = vi.fn()
let audio: CinematicAudio
const context = () => AudioContextDouble.instances[0]
async function loaded() { for (let i = 0; i < 10; i++) await Promise.resolve() }

describe('CinematicAudio', () => {
  beforeEach(() => {
    AudioContextDouble.instances = []
    vi.stubGlobal('AudioContext', AudioContextDouble)
    fetchAudio.mockReset().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })
    vi.stubGlobal('fetch', fetchAudio)
    audio = new CinematicAudio()
  })
  afterEach(() => { audio.dispose(); vi.unstubAllGlobals() })

  it('uses the supplied files, trims only playback of the grunt, and preserves the full title', async () => {
    await loaded()
    expect(fetchAudio.mock.calls.map(([url]) => url)).toEqual(Object.values(CINEMATIC_AUDIO))
    audio.play('grunt')
    audio.play('title')
    expect(context().sources[0].start).toHaveBeenCalledWith(10, 0, 1)
    expect(context().sources[1].start).toHaveBeenCalledWith(10, 0, 2.769)
    expect(context().gains[0].gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.38, 10.025)
    expect(context().gains[1].gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.6, 10.025)
    context().sources[0].onended?.()
    expect(context().sources[0].disconnect).toHaveBeenCalledOnce()
    expect(context().gains[0].disconnect).toHaveBeenCalledOnce()
  })

  it('drops autoplay-blocked cues and never queues them after a later user gesture', async () => {
    await loaded()
    context().state = 'suspended'
    context().resume.mockRejectedValue(new Error('autoplay denied'))
    audio.resume()
    audio.play('grunt')
    audio.play('title')
    await loaded()
    expect(context().sources).toHaveLength(0)
    context().state = 'running'
    context().resume.mockResolvedValue(undefined)
    audio.unlock()
    await loaded()
    expect(context().sources).toHaveLength(0)
    audio.play('title')
    expect(context().sources).toHaveLength(1)
  })

  it('drops cues before decode instead of playing them out of sync', async () => {
    audio.dispose()
    let finish!: (value: { ok: boolean; arrayBuffer: () => Promise<ArrayBuffer> }) => void
    const pending = new Promise((resolve) => { finish = resolve })
    fetchAudio.mockReturnValue(pending)
    audio = new CinematicAudio()
    const latest = AudioContextDouble.instances.at(-1)!
    audio.play('grunt')
    finish({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })
    await loaded()
    expect(latest.sources).toHaveLength(0)
    audio.play('title')
    expect(latest.sources).toHaveLength(1)
  })

  it('fades active sounds on skip and keeps mute independent of context resumption', async () => {
    await loaded()
    audio.play('title')
    audio.mute()
    expect(context().sources[0].stop).toHaveBeenCalledWith(10.12)
    expect(context().gains[0].gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, 10.12)
    audio.resume()
    audio.play('grunt')
    expect(context().sources).toHaveLength(1)
    audio.unlock()
    audio.play('grunt')
    expect(context().sources).toHaveLength(2)
  })

  it('aborts fetches, stops sound and closes its own context when unmounted', async () => {
    await loaded()
    audio.play('title')
    const signal = fetchAudio.mock.calls[0][1].signal as AbortSignal
    audio.dispose()
    expect(signal.aborted).toBe(true)
    expect(context().sources[0].stop).toHaveBeenCalledWith(10)
    expect(context().close).toHaveBeenCalled()
    audio.play('grunt')
    audio.unlock()
    expect(context().sources).toHaveLength(1)
    expect(context().resume).not.toHaveBeenCalled()
  })

  it('ignores decoding that finishes after disposal', async () => {
    audio.dispose()
    await loaded()
    audio.play('title')
    expect(context().sources).toHaveLength(0)
  })

  it.each(['network', 'decode'])('fails silently on %s errors', async (failure) => {
    audio.dispose()
    if (failure === 'network') fetchAudio.mockRejectedValue(new Error('offline'))
    audio = new CinematicAudio()
    const latest = AudioContextDouble.instances.at(-1)!
    if (failure === 'decode') latest.decodeAudioData.mockRejectedValue(new Error('corrupt'))
    await loaded()
    expect(() => audio.play('title')).not.toThrow()
    expect(latest.sources).toHaveLength(0)
  })

  it('supports browsers without Web Audio', () => {
    audio.dispose()
    vi.stubGlobal('AudioContext', undefined)
    audio = new CinematicAudio()
    expect(() => { audio.unlock(); audio.play('title'); audio.stop(); audio.dispose() }).not.toThrow()
  })
})
