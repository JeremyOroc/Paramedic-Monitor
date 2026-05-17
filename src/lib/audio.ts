const POOL_SIZE = 5
const SRC = '/audio/button_click.mp3'

let _pool: HTMLAudioElement[] = []
let _poolIndex = 0

// Map for arbitrary system audio files
const _systemAudioPools: Record<string, HTMLAudioElement[]> = {}

if (typeof window !== 'undefined') {
  _pool = Array.from({ length: POOL_SIZE }, () => {
    const el = new Audio(SRC)
    el.preload = 'auto'
    return el
  })
}

export function playSystemAudio(filename: string): void {
  if (typeof window === 'undefined') return
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
  const el = _pool[_poolIndex]
  _poolIndex = (_poolIndex + 1) % POOL_SIZE
  el.currentTime = 0
  el.play().catch(() => {})
}
