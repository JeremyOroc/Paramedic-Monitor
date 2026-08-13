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

// Every cue's intended level, so the Web Audio gain nodes below can be given the
// right value when the graph is built on the first gesture.
const _levels = new WeakMap<HTMLAudioElement, number>()

function createCue(src: string, level: number, loop = false): HTMLAudioElement {
  const el = new Audio(src)
  el.preload = 'auto'
  el.loop = loop
  // Ignored on iOS, where volume is hardware-controlled — this is the fallback
  // for browsers where the Web Audio graph cannot be built. Once an element is
  // routed through a gain node this is reset to 1 so we do not attenuate twice.
  el.volume = level
  _levels.set(el, level)
  return el
}

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
  if (muted) stopAllAudio()
}

/**
 * Silence everything and forget any pending intent.
 *
 * The cue elements are module singletons, so unmounting the monitor does not
 * touch them — the CPR metronome outlived a New Attempt and kept playing until
 * someone hit mute, which was the only other caller of stopCprAudioSequence.
 * A drill reset has to stop the sound of the previous run too, and clear the
 * looping-cue intent flags so the next unlock cannot replay a stale request.
 */
export function stopAllAudio(): void {
  pauseAlarm()
  pauseCallerInfoAlert()
  pauseChargeBeep()
  pauseShockReadyBeep()
  stopCprAudioSequence()
  for (const pool of Object.values(_systemAudioPools)) {
    for (const el of pool) {
      el.pause()
      el.currentTime = 0
    }
  }
  for (const el of _pool) {
    el.pause()
    el.currentTime = 0
  }
}

// Map for arbitrary system audio files
const _systemAudioPools: Record<string, HTMLAudioElement[]> = {}

if (typeof window !== 'undefined') {
  _pool = Array.from({ length: POOL_SIZE }, () =>
    createCue(BUTTON_CLICK_SRC, AUDIO_LEVELS.buttonClick),
  )
  _alarm = createCue(ALARM_SRC, AUDIO_LEVELS.alarm, true)
  _callerInfoAlert = createCue(CALLER_INFO_ALERT_SRC, AUDIO_LEVELS.callerInfoAlert)
  _chargeBeep = createCue(CHARGE_BEEP_SRC, AUDIO_LEVELS.chargeBeep, true)
  _shockReadyBeep = createCue(SHOCK_READY_SRC, AUDIO_LEVELS.shockReadyBeep, true)
}

export function playSystemAudio(filename: string): void {
  if (typeof window === 'undefined') return
  if (_muted) return
  const src = `/audio/${filename}`
  if (!_systemAudioPools[src]) {
    const level = SYSTEM_AUDIO_LEVELS[filename] ?? AUDIO_LEVELS.voicePrompt
    _systemAudioPools[src] = Array.from({ length: 2 }, () => {
      const el = createCue(src, level)
      // Pools are built lazily, so an element created after the first gesture
      // has missed the routing pass in unlockAudio and needs its own.
      if (_unlocked) routeThroughGain(el)
      return el
    })
  }
  
  if (!canStartCue()) return

  const pool = _systemAudioPools[src]
  // Find a free element or just use the first/next one
  const freeEl = pool.find(el => el.paused) || pool[0]
  freeEl.currentTime = 0
  freeEl.play().catch(() => {})
}

export function playButtonClick(): void {
  if (_pool.length === 0) return
  if (_muted) return
  if (!canStartCue()) return
  const el = _pool[_poolIndex]
  _poolIndex = (_poolIndex + 1) % POOL_SIZE
  el.currentTime = 0
  el.play().catch(() => {})
}

export function playAlarm(): void {
  if (!_alarm) return
  if (_muted) return
  _wantsPlaying.alarm = true
  if (!canStartCue()) return
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
  if (!canStartCue()) return
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
  if (!canStartCue()) return
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
  _performCpr = createCue('/audio/perform_cpr.mp3', AUDIO_LEVELS.performCpr)
  _100bpm = createCue('/audio/100_bpm.mp3', AUDIO_LEVELS.metronome100Bpm)

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

// ── Output gain ──────────────────────────────────────────────────────────────
// HTMLMediaElement.volume is not settable on iOS: Safari always reports 1 and
// leaves level to the hardware buttons, so AUDIO_LEVELS is a no-op there and
// every cue plays at full scale — the shock beep loops at 1.0 on an iPad no
// matter what the map says. Routing each element through a Web Audio GainNode
// gives us attenuation iOS does respect.
//
// MediaElementAudioSourceNode is used rather than decoding into AudioBuffers so
// playback still streams: 100_bpm.mp3 is 11 MB and would be hundreds of MB of
// PCM if fully decoded, which an iPad tab will not tolerate. Mixing in the graph
// also means overlapping cues share one output stream rather than competing as
// separate media streams, which older iOS restricts.
//
// Where Web Audio is unavailable (jsdom under test, very old browsers) nothing
// is routed and el.volume from createCue stays in effect.

let _ctx: AudioContext | null = null
let _audioGraphUnavailable = false
const _routed = new WeakSet<HTMLAudioElement>()

function audioContext(): AudioContext | null {
  if (_ctx || _audioGraphUnavailable) return _ctx
  const Ctor =
    typeof window === 'undefined'
      ? undefined
      : window.AudioContext ??
        (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) {
    _audioGraphUnavailable = true
    return null
  }
  try {
    _ctx = new Ctor()
  } catch {
    _audioGraphUnavailable = true
  }
  return _ctx
}

/**
 * True when a cue may start now.
 *
 * Once cues are routed through the graph, a suspended context is total silence
 * while play() still succeeds — so a looping cue keeps looping inaudibly and
 * every one of them becomes hearable at the same instant the context resumes.
 * That is the "all the earlier sounds fired at once when I hit analyze" report.
 *
 * Rather than let cues accumulate silently, refuse to start them and try to
 * resume. Looping cues have already recorded their intent by this point, so
 * resumeDesiredCues restores whatever is still wanted once the context is
 * actually running; one-shots are simply dropped, which is right — their moment
 * has passed and replaying them late is what caused the pile-up.
 */
function canStartCue(): boolean {
  const ctx = _ctx
  if (!ctx || ctx.state === 'running') return true
  void ctx
    .resume()
    // Only replay once the context has actually reached running. resume() can
    // resolve with the context still suspended (iOS outside a gesture), and
    // replaying then would re-enter canStartCue and resume in a tight loop.
    .then(() => {
      if (ctx.state === 'running') resumeDesiredCues()
    })
    .catch(() => {})
  return false
}

function routeThroughGain(el: HTMLAudioElement): void {
  const ctx = audioContext()
  if (!ctx || _routed.has(el)) return
  try {
    const source = ctx.createMediaElementSource(el)
    const gain = ctx.createGain()
    gain.gain.value = _levels.get(el) ?? 1
    source.connect(gain)
    gain.connect(ctx.destination)
    _routed.add(el)
    // The gain node is the only attenuation now; leaving el.volume set as well
    // would apply the level twice on browsers that honour it.
    el.volume = 1
  } catch {
    // Already routed, or the graph refused the element — keep el.volume.
  }
}

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
  const elements = allAudioElements()
  // Building and resuming the context inside the gesture matters on iOS: one
  // created outside a gesture starts suspended and stays silent.
  const ctx = audioContext()
  if (ctx) {
    void ctx.resume().catch(() => {})
    for (const el of elements) routeThroughGain(el)
  }
  void Promise.all(elements.map(primeElement)).then(resumeDesiredCues)
}

if (typeof window !== 'undefined') {
  const onFirstGesture = () => unlockAudio()
  const opts = { once: true, capture: true } as const
  window.addEventListener('pointerdown', onFirstGesture, opts)
  window.addEventListener('keydown', onFirstGesture, opts)
  window.addEventListener('touchstart', onFirstGesture, opts)

  // iOS suspends the AudioContext when the tab is backgrounded, and once cues
  // are routed through the graph a suspended context means total silence. The
  // unlock listeners above are one-shot, so without these two a trainee who
  // switches apps mid-drill comes back to a monitor that never sounds again.
  const recoverContext = () => {
    if (_ctx?.state !== 'suspended') return
    void _ctx.resume().then(resumeDesiredCues).catch(() => {})
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') recoverContext()
  })
  // Not one-shot: resume() only reliably succeeds inside a gesture on iOS, so
  // every gesture is a chance to recover a context that suspended later.
  window.addEventListener('pointerdown', recoverContext, { capture: true })
  window.addEventListener('touchstart', recoverContext, { capture: true })
}
