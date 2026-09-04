'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import { MonitorPage } from '@/components/monitor/MonitorPage'
import { useMonitorProjectionPublisher } from '@/hooks/useMonitorProjectionPublisher'
import { useSessionMonitorSync } from '@/hooks/useSessionMonitorSync'
import { useStudentActionQueue } from '@/hooks/useStudentActionQueue'
import { useMonitorStore } from '@/store/monitorStore'

function participantStorageKey(code: string) {
  return `paramedic-monitor.participant.${code.toUpperCase()}`
}

export default function SessionMonitorPage() {
  const params = useParams<{ code: string }>()
  const router = useRouter()
  const code = params.code.toUpperCase()
  const storageKey = useMemo(() => participantStorageKey(code), [code])
  const [participantToken, setParticipantToken] = useState('')

  // localStorage does not exist during SSR, so this cannot move into a lazy
  // useState initializer — hydrating from storage after mount is the only
  // correct place for it.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const raw = localStorage.getItem(storageKey)
    if (!raw) {
      router.replace('/')
      return
    }
    const parsed = JSON.parse(raw) as { participantToken?: string }
    if (!parsed.participantToken) {
      router.replace('/')
      return
    }
    setParticipantToken(parsed.participantToken)
  }, [router, storageKey])
  /* eslint-enable react-hooks/set-state-in-effect */

  // A forced new attempt restarts the trainee's drill: clear the local store
  // and remount the monitor so controller state (power, capture, etc.) resets.
  const [attemptVersion, setAttemptVersion] = useState(1)
  const resetStore = useMonitorStore((s) => s.reset)
  const { vfDisplaySync, getClock } = useSessionMonitorSync({
    code,
    participantToken,
    onSessionInactive: () => router.replace(`/session/${code}/waiting`),
    onNewAttempt: (version) => {
      resetStore()
      setAttemptVersion(version)
    },
  })

  // Queued, not fired and forgotten: an action pressed during a wifi drop
  // waits on the device and lands with the time and state version of the
  // press (docs/adr/0004).
  const recordStudentEvent = useStudentActionQueue({ code, participantToken, getClock })
  const publishProjection = useMonitorProjectionPublisher({ code, participantToken })

  return (
    <MonitorPage
      key={attemptVersion}
      onStudentEvent={recordStudentEvent}
      onProjectionChange={publishProjection}
      vfDisplaySync={vfDisplaySync}
    />
  )
}
