import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useWagamiANavigation } from '../useWagamiANavigation'

describe('Wagami A per-view navigation', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

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

  it('hides selection after five seconds and requires reveal before latent Enter activates', () => {
    vi.useFakeTimers()
    vi.setSystemTime(10_000)
    const activate = vi.fn()
    const actions = [{ id: 'first', enabled: true, activate }]
    const { result } = renderHook(() => useWagamiANavigation('monitor', actions))

    act(() => result.current.move(1))
    expect(result.current.selectedId).toBe('first')
    act(() => vi.advanceTimersByTime(4_999))
    expect(result.current.selectedId).toBe('first')
    act(() => vi.advanceTimersByTime(1))
    expect(result.current.selectedId).toBeNull()
    expect(result.current.hasSelection).toBe(true)

    act(() => result.current.enter())
    expect(result.current.selectedId).toBe('first')
    expect(activate).not.toHaveBeenCalled()
    act(() => result.current.enter())
    expect(activate).toHaveBeenCalledOnce()
  })

  it('refreshes the deadline on navigable actions and restores it when returning to a view', () => {
    vi.useFakeTimers()
    vi.setSystemTime(20_000)
    const monitor = [{ id: 'first', enabled: true, activate: vi.fn() }]
    const secondary = [{ id: 'back', enabled: true, activate: vi.fn() }]
    const { result, rerender } = renderHook(
      ({ view, actions }) => useWagamiANavigation(view, actions),
      { initialProps: { view: 'monitor', actions: monitor } },
    )

    act(() => result.current.touch('first'))
    act(() => vi.advanceTimersByTime(4_000))
    act(() => result.current.enter())
    act(() => vi.advanceTimersByTime(4_999))
    expect(result.current.selectedId).toBe('first')

    rerender({ view: 'secondary', actions: secondary })
    act(() => result.current.move(1))
    rerender({ view: 'monitor', actions: monitor })
    expect(result.current.selectedId).toBe('first')
    act(() => vi.advanceTimersByTime(5_000))
    expect(result.current.selectedId).toBeNull()
  })

  it('forgets unavailable selections and clears every view on power-off', () => {
    const activate = vi.fn()
    const enabled = [{ id: 'first', enabled: true, activate }]
    const disabled = [{ id: 'first', enabled: false, activate }]
    const { result, rerender } = renderHook(
      ({ actions, active }) => useWagamiANavigation('monitor', actions, { active }),
      { initialProps: { actions: enabled, active: true } },
    )

    act(() => result.current.move(1))
    rerender({ actions: disabled, active: true })
    expect(result.current.hasSelection).toBe(false)
    rerender({ actions: enabled, active: true })
    expect(result.current.hasSelection).toBe(false)

    act(() => result.current.move(1))
    rerender({ actions: enabled, active: false })
    rerender({ actions: enabled, active: true })
    expect(result.current.hasSelection).toBe(false)
  })
})
