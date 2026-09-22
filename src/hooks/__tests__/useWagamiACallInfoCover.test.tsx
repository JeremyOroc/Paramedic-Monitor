import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { WagamiAView } from '@/types/wagamiA'
import { useWagamiACallInfoCover } from '../useWagamiACallInfoCover'

describe('useWagamiACallInfoCover', () => {
  it('keeps Call Info over the mounted shell until the returning monitor is ready', () => {
    const { result, rerender } = renderHook(
      ({ view }: { view: WagamiAView }) => useWagamiACallInfoCover(view),
      { initialProps: { view: 'monitor' as WagamiAView } },
    )

    expect(result.current.showCallInfo).toBe(false)
    rerender({ view: 'callInfo' })
    expect(result.current.showCallInfo).toBe(true)
    rerender({ view: 'monitor' })
    expect(result.current.showCallInfo).toBe(true)
    act(() => result.current.onMonitorReady())
    expect(result.current.showCallInfo).toBe(false)
  })
})
