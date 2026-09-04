'use client'

import { useEffect, useState } from 'react'

import type { MonitorProjectionEnvelope } from '@/types/monitorProjection'

export type SpectateResponse = {
  session: {
    status: 'waiting' | 'active' | 'ended'
    active_attempt_version: number
  }
  participant: {
    id?: string
    nickname: string
    last_seen_at: string | null
  }
  projection: MonitorProjectionEnvelope | null
}

type TaggedSpectatorState = {
  participantId: string
  data: SpectateResponse | null
  connectionLost: boolean
}

type UseSpectatorProjectionOptions = {
  code: string
  hostToken: string
  participantId: string | null
}

export function useSpectatorProjection({
  code,
  hostToken,
  participantId,
}: UseSpectatorProjectionOptions) {
  const [state, setState] = useState<TaggedSpectatorState | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!participantId || !hostToken) return

    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | null = null

    const poll = async () => {
      try {
        const response = await fetch(
          `/api/session/${code}/spectate/${participantId}`,
          {
            headers: { 'x-session-host-token': hostToken },
            cache: 'no-store',
            signal: controller.signal,
          },
        )
        if (!response.ok) throw new Error('Spectator request failed')
        const data = (await response.json()) as SpectateResponse
        if (!controller.signal.aborted) {
          setState({ participantId, data, connectionLost: false })
          setNow(Date.now())
        }
      } catch {
        if (!controller.signal.aborted) {
          setState((current) => ({
            participantId,
            data: current?.participantId === participantId ? current.data : null,
            connectionLost: true,
          }))
        }
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(poll, 1000)
      }
    }

    void poll()
    return () => {
      controller.abort()
      if (timer) clearTimeout(timer)
    }
  }, [code, hostToken, participantId])

  useEffect(() => {
    if (!participantId) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [participantId])

  const current = state?.participantId === participantId ? state : null

  return {
    data: current?.data ?? null,
    connectionLost: current?.connectionLost ?? false,
    connecting: Boolean(participantId && hostToken && current === null),
    now,
  }
}
