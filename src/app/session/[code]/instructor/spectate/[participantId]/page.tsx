'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

import { SpectatorMonitor } from '@/components/instructor/SpectatorMonitor'
import { cn } from '@/lib/utils'
import type { MonitorProjectionEnvelope } from '@/types/monitorProjection'

type SpectateResponse = {
  session: {
    status: 'waiting' | 'active' | 'ended'
    active_attempt_version: number
  }
  participant: {
    nickname: string
  }
  projection: MonitorProjectionEnvelope | null
}

const OFFLINE_AFTER_MS = 5_000

function hostStorageKey(code: string) {
  return `paramedic-monitor.host.${code.toUpperCase()}`
}

export default function SpectatePage() {
  const params = useParams<{ code: string; participantId: string }>()
  const code = params.code.toUpperCase()
  const [hostToken, setHostToken] = useState('')
  const [resolved, setResolved] = useState(false)
  const [data, setData] = useState<SpectateResponse | null>(null)
  const [connectionLost, setConnectionLost] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(hostStorageKey(code))
      const stored = raw ? (JSON.parse(raw) as { hostToken?: string }) : null
      setHostToken(stored?.hostToken ?? '')
    } catch {
      setHostToken('')
    }
    setResolved(true)
  }, [code])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!hostToken) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const poll = async () => {
      try {
        const response = await fetch(
          `/api/session/${code}/spectate/${params.participantId}`,
          { headers: { 'x-session-host-token': hostToken }, cache: 'no-store' },
        )
        if (!response.ok) throw new Error('Spectator request failed')
        const next = (await response.json()) as SpectateResponse
        if (!cancelled) {
          setData(next)
          setConnectionLost(false)
        }
      } catch {
        if (!cancelled) setConnectionLost(true)
      } finally {
        if (!cancelled) timer = setTimeout(poll, 1000)
      }
    }

    void poll()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [code, hostToken, params.participantId])

  if (!resolved) return <main className="h-screen bg-black" />
  if (!hostToken) {
    return (
      <main className="grid h-screen place-items-center bg-black px-6 text-white">
        <p className="border border-alarm-red/70 bg-alarm-red/10 p-5 font-mono uppercase text-alarm-red">
          Instructor access required
        </p>
      </main>
    )
  }

  const envelope = data?.projection ?? null
  const traineeOffline =
    envelope !== null && now - Date.parse(envelope.updatedAt) > OFFLINE_AFTER_MS
  const roomEnded = data?.session.status === 'ended'
  const connectionLabel = connectionLost
    ? 'Spectator connection lost'
    : roomEnded
      ? 'Room ended'
      : traineeOffline
        ? 'Trainee offline'
        : envelope
          ? 'Live'
          : 'Waiting for trainee monitor'

  return (
    <main className="flex h-screen min-w-[1024px] flex-col overflow-hidden bg-black text-white">
      <header className="flex h-12 shrink-0 items-center gap-5 border-b border-neutral-800 bg-neutral-950 px-4 font-mono text-xs uppercase tracking-wider">
        <strong className="text-white">{data?.participant.nickname ?? 'Student'}</strong>
        <span className="text-neutral-400">
          {envelope?.projection.model === 'wagamiZ' ? 'Wagami Z' : envelope ? 'Wagami X' : 'Monitor pending'}
        </span>
        <span
          role="status"
          className={cn(
            'ml-auto font-bold',
            !connectionLost && !traineeOffline && !roomEnded && envelope
              ? 'text-ecg-green'
              : connectionLost || traineeOffline
                ? 'text-pending-amber'
                : 'text-neutral-400',
          )}
        >
          {connectionLabel}
        </span>
        <span className="text-neutral-500">
          {envelope
            ? `Updated ${new Date(envelope.updatedAt).toLocaleTimeString()}`
            : `Attempt ${data?.session.active_attempt_version ?? '—'}`}
        </span>
      </header>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {envelope ? (
          <div inert className="h-full w-full select-none pointer-events-none" aria-label="Read-only student monitor">
            <SpectatorMonitor projection={envelope.projection} />
          </div>
        ) : (
          <div className="grid h-full place-items-center bg-black">
            <div className="text-center font-mono uppercase tracking-[0.25em] text-neutral-500">
              <p>{roomEnded ? 'Room ended' : 'Waiting for trainee monitor'}</p>
              {!roomEnded ? <p className="mt-3 text-xs text-neutral-700">The view appears when the student opens the monitor.</p> : null}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
