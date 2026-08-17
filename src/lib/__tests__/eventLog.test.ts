import { describe, expect, it } from 'vitest'

import {
  createEventLogStamp,
  sortEventLogEntries,
} from '@/lib/eventLog'
import type { EventLogEntry } from '@/types/eventLog'

describe('eventLog', () => {
  it('stamps display time, absolute time, and monotonically increasing capture order', () => {
    const date = new Date('2026-01-15T18:30:45.000Z')
    const first = createEventLogStamp(date)
    const second = createEventLogStamp(date)

    expect(first).toMatchObject({
      time: '13:30:45',
      occurredAtMs: date.getTime(),
    })
    expect(second.captureSequence).toBeGreaterThan(first.captureSequence)
  })

  it('sorts captured events oldest-first across midnight and by capture sequence for ties', () => {
    const entries: EventLogEntry[] = [
      {
        name: 'After midnight second',
        time: '00:00:01',
        occurredAtMs: 2_000,
        captureSequence: 3,
      },
      {
        name: 'Before midnight',
        time: '23:59:59',
        occurredAtMs: 1_000,
        captureSequence: 1,
      },
      {
        name: 'After midnight first',
        time: '00:00:01',
        occurredAtMs: 2_000,
        captureSequence: 2,
      },
    ]

    expect(sortEventLogEntries(entries).map((entry) => entry.name)).toEqual([
      'Before midnight',
      'After midnight first',
      'After midnight second',
    ])
    expect(entries.map((entry) => entry.name)).toEqual([
      'After midnight second',
      'Before midnight',
      'After midnight first',
    ])
  })

  it('keeps legacy rows and uses stable visible-time ordering for the whole mixed list', () => {
    const entries: EventLogEntry[] = [
      { name: 'Call - Transport', time: '12:41:52' },
      {
        name: 'Epi',
        time: '12:41:28',
        occurredAtMs: 100,
        captureSequence: 1,
      },
      { name: 'Fentanyl first', time: '12:41:46' },
      { name: 'Fentanyl second', time: '12:41:46' },
    ]

    expect(sortEventLogEntries(entries).map((entry) => entry.name)).toEqual([
      'Epi',
      'Fentanyl first',
      'Fentanyl second',
      'Call - Transport',
    ])
  })
})
