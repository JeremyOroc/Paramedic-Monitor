import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

import { useSessionMonitorSync } from '../useSessionMonitorSync'
import { useMonitorStore } from '@/store/monitorStore'

const statePayload = (version: number, status = 'active', attemptVersion = 1) => ({
  session: { status, active_attempt_version: attemptVersion },
  state: {
    state: { cprOverrideActive: true },
    version,
    updated_at: '2026-08-25T12:00:00.000Z',
  },
  serverReceivedAt: Date.now(),
  serverNow: Date.now(),
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

  it('returns server-aligned VF display metadata for the applied state version', async () => {
    fetchMock.mockImplementation(() => okJson(statePayload(7)))
    const { result, unmount } = renderHook(() =>
      useSessionMonitorSync({ code: 'ABC123', intervalMs: 10 }),
    )

    await vi.waitFor(() => expect(result.current.vfDisplaySync?.seed).toBe(7))
    expect(result.current.vfDisplaySync?.epochMs).toBe(Date.parse('2026-08-25T12:00:00.000Z'))
    expect(result.current.vfDisplaySync?.serverOffsetMs).toEqual(expect.any(Number))
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

  it('sends the participant token as a heartbeat header when provided', async () => {
    fetchMock.mockImplementation(() => okJson(statePayload(1)))
    const { unmount } = renderHook(() =>
      useSessionMonitorSync({
        code: 'ABC123',
        participantToken: 'participant_token',
        intervalMs: 10,
      }),
    )

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(fetchMock).toHaveBeenCalledWith('/api/session/ABC123/state', {
      headers: { 'x-session-participant-token': 'participant_token' },
    })
    unmount()
  })

  it('still fires onNewAttempt when the attempt bump also parks the room in waiting', async () => {
    // A New Attempt drops the room back to 'waiting' so the instructor arms the
    // next run deliberately. If the status gate ran first the trainee would be
    // sent to the waiting room without ever clearing the previous run's
    // persisted store, and would come back to the monitor still holding it.
    fetchMock.mockImplementation(() => okJson(statePayload(1, 'active', 1)))
    const onNewAttempt = vi.fn()
    const onSessionInactive = vi.fn()
    const { unmount } = renderHook(() =>
      useSessionMonitorSync({
        code: 'ABC123',
        intervalMs: 10,
        onNewAttempt,
        onSessionInactive,
      }),
    )

    await vi.waitFor(() => expect(applySpy).toHaveBeenCalled())
    expect(onNewAttempt).not.toHaveBeenCalled()

    fetchMock.mockImplementation(() => okJson(statePayload(1, 'waiting', 2)))

    await vi.waitFor(() => expect(onNewAttempt).toHaveBeenCalledWith(2))
    await vi.waitFor(() => expect(onSessionInactive).toHaveBeenCalledWith('waiting'))
    unmount()
  })

  it('fires onNewAttempt and re-applies the same state version on a new attempt', async () => {
    fetchMock.mockImplementation(() => okJson(statePayload(1, 'active', 1)))
    const onNewAttempt = vi.fn()
    const { unmount } = renderHook(() =>
      useSessionMonitorSync({ code: 'ABC123', intervalMs: 10, onNewAttempt }),
    )

    await vi.waitFor(() => expect(applySpy).toHaveBeenCalledTimes(1))
    expect(onNewAttempt).not.toHaveBeenCalled()

    fetchMock.mockImplementation(() => okJson(statePayload(1, 'active', 2)))
    await vi.waitFor(() => expect(onNewAttempt).toHaveBeenCalledWith(2))
    await vi.waitFor(() => expect(applySpy).toHaveBeenCalledTimes(2))
    unmount()
  })

  it('names the version it holds on every poll after the first (docs/adr/0003)', async () => {
    fetchMock.mockImplementation(() => okJson(statePayload(5)))
    const { unmount } = renderHook(() =>
      useSessionMonitorSync({ code: 'ABC123', intervalMs: 10 }),
    )

    await vi.waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2))
    expect(fetchMock.mock.calls[0][0]).toBe('/api/session/ABC123/state')
    expect(fetchMock.mock.calls[1][0]).toBe('/api/session/ABC123/state?since=5')
    unmount()
  })

  it('does not re-apply state when the server says nothing moved', async () => {
    fetchMock.mockImplementation(() => okJson(statePayload(5)))
    const { unmount } = renderHook(() =>
      useSessionMonitorSync({ code: 'ABC123', intervalMs: 10 }),
    )
    await vi.waitFor(() => expect(applySpy).toHaveBeenCalledTimes(1))

    fetchMock.mockImplementation(() =>
      okJson({
        session: { status: 'active', active_attempt_version: 1 },
        state: null,
        unchanged: true,
        serverReceivedAt: Date.now(),
        serverNow: Date.now(),
      }),
    )
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(applySpy).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('exposes the version on screen and the measured clock offset for the action queue', async () => {
    fetchMock.mockImplementation(() => okJson(statePayload(9)))
    const { result, unmount } = renderHook(() =>
      useSessionMonitorSync({ code: 'ABC123', intervalMs: 10 }),
    )

    expect(result.current.getClock()).toEqual({ stateVersion: null, clockOffsetMs: null })
    await vi.waitFor(() => expect(result.current.getClock().stateVersion).toBe(9))
    expect(result.current.getClock().clockOffsetMs).toEqual(expect.any(Number))
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
