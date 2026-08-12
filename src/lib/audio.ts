const POOL_SIZE = 5
const BUTTON_CLICK_SRC = '/audio/button_click.mp3'
const ALARM_SRC = '/audio/alarm.mp3'
const CALLER_INFO_ALERT_SRC = '/audio/caller_info_alarm.mp4'
const CHARGE_BEEP_SRC = '/audio/charge_beep.mp3'
const SHOCK_READY_SRC = '/audio/shock_ready_beep.mp3'

// Playback level per cue, 0..1. The source files are not loudness-normalised,
// so levels are set here rather than left at the 1.0 default. Looping cues
// (alarm, charge, shock-ready) sit well under the one-shots because they run
// continuously — a full-scale looping beep is painful over a classroom speaker.
// Tune by ear; this map is the only place levels are set.
export const AUDIO_LEVELS = {
  buttonClick: 0.35,
  alarm: 0.45,
  callerInfoAlert: 0.5,
  chargeBeep: 0.3,
  shockReadyBeep: 0.25,
  performCpr: 0.7,
  metronome100Bpm: 0.45,
  /** Fallback for voice prompts played through playSystemAudio(). */
  voicePrompt: 0.7,
} as const

/** Per-file overrides for playSystemAudio() cues; falls back to voicePrompt. */
const SYSTEM_AUDIO_LEVELS: Record<string, number> = {
  'stand_clear.mp3': 0.7,
  'press_shock.mp3': 0.7,
  'shock_not_advised.mp3': 0.7,
  'stop_cpr.mp3': 0.7,
  'analysis_halted.mp3': 0.7,
}

let _pool: HTMLAudioElement[] = []
let _poolIndex = 0
let _alarm: HTMLAudioElement | null = null
let _callerInfoAlert: HTMLAudioElement | null = null
let _chargeBeep: HTMLAudioElement | null = null
let _shockReadyBeep: HTMLAudioElement | null = null
let _muted = false

// Looping cues run until something explicitly pauses them, so a request made
// while playback is still locked is not a moment that can be missed — it is a
// state that is still true once we unlock. Remember it here and replay on
// unlock; priming only grants permission, it does not restart what was blocked.
// One-shots (button click, voice prompts, caller alert) are deliberately not
// tracked — replaying those late would fire them out of context.
const _wantsPlaying = {
  alarm: false,
  chargeBeep: false,
  shockReadyBeep: false,
}

export function setAudioMuted(muted: boolean): void {
  _muted = muted
  if (muted) {
    pauseAlarm()
    pauseCallerInfoAlert()
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
    el.volume = AUDIO_LEVELS.buttonClick
    return el
  })

  _alarm = new Audio(ALARM_SRC)
  _alarm.preload = 'auto'
  _alarm.loop = true
  _alarm.volume = AUDIO_LEVELS.alarm

  _callerInfoAlert = new Audio(CALLER_INFO_ALERT_SRC)
  _callerInfoAlert.preload = 'auto'
  _callerInfoAlert.volume = AUDIO_LEVELS.callerInfoAlert

  _chargeBeep = new Audio(CHARGE_BEEP_SRC)
  _chargeBeep.preload = 'auto'
  _chargeBeep.loop = true
  _chargeBeep.volume = AUDIO_LEVELS.chargeBeep

  _shockReadyBeep = new Audio(SHOCK_READY_SRC)
  _shockReadyBeep.preload = 'auto'
  _shockReadyBeep.loop = true
  _shockReadyBeep.volume = AUDIO_LEVELS.shockReadyBeep
}

export function playSystemAudio(filename: string): void {
  if (typeof window === 'undefined') return
  if (_muted) return
  const src = `/audio/${filename}`
  if (!_systemAudioPools[src]) {
    const level = SYSTEM_AUDIO_LEVELS[filename] ?? AUDIO_LEVELS.voicePrompt
    _systemAudioPools[src] = Array.from({ length: 2 }, () => {
      const el = new Audio(src)
      el.preload = 'auto'
      el.volume = level
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
  _wantsPlaying.alarm = true
  if (!_alarm.paused) return
  _alarm.currentTime = 0
  _alarm.play().catch(() => {})
}

export function pauseAlarm(): void {
  _wantsPlaying.alarm = false
  if (!_alarm) return
  _alarm.pause()
  _alarm.currentTime = 0
}

export function playCallerInfoAlert(): void {
  if (!_callerInfoAlert) return
  if (_muted) return
  _callerInfoAlert.pause()
  _callerInfoAlert.currentTime = 0
  _callerInfoAlert.play().catch(() => {})
}

export function pauseCallerInfoAlert(): void {
  if (!_callerInfoAlert) return
  _callerInfoAlert.pause()
  _callerInfoAlert.currentTime = 0
}

export function playChargeBeep(): void {
  if (!_chargeBeep) return
  if (_muted) return
  _wantsPlaying.chargeBeep = true
  if (!_chargeBeep.paused) return
  _chargeBeep.currentTime = 0
  _chargeBeep.play().catch(() => {})
}

export function pauseChargeBeep(): void {
  _wantsPlaying.chargeBeep = false
  if (!_chargeBeep) return
  _chargeBeep.pause()
  _chargeBeep.currentTime = 0
}

export function playShockReadyBeep(): void {
  if (!_shockReadyBeep) return
  if (_muted) return
  _wantsPlaying.shockReadyBeep = true
  if (!_shockReadyBeep.paused) return
  _shockReadyBeep.currentTime = 0
  _shockReadyBeep.play().catch(() => {})
}

export function pauseShockReadyBeep(): void {
  _wantsPlaying.shockReadyBeep = false
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
  _performCpr.volume = AUDIO_LEVELS.performCpr

  _100bpm = new Audio('/audio/100_bpm.mp3')
  _100bpm.preload = 'auto'
  _100bpm.volume = AUDIO_LEVELS.metronome100Bpm

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

// ── Autoplay unlock ──────────────────────────────────────────────────────────
// Browsers reject play() until the page has a user gesture. Most of our cues
// fire from effects reacting to polled session state (the alarm when the
// instructor starts a scenario) or to async defib timers — not from the click
// that ultimately caused them. Those calls are rejected, and because every
// play() site ends in .catch(() => {}) the failure is silent: no sound, no
// console error. The symptom is that audio stays dead until the trainee hits a
// control that happens to call play() inside a gesture — toggling mute did
// exactly that, which is why it "fixed" everything for the rest of the session.
//
// Priming each element once, muted, on the first gesture clears it for the
// lifetime of the page.

let _unlocked = false

function primeElement(el: HTMLAudioElement): Promise<void> {
  const wasMuted = el.muted
  const wasLoop = el.loop
  el.muted = true
  el.loop = false
  const restore = () => {
    el.pause()
    el.currentTime = 0
    el.muted = wasMuted
    el.loop = wasLoop
  }
  try {
    const started = el.play()
    // Older browsers return void rather than a promise.
    if (started && typeof started.then === 'function') {
      return started.then(restore, restore)
    }
    restore()
    return Promise.resolve()
  } catch {
    restore()
    return Promise.resolve()
  }
}

// Replay looping cues that were requested while playback was locked. Must run
// only after every prime has settled — priming ends in pause(), so resuming
// first would be undone immediately.
function resumeDesiredCues(): void {
  if (_wantsPlaying.alarm) playAlarm()
  if (_wantsPlaying.chargeBeep) playChargeBeep()
  if (_wantsPlaying.shockReadyBeep) playShockReadyBeep()
}

function allAudioElements(): HTMLAudioElement[] {
  const els: HTMLAudioElement[] = [..._pool]
  for (const el of [
    _alarm,
    _callerInfoAlert,
    _chargeBeep,
    _shockReadyBeep,
    _performCpr,
    _100bpm,
  ]) {
    if (el) els.push(el)
  }
  for (const pool of Object.values(_systemAudioPools)) els.push(...pool)
  return els
}

/**
 * Unlocks playback for every preloaded element. Registered automatically on the
 * first pointer/key event; exported so a known-good gesture (the monitor power
 * button) can call it directly. Safe to call more than once.
 */
export function unlockAudio(): void {
  if (typeof window === 'undefined') return
  if (_unlocked) return
  _unlocked = true
  const primed = allAudioElements().map(primeElement)
  void Promise.all(primed).then(resumeDesiredCues)
}

if (typeof window !== 'undefined') {
  const onFirstGesture = () => unlockAudio()
  const opts = { once: true, capture: true } as const
  window.addEventListener('pointerdown', onFirstGesture, opts)
  window.addEventListener('keydown', onFirstGesture, opts)
  window.addEventListener('touchstart', onFirstGesture, opts)
}
