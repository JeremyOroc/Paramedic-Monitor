import { CINEMATIC } from '@/lib/openingCinematic'

export const CINEMATIC_AUDIO = {
  grunt: '/audio/Kratos Grunt.mp3',
  title: '/audio/Kratos WAGAMI PARAMEDIC MONITOR.mp3',
} as const

type Cue = keyof typeof CINEMATIC_AUDIO

/** Owned by the landing page, never coupled to clinical alarms or monitor mute. */
export class CinematicAudio {
  private context: AudioContext | null = null
  private buffers = new Map<Cue, AudioBuffer>()
  private active = new Set<{ source: AudioBufferSourceNode; gain: GainNode }>()
  private abort = new AbortController()
  private disposed = false
  private silent = false

  constructor() {
    try {
      const Constructor = window.AudioContext
        ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Constructor) return
      this.context = new Constructor()
      const context = this.context
      for (const cue of Object.keys(CINEMATIC_AUDIO) as Cue[]) {
        void fetch(CINEMATIC_AUDIO[cue], { signal: this.abort.signal })
          .then((response) => {
            if (!response.ok) throw new Error('Cinematic audio unavailable')
            return response.arrayBuffer()
          })
          .then((bytes) => context.decodeAudioData(bytes))
          .then((buffer) => { if (!this.disposed) this.buffers.set(cue, buffer) })
          .catch(() => { /* Visual playback is independent of sound. */ })
      }
    } catch { this.context = null }
  }

  /** Invoke synchronously from Replay's gesture; autoplay may stay suspended. */
  unlock(): void {
    if (this.disposed) return
    this.silent = false
    this.resume()
  }

  resume(): void {
    if (!this.disposed) void this.context?.resume().catch(() => {})
  }

  mute(): void {
    this.silent = true
    this.stop()
  }

  play(cue: Cue): void {
    const context = this.context
    const buffer = this.buffers.get(cue)
    // Missed one-shots are dropped, never queued for the next gesture.
    if (this.disposed || this.silent || !context || context.state !== 'running' || !buffer) return
    try {
      const source = context.createBufferSource()
      const gain = context.createGain()
      source.buffer = buffer
      source.connect(gain)
      gain.connect(context.destination)
      const now = context.currentTime
      const level = cue === 'grunt' ? 0.38 : 0.6
      const duration = cue === 'grunt' ? Math.min(1, buffer.duration) : buffer.duration
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(level, now + 0.025)
      gain.gain.setValueAtTime(level, now + Math.max(0.025, duration - 0.08))
      gain.gain.linearRampToValueAtTime(0, now + duration)
      const entry = { source, gain }
      this.active.add(entry)
      source.onended = () => {
        this.active.delete(entry)
        source.disconnect()
        gain.disconnect()
      }
      source.start(now, 0, duration)
    } catch { /* Unsupported media must not interrupt the landing flow. */ }
  }

  stop(fadeMs: number = CINEMATIC.fadeMs): void {
    const now = this.context?.currentTime ?? 0
    for (const entry of this.active) {
      try {
        entry.gain.gain.cancelScheduledValues(now)
        entry.gain.gain.setValueAtTime(entry.gain.gain.value, now)
        entry.gain.gain.linearRampToValueAtTime(0, now + fadeMs / 1000)
        entry.source.stop(now + fadeMs / 1000)
      } catch { /* Already ended. */ }
    }
    this.active.clear()
  }

  dispose(): void {
    this.disposed = true
    this.abort.abort()
    this.stop(0)
    this.buffers.clear()
    void this.context?.close().catch(() => {})
  }
}
