'use client'

import { useCallback, useEffect, useRef } from 'react'

import type { MonitorProjection } from '@/types/monitorProjection'

type PendingProjection = {
  value: MonitorProjection
  signature: string
}

type ProjectionResponse = {
  projection?: {
    streamId?: string
    clientSequence?: number
  }
}

export function useMonitorProjectionPublisher({
  code,
  participantToken,
}: {
  code: string
  participantToken: string
}) {
  const latestRef = useRef<PendingProjection | null>(null)
  const acknowledgedSignatureRef = useRef('')
  const streamIdRef = useRef('')
  const sequenceRef = useRef(0)
  const publishingRef = useRef(false)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)
  const drainRef = useRef<() => Promise<void>>(async () => {})

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    }
  }, [])

  const scheduleRetry = useCallback(() => {
    if (!mountedRef.current || retryTimerRef.current) return
    retryTimerRef.current = setTimeout(() => {
      retryTimerRef.current = null
      void drainRef.current()
    }, 1500)
  }, [])

  const drain = useCallback(async () => {
    if (!participantToken || publishingRef.current || !latestRef.current) return
    publishingRef.current = true
    try {
      while (
        mountedRef.current &&
        latestRef.current &&
        latestRef.current.signature !== acknowledgedSignatureRef.current
      ) {
        const pending = latestRef.current
        const streamId = streamIdRef.current
        const nextSequence = sequenceRef.current + 1
        const response = await fetch(`/api/session/${code}/projection`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session-participant-token': participantToken,
          },
          body: JSON.stringify({
            projection: pending.value,
            ...(streamId
              ? { streamId, clientSequence: nextSequence }
              : {}),
          }),
        })

        if (response.status === 409) {
          streamIdRef.current = ''
          sequenceRef.current = 0
          continue
        }
        if (!response.ok) {
          if (response.status === 410) {
            acknowledgedSignatureRef.current = pending.signature
          } else {
            scheduleRetry()
          }
          break
        }

        const data = (await response.json()) as ProjectionResponse
        if (typeof data.projection?.streamId !== 'string') {
          scheduleRetry()
          break
        }
        streamIdRef.current = data.projection.streamId
        sequenceRef.current =
          typeof data.projection.clientSequence === 'number'
            ? data.projection.clientSequence
            : nextSequence
        acknowledgedSignatureRef.current = pending.signature
      }
    } catch {
      scheduleRetry()
    } finally {
      publishingRef.current = false
      if (
        mountedRef.current &&
        latestRef.current &&
        latestRef.current.signature !== acknowledgedSignatureRef.current &&
        !retryTimerRef.current
      ) {
        void drainRef.current()
      }
    }
  }, [code, participantToken, scheduleRetry])

  useEffect(() => {
    drainRef.current = drain
  }, [drain])

  return useCallback(
    (projection: MonitorProjection) => {
      latestRef.current = {
        value: projection,
        signature: JSON.stringify(projection),
      }
      void drain()
    },
    [drain],
  )
}
