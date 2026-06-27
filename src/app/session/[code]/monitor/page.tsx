'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'

import { MonitorPage, type StudentEventRecord } from '@/app/page'
import { useMonitorStore, type SharedMonitorState } from '@/store/monitorStore'

function participantStorageKey(code: string) {
  return `paramedic-monitor.participant.${code.toUpperCase()}`
}

export default function SessionMonitorPage() {
  const params = useParams<{ code: string }>()
  const router = useRouter()
  const code = params.code.toUpperCase()
  const storageKey = useMemo(() => participantStorageKey(code), [code])
  const participantTokenRef = useRef('')
  const applySharedState = useMonitorStore((s) => s.applySharedState)

  useEffect(() => {
    const raw = localStorage.getItem(storageKey)
    if (!raw) {
      router.replace('/')
      return
    }
    const parsed = JSON.parse(raw) as { participantToken?: string }
    participantTokenRef.current = parsed.participantToken ?? ''
    if (!participantTokenRef.current) router.replace('/')
  }, [router, storageKey])

  useEffect(() => {
    let cancelled = false

    async function pollState() {
      const response = await fetch(`/api/session/${code}/state`)
      const data = await response.json()
      if (!response.ok || cancelled) return
      if (data.session.status !== 'active') {
        router.replace(`/session/${code}/waiting`)
        return
      }
      const shared = data.state?.state as Partial<SharedMonitorState> | undefined
      if (shared) applySharedState(shared)
    }

    void pollState()
    const interval = window.setInterval(() => void pollState(), 1500)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [applySharedState, code, router])

  const recordStudentEvent = useCallback(
    (event: StudentEventRecord) => {
      const participantToken = participantTokenRef.current
      if (!participantToken) return
      void fetch(`/api/session/${code}/student-event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-participant-token': participantToken,
        },
        body: JSON.stringify(event),
      })
    },
    [code],
  )

  return <MonitorPage onStudentEvent={recordStudentEvent} />
}
