import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CINEMATIC, preloadCinematicArt } from '@/lib/openingCinematic'

class ImageDouble {
  static images: ImageDouble[] = []
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  src = ''
  decode = vi.fn(() => Promise.resolve())
  constructor() { ImageDouble.images.push(this) }
}

describe('preloadCinematicArt', () => {
  beforeEach(() => { vi.useFakeTimers(); ImageDouble.images = []; vi.stubGlobal('Image', ImageDouble) })
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })
  it('requires all three decoded layers', async () => {
    const result = preloadCinematicArt(new AbortController().signal)
    expect(ImageDouble.images).toHaveLength(3)
    ImageDouble.images.forEach((image) => image.onload?.())
    await expect(result).resolves.toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })
  it('has a 1.2-second ceiling even when load never settles', async () => {
    const result = preloadCinematicArt(new AbortController().signal)
    vi.advanceTimersByTime(CINEMATIC.preloadMs)
    await expect(result).resolves.toBe(false)
    expect(ImageDouble.images.every((image) => image.onload === null)).toBe(true)
  })
  it('settles immediately on error or abort', async () => {
    const first = preloadCinematicArt(new AbortController().signal)
    ImageDouble.images[0].onerror?.()
    await expect(first).resolves.toBe(false)
    const controller = new AbortController()
    const second = preloadCinematicArt(controller.signal)
    controller.abort()
    await expect(second).resolves.toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })
  it('fails open when image decoding rejects', async () => {
    const result = preloadCinematicArt(new AbortController().signal)
    ImageDouble.images[0].decode.mockRejectedValue(new Error('corrupt'))
    ImageDouble.images[0].onload?.()
    await expect(result).resolves.toBe(false)
  })
})
