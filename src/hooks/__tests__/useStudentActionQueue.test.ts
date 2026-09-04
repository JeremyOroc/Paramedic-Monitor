import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'

import { useStudentActionQueue } from '../useStudentActionQueue'

describe('useStudentActionQueue', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts the action with the clock read at the press', async () => {
    fetchMock.mockResolvedValue({ status: 200 })
    const getClock = vi.fn(() => ({ stateVersion: 3, clockOffsetMs: -40 }))
    const { result, unmount } = renderHook(() =>
      useStudentActionQueue({ code: 'ABC123', participantToken: 'tok', getClock }),
    )

    act(() => result.current({ kind: 'shock', label: 'Shock', payload: { joules: 200 } }))

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/session/ABC123/student-event')
    expect(init.headers['x-session-participant-token']).toBe('tok')
    const body = JSON.parse(init.body)
    expect(body).toMatchObject({
      kind: 'shock',
      label: 'Shock',
      payload: { joules: 200 },
      stateVersion: 3,
      clockOffsetMs: -40,
      captureSequence: 0,
    })
    expect(Date.parse(body.occurredAtClient)).not.toBeNaN()
    unmount()
  })

  it('keeps an action through an outage and delivers it once the network returns', async () => {
    vi.useFakeTimers()
    fetchMock
      .mockRejectedValueOnce(new Error('offline'))
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({ status: 200 })
    const { result, unmount } = renderHook(() =>
      useStudentActionQueue({
        code: 'ABC123',
        participantToken: 'tok',
        getClock: () => ({ stateVersion: 1, clockOffsetMs: 0 }),
      }),
    )

    act(() => result.current({ kind: 'shock', label: 'Shock' }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)  // first backoff
      await vi.advanceTimersByTimeAsync(2000)  // second backoff
    })

    expect(fetchMock).toHaveBeenCalledTimes(3)
    // Every attempt carried the same press-time stamp.
    const stamps = fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body).occurredAtClient)
    expect(new Set(stamps).size).toBe(1)
    vi.useRealTimers()
    unmount()
  })

  it('does nothing without a participant token', () => {
    const { result } = renderHook(() =>
      useStudentActionQueue({
        code: 'ABC123',
        participantToken: '',
        getClock: () => ({ stateVersion: null, clockOffsetMs: null }),
      }),
    )

    act(() => result.current({ kind: 'power_on', label: 'Power On' }))

    expect(fetchMock).not.toHaveBeenCalled()
  })
})
