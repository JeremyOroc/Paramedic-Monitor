export const CINEMATIC = {
  preloadMs: 1200,
  strikeMs: 1150,
  titleMs: 1300,
  durationMs: 4300,
  reducedMs: 2950,
  fallbackMs: 900,
  fadeMs: 120,
  gruntMs: 500,
} as const

export const CINEMATIC_ART = {
  windup: '/images/cinematic/kratos-windup.webp',
  apex: '/images/cinematic/kratos-apex.webp',
  blade: '/images/cinematic/blade.webp',
} as const

/** A failed/slow image never owns the landing page indefinitely. */
export function preloadCinematicArt(signal: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    const images: HTMLImageElement[] = []
    let remaining = Object.keys(CINEMATIC_ART).length
    let settled = false
    const finish = (ready: boolean) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      signal.removeEventListener('abort', abort)
      images.forEach((image) => { image.onload = null; image.onerror = null })
      resolve(ready)
    }
    const abort = () => finish(false)
    const timeout = setTimeout(() => finish(false), CINEMATIC.preloadMs)
    signal.addEventListener('abort', abort, { once: true })
    if (signal.aborted) { finish(false); return }
    Object.values(CINEMATIC_ART).forEach((src) => {
      const image = new Image()
      images.push(image)
      image.onload = () => {
        if (typeof image.decode === 'function') {
          void image.decode().then(() => {
            if (--remaining === 0) finish(true)
          }, () => finish(false))
        } else if (--remaining === 0) finish(true)
      }
      image.onerror = () => finish(false)
      image.src = src
    })
  })
}
