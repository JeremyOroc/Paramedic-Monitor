'use client'

import { useCallback, useEffect, useRef } from 'react'

import {
  createActionQueue,
  outcomeForStatus,
  type ActionClock,
  type ActionQueue,
  type QueuedAction,
} from '@/lib/actionQueue'
export type StudentActionInput = {
  kind: string
  label: string
  payload?: unknown
}

type UseStudentActionQueueOptions = {
  code: string
  participantToken: string
  /** Read at press time, so the action carries the version the monitor was showing. */
  getClock: () => ActionClock
}

/**
 * One queue per mounted monitor. Replaces the fire-and-forget POST that lost
 * any action pressed during an outage (docs/adr/0004).
 */
export function useStudentActionQueue({
  code,
  participantToken,
  getClock,
}: UseStudentActionQueueOptions) {
  const queueRef = useRef<ActionQueue | null>(null)
  const getClockRef = useRef(getClock)
  useEffect(() => {
    getClockRef.current = getClock
  }, [getClock])

  useEffect(() => {
    if (!participantToken) return
    const queue = createActionQueue({
      send: async (action: QueuedAction) => {
        const response = await fetch(`/api/session/${code}/student-event`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session-participant-token': participantToken,
          },
          body: JSON.stringify(action),
        })
        return outcomeForStatus(response.status)
      },
      onDrop: (action) => {
        console.error('[monitor] action rejected by the server and dropped:', action.kind)
      },
    })
    queueRef.current = queue
    return () => {
      queue.stop()
      queueRef.current = null
    }
  }, [code, participantToken])

  return useCallback((event: StudentActionInput) => {
    queueRef.current?.enqueue(event, getClockRef.current())
  }, [])
}
