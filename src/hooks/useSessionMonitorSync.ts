'use client'

import { useEffect, useRef } from 'react'

import { useMonitorStore, type SharedMonitorState } from '@/store/monitorStore'

export const SESSION_SYNC_INTERVAL_MS = 1500

type SessionStatePayload = {
  session?: { status?: string; active_attempt_version?: number }
  state?: { state?: Partial<SharedMonitorState>; version?: number } | null
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
  const lastVersionRef = useRef<number | null>(null)
  const lastAttemptRef = useRef<number | null>(null)
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
        const response = await fetch(`/api/session/${code}/state`, {
          headers: participantToken
            ? { 'x-session-participant-token': participantToken }
            : undefined,
        })
        if (!response.ok) return
        const data = (await response.json()) as SessionStatePayload
        if (cancelled) return

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

        const version = data.state?.version
        const shared = data.state?.state
        if (!shared || typeof version !== 'number') return
        if (lastVersionRef.current === version) return
        lastVersionRef.current = version
        applySharedState(shared)
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
}
