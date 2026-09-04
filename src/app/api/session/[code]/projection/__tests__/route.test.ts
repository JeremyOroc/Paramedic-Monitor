import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  publishMonitorProjection,
  startMonitorProjectionStream,
} from '@/server/sessions/service'

import { POST } from '../route'

vi.mock('@/server/sessions/service', () => ({
  publishMonitorProjection: vi.fn(),
  startMonitorProjectionStream: vi.fn(),
}))

describe('POST /api/session/[code]/projection', () => {
  beforeEach(() => vi.clearAllMocks())

  it('starts a stream for the first snapshot', async () => {
    vi.mocked(startMonitorProjectionStream).mockResolvedValue({ streamId: 'stream-1' } as never)
    const projection = { version: 1 }
    const response = await POST(
      new Request('http://localhost/api/session/ABC123/projection', {
        method: 'POST',
        headers: { 'x-session-participant-token': 'participant-token' },
        body: JSON.stringify({ projection }),
      }),
      { params: Promise.resolve({ code: 'ABC123' }) },
    )

    expect(response.status).toBe(200)
    expect(startMonitorProjectionStream).toHaveBeenCalledWith(
      'ABC123',
      'participant-token',
      projection,
    )
  })

  it('publishes a sequenced snapshot to an existing stream', async () => {
    vi.mocked(publishMonitorProjection).mockResolvedValue({ streamId: 'stream-1' } as never)
    const projection = { version: 1 }
    await POST(
      new Request('http://localhost/api/session/ABC123/projection', {
        method: 'POST',
        headers: { 'x-session-participant-token': 'participant-token' },
        body: JSON.stringify({ projection, streamId: 'stream-1', clientSequence: 7 }),
      }),
      { params: Promise.resolve({ code: 'ABC123' }) },
    )

    expect(publishMonitorProjection).toHaveBeenCalledWith(
      'ABC123',
      'participant-token',
      'stream-1',
      7,
      projection,
    )
  })
})
