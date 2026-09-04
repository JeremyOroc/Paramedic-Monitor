'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type { VfDisplaySync } from '@/lib/automaticHeartRate'
import { useMonitorStore, type SharedMonitorState } from '@/store/monitorStore'

export const SESSION_SYNC_INTERVAL_MS = 1500

type SessionStatePayload = {
  session?: { status?: string; active_attempt_version?: number }
  state?: {
    state?: Partial<SharedMonitorState>
    version?: number
    updated_at?: string
  } | null
  /** Set when the server was told our version and nothing moved. */
  unchanged?: boolean
  serverReceivedAt?: number
  serverNow?: number
}

/** What the monitor knows about now, read at the moment an action is pressed. */
export type MonitorClock = {
  /** The state version on screen, or null before the first Send arrives. */
  stateVersion: number | null
  /** Server minus client, in ms, from the most recent poll. Null until measured. */
  clockOffsetMs: number | null
}

type UseSessionMonitorSyncOptions = {
  code: string
  /** Sent with each poll as a presence heartbeat for the instructor roster. */
  participantToken?: string
  intervalMs?: number
  onSessionInactive?: (status: string) => void
  onNewAttempt?: (attemptVersion: number) => void
}

/**
 * Polls the shared session state and applies it to the monitor store.
 * Snapshots are applied only when the state version changes, so trainee-local
 * progress is not rewritten on every poll tick. When the instructor forces a
 * new attempt, `onNewAttempt` fires and the next snapshot is re-applied even
 * if its version is unchanged.
 */
export function useSessionMonitorSync({
  code,
  participantToken = '',
  intervalMs = SESSION_SYNC_INTERVAL_MS,
  onSessionInactive,
  onNewAttempt,
}: UseSessionMonitorSyncOptions) {
  const applySharedState = useMonitorStore((s) => s.applySharedState)
  const [vfDisplaySync, setVfDisplaySync] = useState<VfDisplaySync | null>(null)
  const lastVersionRef = useRef<number | null>(null)
  const lastAttemptRef = useRef<number | null>(null)
  const clockOffsetRef = useRef<number | null>(null)
  const onSessionInactiveRef = useRef(onSessionInactive)
  const onNewAttemptRef = useRef(onNewAttempt)
  useEffect(() => {
    onSessionInactiveRef.current = onSessionInactive
    onNewAttemptRef.current = onNewAttempt
  }, [onNewAttempt, onSessionInactive])

  useEffect(() => {
    let cancelled = false

    async function pollState() {
      try {
        const requestStartedAt = Date.now()
        // Name the version we hold; an unchanged room answers without the
        // blob (docs/adr/0003).
        const since = lastVersionRef.current
        const response = await fetch(
          `/api/session/${code}/state${since !== null ? `?since=${since}` : ''}`,
          {
            headers: participantToken
              ? { 'x-session-participant-token': participantToken }
              : undefined,
          },
        )
        if (!response.ok) return
        const data = (await response.json()) as SessionStatePayload
        const responseReceivedAt = Date.now()
        if (cancelled) return

        // Measured on every poll, not only when state changes: a queued action
        // stamps the latest offset, and the room is usually unchanged.
        if (
          typeof data.serverReceivedAt === 'number' &&
          typeof data.serverNow === 'number'
        ) {
          clockOffsetRef.current =
            ((data.serverReceivedAt - requestStartedAt) +
              (data.serverNow - responseReceivedAt)) /
            2
        }

        // Read the attempt before the status gate. A new attempt also drops the
        // room back to 'waiting', and bailing on status first would send the
        // trainee to the waiting room without ever clearing the previous run's
        // persisted store — they would return to the monitor still holding it.
        const attemptVersion = data.session?.active_attempt_version
        if (typeof attemptVersion === 'number') {
          const lastAttempt = lastAttemptRef.current
          lastAttemptRef.current = attemptVersion
          if (lastAttempt !== null && attemptVersion !== lastAttempt) {
            lastVersionRef.current = null
            onNewAttemptRef.current?.(attemptVersion)
          }
        }

        const status = data.session?.status
        if (status !== 'active') {
          if (status) onSessionInactiveRef.current?.(status)
          return
        }

        if (data.unchanged) return

        const version = data.state?.version
        const shared = data.state?.state
        if (!shared || typeof version !== 'number') return
        if (lastVersionRef.current === version) return
        lastVersionRef.current = version
        applySharedState(shared)
        const epochMs = Date.parse(data.state?.updated_at ?? '')
        if (Number.isFinite(epochMs) && clockOffsetRef.current !== null) {
          setVfDisplaySync({
            seed: version,
            epochMs,
            serverOffsetMs: clockOffsetRef.current,
          })
        } else {
          setVfDisplaySync(null)
        }
      } catch {
        // Network blip — keep polling; the next tick retries.
      }
    }

    void pollState()
    const interval = window.setInterval(() => void pollState(), intervalMs)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [applySharedState, code, intervalMs, participantToken])

  const getClock = useCallback(
    (): MonitorClock => ({
      stateVersion: lastVersionRef.current,
      clockOffsetMs: clockOffsetRef.current,
    }),
    [],
  )

  return { vfDisplaySync, getClock }
}
