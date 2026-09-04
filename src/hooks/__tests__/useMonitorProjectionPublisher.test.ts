import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'

import type { MonitorProjection } from '@/types/monitorProjection'
import { useMonitorProjectionPublisher } from '@/hooks/useMonitorProjectionPublisher'

function projection(capturedAt: string): MonitorProjection {
  return { version: 1, capturedAt } as MonitorProjection
}

afterEach(() => vi.restoreAllMocks())

describe('useMonitorProjectionPublisher', () => {
  it('starts a stream, then advances its sequence for later snapshots', async () => {
    const fetchMock = vi.spyOn(window, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({
        projection: { streamId: 'stream-1', clientSequence: 0 },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        projection: { streamId: 'stream-1', clientSequence: 1 },
      }), { status: 200 }))
    const { result } = renderHook(() => useMonitorProjectionPublisher({
      code: 'ABC123',
      participantToken: 'participant-token',
    }))

    act(() => result.current(projection('2026-09-03T12:00:00.000Z')))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    act(() => result.current(projection('2026-09-03T12:00:01.000Z')))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))

    const firstBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))
    const secondBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))
    expect(firstBody).not.toHaveProperty('streamId')
    expect(secondBody).toMatchObject({ streamId: 'stream-1', clientSequence: 1 })
  })

  it('coalesces changes that arrive while a publish is in flight', async () => {
    let releaseFirst!: (response: Response) => void
    const firstResponse = new Promise<Response>((resolve) => { releaseFirst = resolve })
    const fetchMock = vi.spyOn(window, 'fetch')
      .mockReturnValueOnce(firstResponse)
      .mockResolvedValueOnce(new Response(JSON.stringify({
        projection: { streamId: 'stream-1', clientSequence: 1 },
      }), { status: 200 }))
    const { result } = renderHook(() => useMonitorProjectionPublisher({
      code: 'ABC123',
      participantToken: 'participant-token',
    }))

    act(() => {
      result.current(projection('first'))
      result.current(projection('superseded'))
      result.current(projection('latest'))
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    releaseFirst(new Response(JSON.stringify({
      projection: { streamId: 'stream-1', clientSequence: 0 },
    }), { status: 200 }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    const secondBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))
    expect(secondBody.projection.capturedAt).toBe('latest')
  })
})
