import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useWagamiANavigation } from '../useWagamiANavigation'

describe('Wagami A per-view navigation', () => {
  it('activates selected enabled control once and synchronizes touch selection', () => {
    const first = vi.fn()
    const second = vi.fn()
    const actions = [{ id: 'first', enabled: true, activate: first }, { id: 'second', enabled: true, activate: second }]
    const { result } = renderHook(() => useWagamiANavigation('monitor', actions))
    act(() => result.current.move(1))
    expect(result.current.selectedId).toBe('first')
    act(() => result.current.enter())
    expect(first).toHaveBeenCalledTimes(1)
    act(() => result.current.touch('second'))
    expect(second).toHaveBeenCalledTimes(1)
    expect(result.current.selectedId).toBe('second')
  })

  it('restores prior live selection after a secondary view and never activates disabled actions', () => {
    const first = vi.fn()
    const back = vi.fn()
    const monitor = [{ id: 'first', enabled: true, activate: first }]
    const secondary = [{ id: 'back', enabled: true, activate: back }, { id: 'hidden', enabled: false, activate: vi.fn() }]
    const { result, rerender } = renderHook(({ view, actions }) => useWagamiANavigation(view, actions), { initialProps: { view: 'monitor', actions: monitor } })
    act(() => result.current.move(1))
    rerender({ view: 'secondary', actions: secondary })
    act(() => result.current.move(1))
    act(() => result.current.touch('hidden'))
    expect(result.current.selectedId).toBe('back')
    rerender({ view: 'monitor', actions: monitor })
    expect(result.current.selectedId).toBe('first')
  })
})
