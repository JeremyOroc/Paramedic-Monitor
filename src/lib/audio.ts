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
  // Spoken instruction over a noisy room — needs to carry above the metronome
  // that follows it.
  performCpr: 1,
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
  stopAllBuffers()
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
  
  const level = SYSTEM_AUDIO_LEVELS[filename] ?? AUDIO_LEVELS.voicePrompt
  if (playFromBuffer(src, level, false)) return
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
  if (playFromBuffer(BUTTON_CLICK_SRC, AUDIO_LEVELS.buttonClick, false)) return
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
  if (playFromBuffer(ALARM_SRC, AUDIO_LEVELS.alarm, true)) return
  if (!canStartCue()) return
  if (!_alarm.paused) return
  _alarm.currentTime = 0
  _alarm.play().catch(() => {})
}

export function pauseAlarm(): void {
  _wantsPlaying.alarm = false
  stopBuffer(ALARM_SRC)
  if (!_alarm) return
  _alarm.pause()
  _alarm.currentTime = 0
}

export function playCallerInfoAlert(): void {
  if (!_callerInfoAlert) return
  if (_muted) return
  if (playFromBuffer(CALLER_INFO_ALERT_SRC, AUDIO_LEVELS.callerInfoAlert, false)) return
  if (!canStartCue()) return
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
  if (playFromBuffer(CHARGE_BEEP_SRC, AUDIO_LEVELS.chargeBeep, true)) return
  if (!canStartCue()) return
  if (!_chargeBeep.paused) return
  _chargeBeep.currentTime = 0
  _chargeBeep.play().catch(() => {})
}

export function pauseChargeBeep(): void {
  _wantsPlaying.chargeBeep = false
  stopBuffer(CHARGE_BEEP_SRC)
  if (!_chargeBeep) return
  _chargeBeep.pause()
  _chargeBeep.currentTime = 0
}

export function playShockReadyBeep(): void {
  if (!_shockReadyBeep) return
  if (_muted) return
  _wantsPlaying.shockReadyBeep = true
  if (playFromBuffer(SHOCK_READY_SRC, AUDIO_LEVELS.shockReadyBeep, true)) return
  if (!canStartCue()) return
  if (!_shockReadyBeep.paused) return
  _shockReadyBeep.currentTime = 0
  _shockReadyBeep.play().catch(() => {})
}

export function pauseShockReadyBeep(): void {
  _wantsPlaying.shockReadyBeep = false
  stopBuffer(SHOCK_READY_SRC)
  if (!_shockReadyBeep) return
  _shockReadyBeep.pause()
  _shockReadyBeep.currentTime = 0
}

// ── CPR audio sequence ────────────────────────────────────────────────────────
// perform_cpr.mp3 plays first; when it naturally ends, 100_bpm.mp3 starts.
// Both are stopped together by stopCprAudioSequence().

const PERFORM_CPR_SRC = '/audio/perform_cpr.mp3'

let _performCpr: HTMLAudioElement | null = null
let _100bpm: HTMLAudioElement | null = null
let _onPerformCprEnded: (() => void) | null = null

if (typeof window !== 'undefined') {
  _performCpr = createCue(PERFORM_CPR_SRC, AUDIO_LEVELS.performCpr)
  _100bpm = createCue('/audio/100_bpm.mp3', AUDIO_LEVELS.metronome100Bpm)

  _performCpr.addEventListener('ended', handlePerformCprEnded)
}

// Starts the metronome and fires the caller's callback. Shared by the element
// 'ended' event and, when the voice line plays from a buffer, a timer for the
// buffer's duration — buffer sources have no 'ended' event we can rely on here.
function handlePerformCprEnded(): void {
  if (!_muted && _100bpm) {
    _100bpm.currentTime = 0
    _100bpm.play().catch(() => {})
  }
  const cb = _onPerformCprEnded
  _onPerformCprEnded = null
  cb?.()
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
  // The spoken instruction goes through a buffer like every other short cue.
  // The metronome that follows stays an element: at 11 MB it would be hundreds
  // of MB decoded, so it has to stream. It starts from this cue's 'ended'
  // handler, which is not a gesture, so on iOS it depends on the session being
  // held open — see the silent loop in unlockAudio.
  if (playFromBuffer(PERFORM_CPR_SRC, AUDIO_LEVELS.performCpr, false)) {
    window.setTimeout(
      () => _onPerformCprEnded && handlePerformCprEnded(),
      (_buffers.get(PERFORM_CPR_SRC)?.duration ?? 0) * 1000,
    )
    return
  }
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
// The fix is intent, not priming. A cue asked for before any gesture records
// that it is wanted and does not call play(); the first gesture resumes the
// audio context and starts whatever is still wanted. Unlock itself must never
// make a sound — an earlier version primed every element on that gesture to
// unlock them individually, and once cues are routed through the graph the
// element's own muted flag no longer silences it, so the first click on a
// freshly loaded page played every cue at once.

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
// Keyed by element so priming can drop each gain to 0 and restore it after.
const _routed = new WeakMap<HTMLAudioElement, GainNode>()

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
// ── Decoded cue playback ─────────────────────────────────────────────────────
// iOS only permits HTMLMediaElement.play() from inside a user gesture's call
// stack. An earlier tap on the page is enough for desktop but not for Safari on
// iOS, so cues fired from timers or effects — the dispatch alert, "press shock",
// the shock-ready beep — stayed silent on iPad while cues fired straight from a
// tap ("stand clear", the CPR voice, button clicks) played fine.
//
// AudioBufferSourceNode is not governed by that rule. Given a running context a
// buffer can be started from anywhere, so decoding each cue once and playing it
// from a buffer removes the gesture requirement entirely. It also sidesteps
// iOS refusing to preload media and the quirks of MediaElementAudioSourceNode.
//
// The elements are kept as the fallback path for browsers without Web Audio
// (and for jsdom under test), and for 100_bpm.mp3, which is 11 MB and would be
// hundreds of MB decoded.

const _buffers = new Map<string, AudioBuffer>()
const _activeLoops = new Map<string, AudioBufferSourceNode>()
let _buffersRequested = false

/** Cues small enough to hold decoded. Excludes the 11 MB metronome. */
function bufferableSources(): string[] {
  const sources = new Set<string>([
    BUTTON_CLICK_SRC,
    ALARM_SRC,
    CALLER_INFO_ALERT_SRC,
    CHARGE_BEEP_SRC,
    SHOCK_READY_SRC,
    PERFORM_CPR_SRC,
  ])
  for (const filename of Object.keys(SYSTEM_AUDIO_LEVELS)) {
    sources.add(`/audio/${filename}`)
  }
  return [...sources]
}

async function decodeInto(ctx: AudioContext, src: string): Promise<void> {
  if (_buffers.has(src)) return
  try {
    const response = await fetch(src)
    if (!response.ok) return
    const bytes = await response.arrayBuffer()
    // Safari historically only supports the callback form; the promise form is
    // available in every version we target, but failures must not reject the
    // whole batch.
    const buffer = await ctx.decodeAudioData(bytes)
    _buffers.set(src, buffer)
  } catch {
    // Leave it unbuffered — playback falls back to the element for this cue.
  }
}

function preloadBuffers(ctx: AudioContext): void {
  if (_buffersRequested) return
  _buffersRequested = true
  for (const src of bufferableSources()) void decodeInto(ctx, src)
}

/**
 * Play a decoded cue. Returns false when it cannot — no context, context not
 * running, or the buffer has not decoded yet — so callers fall back to the
 * element path rather than going silent.
 */
function playFromBuffer(src: string, level: number, loop: boolean): boolean {
  const ctx = _ctx
  if (!ctx || ctx.state !== 'running') return false
  const buffer = _buffers.get(src)
  if (!buffer) return false
  try {
    stopBuffer(src)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = loop
    const gain = ctx.createGain()
    gain.gain.value = level
    source.connect(gain)
    gain.connect(ctx.destination)
    source.start()
    if (loop) _activeLoops.set(src, source)
    else source.addEventListener('ended', () => source.disconnect())
    return true
  } catch {
    return false
  }
}

function stopBuffer(src: string): void {
  const source = _activeLoops.get(src)
  if (!source) return
  _activeLoops.delete(src)
  try {
    source.stop()
    source.disconnect()
  } catch {
    // Already stopped.
  }
}

function stopAllBuffers(): void {
  for (const src of [..._activeLoops.keys()]) stopBuffer(src)
}

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
    _routed.set(el, gain)
    // The gain node is the only attenuation now; leaving el.volume set as well
    // would apply the level twice on browsers that honour it.
    el.volume = 1
  } catch {
    // Already routed, or the graph refused the element — keep el.volume.
  }
}

let _unlocked = false

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
// A one-sample silent WAV. Inline so there is no asset to fetch and nothing to
// fail on a slow connection.
const SILENT_LOOP_SRC =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'

let _keepAlive: HTMLAudioElement | null = null

/**
 * Hold the iOS audio session open with a silent loop.
 *
 * iOS only permits play() from inside a user gesture's call stack — unlike
 * desktop, an earlier tap somewhere on the page is not enough — and it suspends
 * the audio context whenever nothing is sounding. Cues fired from timers or
 * effects therefore stayed silent on iPad: the dispatch alert, "press shock",
 * and the shock-ready beep, all of which fire from a timer, while every cue
 * fired straight from a tap (button clicks, "stand clear", the CPR voice)
 * played fine. That split is what identified this.
 *
 * Keeping a silent element looping means the session never goes idle, so later
 * timer-driven cues are allowed through. It also moves the session off the
 * "ambient" category, which is what lets Web Audio survive the hardware ringer
 * switch. Started inside the unlock gesture, where iOS permits it.
 *
 * This element is deliberately not routed through the gain graph and not
 * included in allAudioElements(), so stopAllAudio() leaves it running.
 */
let _silentLoop: AudioBufferSourceNode | null = null

/**
 * Keep the context out of the suspended state with a silent looping buffer.
 *
 * The previous attempt at this looped a `data:` URI through an `<audio>`
 * element; iOS Safari has long-standing trouble with data URIs in media
 * elements, and it did not hold the session open on device. A buffer source
 * runs inside the context itself, so there is no element and no URI involved —
 * the context always has something scheduled and does not go idle.
 */
function startSilentContextLoop(ctx: AudioContext): void {
  if (_silentLoop) return
  try {
    const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate)), ctx.sampleRate)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true
    source.connect(ctx.destination)
    source.start()
    _silentLoop = source
  } catch {
    _silentLoop = null
  }
}

function startAudioKeepAlive(): void {
  if (_keepAlive) return
  try {
    const el = new Audio(SILENT_LOOP_SRC)
    el.loop = true
    el.preload = 'auto'
    _keepAlive = el
    void el.play().catch(() => {})
  } catch {
    _keepAlive = null
  }
}

export function unlockAudio(): void {
  if (typeof window === 'undefined') return
  if (_unlocked) return
  _unlocked = true
  // Building and resuming the context inside the gesture matters on iOS: one
  // created outside a gesture starts suspended and stays silent.
  const ctx = audioContext()
  if (ctx) {
    void ctx.resume().catch(() => {})
    for (const el of allAudioElements()) routeThroughGain(el)
    // Decode the short cues so they can be played from anywhere, including the
    // timers and effects iOS will not accept an element play() from.
    preloadBuffers(ctx)
    startSilentContextLoop(ctx)
  }
  startAudioKeepAlive()
  // Only what should be sounding right now. Unlock must never make noise of its
  // own — cues requested before the gesture recorded intent instead of playing.
  resumeDesiredCues()
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
    // iOS pauses the keep-alive when the tab is backgrounded or interrupted by
    // a call; without restarting it the session goes idle again and
    // timer-driven cues stop being allowed through.
    if (_keepAlive?.paused) void _keepAlive.play().catch(() => {})
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
