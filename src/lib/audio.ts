const POOL_SIZE = 5
const BUTTON_CLICK_SRC = '/audio/button_click.mp3'
const ALARM_SRC = '/audio/fnaf2_hallway.mp3'

let _pool: HTMLAudioElement[] = []
let _poolIndex = 0
let _alarm: HTMLAudioElement | null = null
let _muted = false

export function setAudioMuted(muted: boolean): void {
  _muted = muted
  if (muted) pauseAlarm()
}

// Map for arbitrary system audio files
const _systemAudioPools: Record<string, HTMLAudioElement[]> = {}

if (typeof window !== 'undefined') {
  _pool = Array.from({ length: POOL_SIZE }, () => {
    const el = new Audio(BUTTON_CLICK_SRC)
    el.preload = 'auto'
    return el
  })

  _alarm = new Audio(ALARM_SRC)
  _alarm.preload = 'auto'
  _alarm.loop = true
}

export function playSystemAudio(filename: string): void {
  if (typeof window === 'undefined') return
  if (_muted) return
  const src = `/audio/${filename}`
  if (!_systemAudioPools[src]) {
    _systemAudioPools[src] = Array.from({ length: 2 }, () => {
      const el = new Audio(src)
      el.preload = 'auto'
      return el
    })
  }
  
  const pool = _systemAudioPools[src]
  // Find a free element or just use the first/next one
  const freeEl = pool.find(el => el.paused) || pool[0]
  freeEl.currentTime = 0
  freeEl.play().catch(() => {})
}

export function playButtonClick(): void {
  if (_pool.length === 0) return
  if (_muted) return
  const el = _pool[_poolIndex]
  _poolIndex = (_poolIndex + 1) % POOL_SIZE
  el.currentTime = 0
  el.play().catch(() => {})
}

export function playAlarm(): void {
  if (!_alarm) return
  if (_muted) return
  if (!_alarm.paused) return
  _alarm.currentTime = 0
  _alarm.play().catch(() => {})
}

export function pauseAlarm(): void {
  if (!_alarm) return
  _alarm.pause()
  _alarm.currentTime = 0
}
