const POOL_SIZE = 5
const BUTTON_CLICK_SRC = '/audio/button_click.mp3'
const ALARM_SRC = '/audio/alarm.mp3'
const CHARGE_BEEP_SRC = '/audio/charge_beep.mp3'
const SHOCK_READY_SRC = '/audio/shock_ready_beep.mp3'

let _pool: HTMLAudioElement[] = []
let _poolIndex = 0
let _alarm: HTMLAudioElement | null = null
let _chargeBeep: HTMLAudioElement | null = null
let _shockReadyBeep: HTMLAudioElement | null = null
let _muted = false

export function setAudioMuted(muted: boolean): void {
  _muted = muted
  if (muted) {
    pauseAlarm()
    pauseChargeBeep()
    pauseShockReadyBeep()
    stopCprAudioSequence()
  }
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

  _chargeBeep = new Audio(CHARGE_BEEP_SRC)
  _chargeBeep.preload = 'auto'
  _chargeBeep.loop = true

  _shockReadyBeep = new Audio(SHOCK_READY_SRC)
  _shockReadyBeep.preload = 'auto'
  _shockReadyBeep.loop = true
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

export function playChargeBeep(): void {
  if (!_chargeBeep) return
  if (_muted) return
  if (!_chargeBeep.paused) return
  _chargeBeep.currentTime = 0
  _chargeBeep.play().catch(() => {})
}

export function pauseChargeBeep(): void {
  if (!_chargeBeep) return
  _chargeBeep.pause()
  _chargeBeep.currentTime = 0
}

export function playShockReadyBeep(): void {
  if (!_shockReadyBeep) return
  if (_muted) return
  if (!_shockReadyBeep.paused) return
  _shockReadyBeep.currentTime = 0
  _shockReadyBeep.play().catch(() => {})
}

export function pauseShockReadyBeep(): void {
  if (!_shockReadyBeep) return
  _shockReadyBeep.pause()
  _shockReadyBeep.currentTime = 0
}

// ── CPR audio sequence ────────────────────────────────────────────────────────
// perform_cpr.mp3 plays first; when it naturally ends, 100_bpm.mp3 starts.
// Both are stopped together by stopCprAudioSequence().

let _performCpr: HTMLAudioElement | null = null
let _100bpm: HTMLAudioElement | null = null
let _onPerformCprEnded: (() => void) | null = null

if (typeof window !== 'undefined') {
  _performCpr = new Audio('/audio/perform_cpr.mp3')
  _performCpr.preload = 'auto'

  _100bpm = new Audio('/audio/100_bpm.mp3')
  _100bpm.preload = 'auto'

  _performCpr.addEventListener('ended', () => {
    if (!_muted && _100bpm) {
      _100bpm.currentTime = 0
      _100bpm.play().catch(() => {})
    }
    const cb = _onPerformCprEnded
    _onPerformCprEnded = null
    cb?.()
  })
}

export function playCprAudioSequence(onEnded?: () => void): void {
  if (typeof window === 'undefined') return
  if (!_performCpr || !_100bpm) return
  // Stop any in-progress sequence first
  _onPerformCprEnded = null
  _100bpm.pause()
  _100bpm.currentTime = 0
  _performCpr.pause()
  _performCpr.currentTime = 0
  _onPerformCprEnded = onEnded ?? null
  if (_muted) return
  _performCpr.play().catch(() => {})
}

export function stopCprAudioSequence(): void {
  _onPerformCprEnded = null
  if (!_performCpr || !_100bpm) return
  _performCpr.pause()
  _performCpr.currentTime = 0
  _100bpm.pause()
  _100bpm.currentTime = 0
}
