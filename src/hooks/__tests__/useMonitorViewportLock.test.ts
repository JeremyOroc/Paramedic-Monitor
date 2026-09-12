import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  MONITOR_VIEWPORT_LOCK_CLASS,
  useMonitorViewportLock,
} from '../useMonitorViewportLock'

const originalVisualViewport = Object.getOwnPropertyDescriptor(window, 'visualViewport')
const originalScrollX = Object.getOwnPropertyDescriptor(window, 'scrollX')
const originalScrollY = Object.getOwnPropertyDescriptor(window, 'scrollY')

describe('useMonitorViewportLock', () => {
  let scrollX = 0
  let scrollY = 0
  let viewport: EventTarget

  beforeEach(() => {
    scrollX = 0
    scrollY = 0
    viewport = new EventTarget()
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: viewport,
    })
    Object.defineProperty(window, 'scrollX', {
      configurable: true,
      get: () => scrollX,
    })
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      get: () => scrollY,
    })
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {
      scrollX = 0
      scrollY = 0
    })
  })

  afterEach(() => {
    document.documentElement.classList.remove(MONITOR_VIEWPORT_LOCK_CLASS)
    document.body.classList.remove(MONITOR_VIEWPORT_LOCK_CLASS)
    vi.restoreAllMocks()
    for (const [property, descriptor] of [
      ['visualViewport', originalVisualViewport],
      ['scrollX', originalScrollX],
      ['scrollY', originalScrollY],
    ] as const) {
      if (descriptor) Object.defineProperty(window, property, descriptor)
      else Reflect.deleteProperty(window, property)
    }
  })

  it('locks both document surfaces and restores only classes it added', () => {
    document.documentElement.classList.add(MONITOR_VIEWPORT_LOCK_CLASS)
    const { unmount } = renderHook(() => useMonitorViewportLock())

    expect(document.documentElement).toHaveClass(MONITOR_VIEWPORT_LOCK_CLASS)
    expect(document.body).toHaveClass(MONITOR_VIEWPORT_LOCK_CLASS)

    unmount()

    expect(document.documentElement).toHaveClass(MONITOR_VIEWPORT_LOCK_CLASS)
    expect(document.body).not.toHaveClass(MONITOR_VIEWPORT_LOCK_CLASS)
  })

  it('restores the origin after window and Visual Viewport movement and cleans up', () => {
    const { unmount } = renderHook(() => useMonitorViewportLock())
    const scrollTo = vi.mocked(window.scrollTo)

    scrollX = 120
    scrollY = 18
    act(() => window.dispatchEvent(new Event('scroll')))
    expect(scrollTo).toHaveBeenLastCalledWith(0, 0)

    scrollX = 75
    act(() => viewport.dispatchEvent(new Event('scroll')))
    expect(scrollTo).toHaveBeenCalledTimes(2)

    scrollY = 44
    act(() => viewport.dispatchEvent(new Event('resize')))
    expect(scrollTo).toHaveBeenCalledTimes(3)

    unmount()
    scrollX = 30
    act(() => viewport.dispatchEvent(new Event('resize')))
    expect(scrollTo).toHaveBeenCalledTimes(3)
  })
})
