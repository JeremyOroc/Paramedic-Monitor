'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'

import { MonitorPage, type StudentEventRecord } from '@/app/page'
import { useSessionMonitorSync } from '@/hooks/useSessionMonitorSync'

function participantStorageKey(code: string) {
  return `paramedic-monitor.participant.${code.toUpperCase()}`
}

export default function SessionMonitorPage() {
  const params = useParams<{ code: string }>()
  const router = useRouter()
  const code = params.code.toUpperCase()
  const storageKey = useMemo(() => participantStorageKey(code), [code])
  const participantTokenRef = useRef('')

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

  useSessionMonitorSync({
    code,
    onSessionInactive: () => router.replace(`/session/${code}/waiting`),
  })

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
