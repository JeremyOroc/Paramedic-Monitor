import { describe, expect, it } from 'vitest'

import { createRoomJoinUrl } from '@/lib/roomJoinUrl'

describe('createRoomJoinUrl', () => {
  it('builds the fixed production join URL with a normalized Room code', () => {
    expect(createRoomJoinUrl(' abc234 ')).toBe(
      'https://paramedic-monitor.vercel.app/?code=ABC234',
    )
  })
})
