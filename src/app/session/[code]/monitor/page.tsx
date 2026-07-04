'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import { MonitorPage, type StudentEventRecord } from '@/app/page'
import { useSessionMonitorSync } from '@/hooks/useSessionMonitorSync'
import { useMonitorStore } from '@/store/monitorStore'

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

  // A forced new attempt restarts the trainee's drill: clear the local store
  // and remount the monitor so controller state (power, capture, etc.) resets.
  const [attemptVersion, setAttemptVersion] = useState(1)
  const resetStore = useMonitorStore((s) => s.reset)
  useSessionMonitorSync({
    code,
    onSessionInactive: () => router.replace(`/session/${code}/waiting`),
    onNewAttempt: (version) => {
      resetStore()
      setAttemptVersion(version)
    },
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

  return <MonitorPage key={attemptVersion} onStudentEvent={recordStudentEvent} />
}
