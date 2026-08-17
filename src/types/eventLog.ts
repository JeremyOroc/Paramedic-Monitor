export type EventLogStamp = {
  time: string
  occurredAtMs?: number
  captureSequence?: number
}

export type EventLogEntry = EventLogStamp & {
  name: string
}
