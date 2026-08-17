'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { InstructorLayout } from '@/components/instructor/InstructorLayout'
import { VitalsControls } from '@/components/instructor/VitalsControls'
import { CallerInfoForm } from '@/components/instructor/CallerInfoForm'
import {
  PatientInformationPanel,
  type PatientInfoChecklist,
} from '@/components/instructor/PatientInformationPanel'
import {
  PatientPhysicalPanel,
  type PatientPhysicalSelection,
} from '@/components/instructor/PatientPhysicalPanel'
import { SaveButton } from '@/components/instructor/SaveButton'
import { SendButton } from '@/components/instructor/SendButton'
import { RoomCodeCopy } from '@/components/session/RoomCodeCopy'
import {
  CALLER_INFO_AUTO_SORT_FIELDS,
  parseCallerInfoAutoSort,
} from '@/lib/callerInfoAutoSort'
import {
  EMPTY_PATIENT_INFORMATION_TEXT,
  parsePatientInformationAutoSort,
  type PatientInformationTextState,
} from '@/lib/patientInformationAutoSort'
import {
  parseTimedPatientPhysicalAutoSort,
  parsePatientPhysicalAutoSort,
  type PatientPhysicalFindings,
} from '@/lib/patientPhysicalAutoSort'
import { anyoneCalibratedEtco2, isConnected, participantProgress } from '@/lib/sessionRoster'
import { parseVitalsAutoSort, type TimedVitalsSlot } from '@/lib/vitalsAutoSort'
import { useMonitorStore } from '@/store/monitorStore'
import { useStoreHydration } from '@/hooks/useStoreHydration'
import { cn } from '@/lib/utils'
import type { NumericVitalField } from '@/types/vitals'
import type { StudentEvent } from '@/types/session'

type AdminTab = 'monitor' | 'caller' | 'patient' | 'physical'
type PatientPhysicalIconGroupId =
  | 'respiratory'
  | 'pulse'
  | 'skin-extremities'
  | 'scene-environment'

type PatientInformationSelections = Record<PatientInfoChecklist, Set<string>>

const EMPTY_PATIENT_INFORMATION_SELECTIONS = (): PatientInformationSelections => ({
  sample: new Set<string>(),
  opqrst: new Set<string>(),
})

const AUTO_SORT_VITAL_FIELDS: ReadonlyArray<NumericVitalField> = [
  'hr',
  'spo2',
  'bp_sys',
  'bp_dia',
  'etco2',
]

type SessionAdminProps = {
  session?: {
    code: string
    hostToken: string
  }
}

type ReviewParticipant = {
  id: string
  nickname: string
  joined_at: string
  last_seen_at: string | null
}

export default function AdminPage({ session }: SessionAdminProps = {}) {
  const router = useRouter()
  useStoreHydration()
  const [tab, setTab] = useState<AdminTab>('monitor')
  const [patientSelections, setPatientSelections] = useState<PatientInformationSelections>(
    EMPTY_PATIENT_INFORMATION_SELECTIONS,
  )
  const [universalAutoSortText, setUniversalAutoSortText] = useState('')
  const [patientText, setPatientText] = useState<PatientInformationTextState>(
    EMPTY_PATIENT_INFORMATION_TEXT,
  )
  const [patientPhysicalSelections, setPatientPhysicalSelections] = useState<
    Set<PatientPhysicalSelection>
  >(new Set<PatientPhysicalSelection>())
  const [patientPhysicalFindings, setPatientPhysicalFindings] =
    useState<PatientPhysicalFindings>({})
  const [patientPhysicalActiveIconGroup, setPatientPhysicalActiveIconGroup] =
    useState<PatientPhysicalIconGroupId | null>(null)
  const reset = useMonitorStore((s) => s.reset)
  const resetMonitorVitals = useMonitorStore((s) => s.resetMonitorVitals)
  const setDraftVitalValues = useMonitorStore((s) => s.setDraftVitalValues)
  const setCallerInfoDraft = useMonitorStore((s) => s.setCallerInfoDraft)
  const getSharedState = useMonitorStore((s) => s.getSharedState)
  const startDispatchClock = useMonitorStore((s) => s.startDispatchClock)
  // Flips true on the first Send. Used to gate Start: the call has to be staged
  // before the room can open, so opening it is what begins the scenario.
  const dispatchArmed = useMonitorStore((s) => s.dispatch.armed)
  const [sessionStatus, setSessionStatus] = useState<'waiting' | 'active' | 'ended' | 'error'>(
    'waiting',
  )
  const [participants, setParticipants] = useState<ReviewParticipant[]>([])
  const [studentEvents, setStudentEvents] = useState<StudentEvent[]>([])
  const [attemptVersion, setAttemptVersion] = useState(1)
  const [sessionError, setSessionError] = useState('')

  const refreshReview = useCallback(async () => {
    if (!session) return
    const response = await fetch(`/api/session/${session.code}/review`, {
      headers: { 'x-session-host-token': session.hostToken },
    })
    const data = await response.json()
    if (!response.ok) {
      setSessionError(data.error ?? 'Unable to load session review')
      setSessionStatus('error')
      return
    }
    setSessionError('')
    setSessionStatus(data.session.status)
    if (typeof data.session.active_attempt_version === 'number') {
      setAttemptVersion(data.session.active_attempt_version)
    }
    setParticipants(data.participants ?? [])
    setStudentEvents(data.events ?? [])
  }, [session])

  // Polls the roster and student events. This is the "subscribe to an external
  // system" case effects exist for; the rule fires only because the first poll
  // runs synchronously so the panel is not blank for the first 2.5s.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!session) return
    void refreshReview()
    const interval = window.setInterval(() => void refreshReview(), 2500)
    return () => window.clearInterval(interval)
  }, [refreshReview, session])
  /* eslint-enable react-hooks/set-state-in-effect */

  const startSession = async () => {
    if (!session) return
    // Re-stamp and push the dispatch clock before opening the room, so trainees
    // arriving on the very first status poll already have travel time measured
    // from now rather than from whenever the call was staged.
    startDispatchClock()
    try {
      await sendSessionState()
    } catch (caught) {
      setSessionError(caught instanceof Error ? caught.message : 'Unable to send session state')
      return
    }
    const response = await fetch(`/api/session/${session.code}/start`, {
      method: 'POST',
      headers: { 'x-session-host-token': session.hostToken },
    })
    const data = await response.json()
    if (!response.ok) {
      setSessionError(data.error ?? 'Unable to start session')
      return
    }
    setSessionStatus(data.session.status)
    await refreshReview()
  }

  const startNewAttempt = async () => {
    if (!session) return
    const response = await fetch(`/api/session/${session.code}/attempt`, {
      method: 'POST',
      headers: { 'x-session-host-token': session.hostToken },
    })
    const data = await response.json()
    if (!response.ok) {
      setSessionError(data.error ?? 'Unable to start a new attempt')
      return
    }
    setAttemptVersion(data.session.active_attempt_version)
    // The room drops back to 'waiting', which re-enables Start / Dispatch so the
    // next run is armed deliberately rather than by the next Send.
    setSessionStatus(data.session.status)
    // A new attempt is a fresh drill in the same room, so the instructor side
    // resets too. Without this the previous run's vitals, caller info, and
    // dispatch stay loaded and get pushed straight back onto trainees who have
    // just been hard-reset by the attempt bump. Done only after the POST
    // succeeds, so a failed request does not wipe the panel.
    resetAllInstructorState()
    await refreshReview()
  }

  const endSession = async () => {
    if (!session) return
    const response = await fetch(`/api/session/${session.code}/end`, {
      method: 'POST',
      headers: { 'x-session-host-token': session.hostToken },
    })
    const data = await response.json()
    if (!response.ok) {
      setSessionError(data.error ?? 'Unable to end session')
      return
    }
    setSessionStatus(data.session.status)
    router.replace('/')
  }

  const sendSessionState = useCallback(async () => {
    if (!session) return
    const response = await fetch(`/api/session/${session.code}/state`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-host-token': session.hostToken,
      },
      body: JSON.stringify({ state: getSharedState() }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error ?? 'Unable to send session state')
  }, [getSharedState, session])

  // CPR override and Reset bypass Save → Send, so in a session they must push
  // shared state themselves — the Send button stays disabled without pending
  // Save → Send changes and would otherwise strand these on the admin screen.
  const cprOverrideActive = useMonitorStore((s) => s.cprOverrideActive)
  const monitorResetVersion = useMonitorStore((s) => s.monitorResetVersion)
  const immediatePushRef = useRef<{ cpr: boolean; resetVersion: number } | null>(null)
  useEffect(() => {
    if (!session) return
    const prev = immediatePushRef.current
    immediatePushRef.current = { cpr: cprOverrideActive, resetVersion: monitorResetVersion }
    if (!prev) return
    if (prev.cpr === cprOverrideActive && prev.resetVersion === monitorResetVersion) return
    void sendSessionState().catch((caught) => {
      setSessionError(
        caught instanceof Error ? caught.message : 'Unable to send session state',
      )
    })
  }, [cprOverrideActive, monitorResetVersion, sendSessionState, session])
  const resetPatientInformation = () => {
    setPatientSelections(EMPTY_PATIENT_INFORMATION_SELECTIONS())
    setPatientText(EMPTY_PATIENT_INFORMATION_TEXT())
  }
  const resetPatientPhysical = () => {
    setPatientPhysicalSelections(new Set<PatientPhysicalSelection>())
    setPatientPhysicalFindings({})
    setPatientPhysicalActiveIconGroup(null)
  }
  // Everything on the instructor side: the store (bumping monitorResetVersion,
  // which the effect above picks up to push the cleared state to students) plus
  // the panel state that lives in local component state rather than the store.
  const resetAllInstructorState = () => {
    reset()
    setUniversalAutoSortText('')
    resetPatientInformation()
    resetPatientPhysical()
  }
  const handleReset =
    tab === 'monitor'
      ? resetMonitorVitals
      : tab === 'caller'
        ? resetAllInstructorState
        : tab === 'patient'
          ? resetPatientInformation
          : resetPatientPhysical

  const togglePatientSelection = (checklist: PatientInfoChecklist, letter: string) => {
    setPatientSelections((current) => {
      const nextChecklist = new Set(current[checklist])
      if (nextChecklist.has(letter)) {
        nextChecklist.delete(letter)
      } else {
        nextChecklist.add(letter)
      }
      return {
        ...current,
        [checklist]: nextChecklist,
      }
    })
  }

  const handlePatientTextChange = (
    checklist: PatientInfoChecklist,
    letter: string,
    value: string,
  ) => {
    setPatientText((current) => ({
      ...current,
      [checklist]: {
        ...current[checklist],
        [letter]: value,
      },
    }))
  }

  const togglePatientPhysicalSelection = (selection: PatientPhysicalSelection) => {
    setPatientPhysicalSelections((current) => {
      const next = new Set(current)
      if (next.has(selection)) {
        next.delete(selection)
      } else {
        next.add(selection)
      }
      return next
    })
  }

  const applyParsedVitals = (parsed: ReturnType<typeof parseVitalsAutoSort>) => {
    const vitalValues: Partial<Record<NumericVitalField, number>> = {}
    for (const field of AUTO_SORT_VITAL_FIELDS) {
      const value = parsed[field]
      if (value !== undefined) vitalValues[field] = value
    }
    setDraftVitalValues(vitalValues)
  }

  const handleUniversalAutoSortChange = (value: string) => {
    setUniversalAutoSortText(value)

    const callerInfo = parseCallerInfoAutoSort(value)
    for (const field of CALLER_INFO_AUTO_SORT_FIELDS) {
      const parsedValue = callerInfo[field]
      if (parsedValue !== undefined) {
        setCallerInfoDraft(field, parsedValue)
      }
    }

    applyParsedVitals(parseVitalsAutoSort(value))
    setPatientText(parsePatientInformationAutoSort(value))
    setPatientPhysicalFindings(parsePatientPhysicalAutoSort(value))
  }

  const handleTimedVitalsPatientPhysicalUpdate = (slot: TimedVitalsSlot) => {
    const timedFindings = parseTimedPatientPhysicalAutoSort(universalAutoSortText, slot)
    setPatientPhysicalFindings((current) => ({
      ...current,
      ...timedFindings,
    }))
  }

  const handlePatientPhysicalIconGroupClick = (selection: PatientPhysicalIconGroupId) => {
    setPatientPhysicalSelections((current) => {
      if (current.has(selection)) return current
      const next = new Set(current)
      next.add(selection)
      return next
    })
    setPatientPhysicalActiveIconGroup((current) => (current === selection ? null : selection))
  }

  return (
    <InstructorLayout>
      {session && (
        <section className="grid gap-4 border border-cyan-bp/60 bg-cyan-bp/10 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-wider text-cyan-bp">
                Room code
              </p>
              <RoomCodeCopy code={session.code} className="mt-2" />
              <p className="text-sm text-neutral-300">
                Status: <span className="font-bold uppercase">{sessionStatus}</span>
                {' · '}Attempt <span className="font-bold">{attemptVersion}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={startSession}
              title={
                dispatchArmed ? undefined : 'Save and Send the call info before starting'
              }
              disabled={
                sessionStatus === 'active' || sessionStatus === 'ended' || !dispatchArmed
              }
              className="ml-auto border border-ecg-green bg-ecg-green px-4 py-2 font-mono text-xs font-black uppercase tracking-wider text-black hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Start / Dispatch
            </button>
            <button
              type="button"
              onClick={startNewAttempt}
              disabled={sessionStatus !== 'active'}
              className="border border-pending-amber bg-pending-amber/15 px-4 py-2 font-mono text-xs font-black uppercase tracking-wider text-pending-amber hover:bg-pending-amber hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
            >
              New Attempt
            </button>
            <button
              type="button"
              onClick={endSession}
              disabled={sessionStatus === 'ended'}
              className="border border-alarm-red bg-alarm-red/15 px-4 py-2 font-mono text-xs font-black uppercase tracking-wider text-alarm-red hover:bg-alarm-red hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
            >
              End Room
            </button>
          </div>
          {sessionError && <p className="text-sm font-semibold text-pending-amber">{sessionError}</p>}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="border border-neutral-800 bg-black/40 p-3">
              <h2 className="font-mono text-xs font-black uppercase tracking-wider text-neutral-400">
                Students
              </h2>
              <div className="mt-2 grid gap-2">
                {participants.length === 0 ? (
                  <p className="text-sm text-neutral-500">No students joined yet.</p>
                ) : (
                  participants.map((participant) => {
                    const connected = isConnected(participant.last_seen_at)
                    const progress = participantProgress(
                      studentEvents,
                      participant.id,
                      attemptVersion,
                    )
                    return (
                      <div
                        key={participant.id}
                        className="flex flex-wrap items-center justify-between gap-2 border border-neutral-800 px-3 py-2 text-sm"
                      >
                        <span className="flex items-center gap-2 font-bold text-white">
                          <span
                            role="status"
                            aria-label={connected ? 'Connected' : 'Offline'}
                            className={cn(
                              'inline-block h-2 w-2 rounded-full',
                              connected ? 'bg-ecg-green' : 'bg-neutral-600',
                            )}
                          />
                          {participant.nickname}
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                          <span className={cn(progress.acknowledged && 'text-ecg-green')}>Ack</span>
                          {' · '}
                          <span className={cn(progress.arrived && 'text-ecg-green')}>Arr</span>
                          {' · '}
                          <span className={cn(progress.transported && 'text-ecg-green')}>Txp</span>
                          {' · '}Shk {progress.shocks}
                          {' · '}Med {progress.medications}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
            <div className="max-h-56 overflow-auto border border-neutral-800 bg-black/40 p-3">
              <h2 className="font-mono text-xs font-black uppercase tracking-wider text-neutral-400">
                Live evaluation
              </h2>
              <div className="mt-2 grid gap-2">
                {studentEvents.length === 0 ? (
                  <p className="text-sm text-neutral-500">No student events yet.</p>
                ) : (
                  studentEvents.slice(-12).map((event) => {
                    const participant = participants.find((item) => item.id === event.participant_id)
                    return (
                      <div key={event.id} className="border border-neutral-800 px-3 py-2 text-sm">
                        <span className="font-bold text-cyan-bp">
                          {participant?.nickname ?? 'Student'}
                        </span>{' '}
                        <span className="text-white">{event.label}</span>
                        <span className="ml-2 text-xs text-neutral-500">
                          v{event.attempt_version}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </section>
      )}
      <div className="grid grid-cols-2 border border-neutral-800 bg-neutral-950 p-1 md:grid-cols-4">
        <button
          type="button"
          onClick={() => setTab('monitor')}
          aria-pressed={tab === 'monitor'}
          className={cn(
            'px-4 py-2 text-sm font-mono font-bold uppercase tracking-wider',
            tab === 'monitor'
              ? 'bg-cyan-bp text-black'
              : 'text-neutral-400 hover:bg-neutral-900',
          )}
        >
          Monitor
        </button>
        <button
          type="button"
          onClick={() => setTab('caller')}
          aria-pressed={tab === 'caller'}
          className={cn(
            'px-4 py-2 text-sm font-mono font-bold uppercase tracking-wider',
            tab === 'caller'
              ? 'bg-cyan-bp text-black'
              : 'text-neutral-400 hover:bg-neutral-900',
          )}
        >
          Caller Info
        </button>
        <button
          type="button"
          onClick={() => setTab('patient')}
          aria-pressed={tab === 'patient'}
          className={cn(
            'px-4 py-2 text-sm font-mono font-bold uppercase tracking-wider',
            tab === 'patient'
              ? 'bg-cyan-bp text-black'
              : 'text-neutral-400 hover:bg-neutral-900',
          )}
        >
          Patient Information
        </button>
        <button
          type="button"
          onClick={() => setTab('physical')}
          aria-pressed={tab === 'physical'}
          className={cn(
            'px-4 py-2 text-sm font-mono font-bold uppercase tracking-wider',
            tab === 'physical'
              ? 'bg-cyan-bp text-black'
              : 'text-neutral-400 hover:bg-neutral-900',
          )}
        >
          Patient Physical
        </button>
      </div>
      {tab === 'monitor' ? (
        <VitalsControls
          autoSortText={universalAutoSortText}
          onTimedVitalsClick={handleTimedVitalsPatientPhysicalUpdate}
          sessionEtco2Calibrated={
            session ? anyoneCalibratedEtco2(studentEvents, attemptVersion) : undefined
          }
        />
      ) : tab === 'patient' ? (
        <PatientInformationPanel
          selected={patientSelections}
          values={patientText}
          onTextChange={handlePatientTextChange}
          onToggle={togglePatientSelection}
        />
      ) : tab === 'physical' ? (
        <PatientPhysicalPanel
          selected={patientPhysicalSelections}
          findings={patientPhysicalFindings}
          activeIconGroup={patientPhysicalActiveIconGroup}
          onToggle={togglePatientPhysicalSelection}
          onIconGroupClick={handlePatientPhysicalIconGroupClick}
        />
      ) : (
        <CallerInfoForm
          autoSortText={universalAutoSortText}
          onAutoSortChange={handleUniversalAutoSortChange}
        />
      )}
      <div className="flex items-center gap-3">
        <SaveButton />
        <SendButton onSent={session ? sendSessionState : undefined} />
        <button
          type="button"
          onClick={handleReset}
          className="ml-auto px-3 py-2 border border-neutral-700 text-neutral-400 font-mono uppercase tracking-wider text-xs hover:bg-neutral-800"
        >
          Reset
        </button>
      </div>
      <p className="text-xs text-neutral-500">
        Open <span className="text-neutral-300">{session ? `/session/${session.code}/waiting` : '/'}</span> in another tab to see the monitor.
        Changes propagate after <span className="text-pending-amber">Send</span>.
      </p>
    </InstructorLayout>
  )
}
