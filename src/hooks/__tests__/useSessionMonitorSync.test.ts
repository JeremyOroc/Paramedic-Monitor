import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

import { useSessionMonitorSync } from '../useSessionMonitorSync'
import { useMonitorStore } from '@/store/monitorStore'

const statePayload = (version: number, status = 'active') => ({
  session: { status },
  state: { state: { cprOverrideActive: true }, version },
})

const okJson = (body: unknown) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve(body) } as Response)

describe('useSessionMonitorSync', () => {
  const fetchMock = vi.fn()
  const applySpy = vi.fn()
  const originalApply = useMonitorStore.getState().applySharedState

  beforeEach(() => {
    fetchMock.mockReset()
    applySpy.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    useMonitorStore.setState({ applySharedState: applySpy })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    useMonitorStore.setState({ applySharedState: originalApply })
  })

  it('applies the shared state once per version, not on every poll', async () => {
    fetchMock.mockImplementation(() => okJson(statePayload(1)))
    const { unmount } = renderHook(() =>
      useSessionMonitorSync({ code: 'ABC123', intervalMs: 10 }),
    )

    await vi.waitFor(() => expect(applySpy).toHaveBeenCalledTimes(1))
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(applySpy).toHaveBeenCalledTimes(1)

    fetchMock.mockImplementation(() => okJson(statePayload(2)))
    await vi.waitFor(() => expect(applySpy).toHaveBeenCalledTimes(2))
    expect(applySpy).toHaveBeenLastCalledWith({ cprOverrideActive: true })
    unmount()
  })

  it('reports an inactive session instead of applying state', async () => {
    fetchMock.mockImplementation(() => okJson(statePayload(1, 'waiting')))
    const onSessionInactive = vi.fn()
    const { unmount } = renderHook(() =>
      useSessionMonitorSync({ code: 'ABC123', intervalMs: 10, onSessionInactive }),
    )

    await vi.waitFor(() => expect(onSessionInactive).toHaveBeenCalledWith('waiting'))
    expect(applySpy).not.toHaveBeenCalled()
    unmount()
  })

  it('survives failed polls and applies once the next poll succeeds', async () => {
    fetchMock.mockImplementation(() => Promise.reject(new Error('offline')))
    const { unmount } = renderHook(() =>
      useSessionMonitorSync({ code: 'ABC123', intervalMs: 10 }),
    )

    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(applySpy).not.toHaveBeenCalled()

    fetchMock.mockImplementation(() => okJson(statePayload(1)))
    await vi.waitFor(() => expect(applySpy).toHaveBeenCalledTimes(1))
    unmount()
  })
})
