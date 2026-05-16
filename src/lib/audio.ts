const POOL_SIZE = 5
const BUTTON_CLICK_SRC = '/audio/button_click.mp3'
const ALARM_SRC = '/audio/alarm.mp3'

let _pool: HTMLAudioElement[] = []
let _poolIndex = 0
let _alarm: HTMLAudioElement | null = null

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

export function playButtonClick(): void {
  if (_pool.length === 0) return
  const el = _pool[_poolIndex]
  _poolIndex = (_poolIndex + 1) % POOL_SIZE
  el.currentTime = 0
  el.play().catch(() => {})
}

export function playAlarm(): void {
  if (!_alarm) return
  if (!_alarm.paused) return
  _alarm.currentTime = 0
  _alarm.play().catch(() => {})
}

export function pauseAlarm(): void {
  if (!_alarm) return
  _alarm.pause()
  _alarm.currentTime = 0
}
