import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { useWagamiZViewport } from '@/hooks/useWagamiZViewport'

const ORIGINAL_WIDTH = window.innerWidth
const ORIGINAL_HEIGHT = window.innerHeight

function setViewport(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height })
  act(() => window.dispatchEvent(new Event('resize')))
}

describe('useWagamiZViewport', () => {
  afterEach(() => {
    setViewport(ORIGINAL_WIDTH, ORIGINAL_HEIGHT)
  })

  it('supports landscape usable viewports at and above 1024×700', () => {
    setViewport(1024, 700)
    const { result } = renderHook(() => useWagamiZViewport())
    expect(result.current).toBe('supported')
  })

  it('distinguishes portrait from undersized landscape viewports', () => {
    setViewport(768, 1024)
    const { result } = renderHook(() => useWagamiZViewport())
    expect(result.current).toBe('portrait')

    setViewport(1000, 700)
    expect(result.current).toBe('undersized')
  })
})
