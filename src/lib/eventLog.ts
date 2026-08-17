import { formatEstTime } from '@/lib/estTime'
import type { EventLogEntry, EventLogStamp } from '@/types/eventLog'

let nextCaptureSequence = 0

export function createEventLogStamp(
  date: Date = new Date(),
): EventLogStamp & { occurredAtMs: number; captureSequence: number } {
  const stamp = {
    time: formatEstTime(date),
    occurredAtMs: date.getTime(),
    captureSequence: nextCaptureSequence,
  }
  nextCaptureSequence += 1
  return stamp
}

export function buildEventLogEntry(
  name: string,
  stamp: EventLogStamp | string,
): EventLogEntry {
  return typeof stamp === 'string' ? { name, time: stamp } : { name, ...stamp }
}

function hasCaptureOrder(entry: EventLogEntry): boolean {
  return Number.isFinite(entry.occurredAtMs) && Number.isFinite(entry.captureSequence)
}

function timeOfDaySeconds(time: string): number | null {
  const match = /^(\d{2}):(\d{2}):(\d{2})$/.exec(time)
  if (!match) return null
  const [, hoursText, minutesText, secondsText] = match
  const hours = Number(hoursText)
  const minutes = Number(minutesText)
  const seconds = Number(secondsText)
  if (hours > 23 || minutes > 59 || seconds > 59) return null
  return hours * 3600 + minutes * 60 + seconds
}

export function sortEventLogEntries(
  entries: readonly EventLogEntry[],
): EventLogEntry[] {
  const useCaptureOrder = entries.every(hasCaptureOrder)

  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((left, right) => {
      if (useCaptureOrder) {
        const timeDifference =
          (left.entry.occurredAtMs ?? 0) - (right.entry.occurredAtMs ?? 0)
        if (timeDifference !== 0) return timeDifference
        const sequenceDifference =
          (left.entry.captureSequence ?? 0) - (right.entry.captureSequence ?? 0)
        if (sequenceDifference !== 0) return sequenceDifference
        return left.index - right.index
      }

      const leftSeconds = timeOfDaySeconds(left.entry.time)
      const rightSeconds = timeOfDaySeconds(right.entry.time)
      if (leftSeconds !== null && rightSeconds !== null && leftSeconds !== rightSeconds) {
        return leftSeconds - rightSeconds
      }
      return left.index - right.index
    })
    .map(({ entry }) => entry)
}
