'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import { MonitorPage, type StudentEventRecord } from '@/app/page'
import { useSessionMonitorSync } from '@/hooks/useSessionMonitorSync'
import { participantHeaders, readParticipantSession } from '@/lib/sessionStorage'
import { useMonitorStore } from '@/store/monitorStore'

export default function SessionMonitorPage() {
  const params = useParams<{ code: string }>()
  const router = useRouter()
  const code = params.code.toUpperCase()
  const [participantToken, setParticipantToken] = useState('')

  useEffect(() => {
    const token = readParticipantSession(code)?.participantToken
    if (!token) {
      router.replace('/')
      return
    }
    setParticipantToken(token)
  }, [code, router])

  // A forced new attempt restarts the trainee's drill: clear the local store
  // and remount the monitor so controller state (power, capture, etc.) resets.
  const [attemptVersion, setAttemptVersion] = useState(1)
  const resetStore = useMonitorStore((s) => s.reset)
  useSessionMonitorSync({
    code,
    participantToken,
    onSessionInactive: () => router.replace(`/session/${code}/waiting`),
    onNewAttempt: (version) => {
      resetStore()
      setAttemptVersion(version)
    },
  })

  const recordStudentEvent = useCallback(
    (event: StudentEventRecord) => {
      if (!participantToken) return
      void fetch(`/api/session/${code}/student-event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...participantHeaders(participantToken),
        },
        body: JSON.stringify(event),
      })
    },
    [code, participantToken],
  )

  return <MonitorPage key={attemptVersion} onStudentEvent={recordStudentEvent} />
}
