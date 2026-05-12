const POOL_SIZE = 5
const SRC = '/audio/button_click.mp3'

let _pool: HTMLAudioElement[] = []
let _poolIndex = 0

if (typeof window !== 'undefined') {
  _pool = Array.from({ length: POOL_SIZE }, () => {
    const el = new Audio(SRC)
    el.preload = 'auto'
    return el
  })
}

export function playButtonClick(): void {
  if (_pool.length === 0) return
  const el = _pool[_poolIndex]
  _poolIndex = (_poolIndex + 1) % POOL_SIZE
  el.currentTime = 0
  el.play().catch(() => {})
}
