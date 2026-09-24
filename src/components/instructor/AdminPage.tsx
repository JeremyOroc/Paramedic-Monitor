'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { InstructorLayout } from '@/components/instructor/InstructorLayout'
import {
  EmbeddedSpectatorPanel,
  type SpectatorPresentationMode,
} from '@/components/instructor/EmbeddedSpectatorPanel'
import { ConfirmationDialog } from '@/components/instructor/ConfirmationDialog'
import { VitalsControls } from '@/components/instructor/VitalsControls'
import { DefibrillatorPanel } from '@/components/instructor/DefibrillatorPanel'
import { EvaluationReportPanel } from '@/components/instructor/EvaluationReportPanel'
import { AttemptNotesPanel } from '@/components/instructor/AttemptNotesPanel'
import { TreatmentRecorder } from '@/components/instructor/TreatmentRecorder'
import { CallerInfoForm } from '@/components/instructor/CallerInfoForm'
import { ScenarioLibraryPanel } from '@/components/instructor/ScenarioLibraryPanel'
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
import { RoomQrCode } from '@/components/session/RoomQrCode'
import { RoomLauncher, type ExistingRoom } from '@/components/session/RoomLauncher'
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
import { anyoneCalibratedEtco2, isConnected } from '@/lib/sessionRoster'
import {
  createEmptyScenarioSnapshot,
  createScenarioSnapshot,
  hasMeaningfulScenarioContent,
  scenarioSnapshotsEqual,
} from '@/lib/scenarioSnapshot'
import { ALL_MEDICATIONS } from '@/lib/monitor/medications'
import { TRAUMA_TREATMENTS, type TreatmentCategory } from '@/lib/instructorTreatments'
import { parseVitalsAutoSort, type TimedVitalsSlot } from '@/lib/vitalsAutoSort'
import { VITAL_TREND_FIELDS } from '@/lib/vitalTrend'
import { useMonitorStore } from '@/store/monitorStore'
import { usePatientSnsMeasurements } from '@/hooks/usePatientSnsMeasurements'
import { useDispatchRouteResolution } from '@/hooks/useDispatchRouteResolution'
import { useStoreHydration } from '@/hooks/useStoreHydration'
import { useVitalTrendClock } from '@/hooks/useVitalTrendClock'
import { cn } from '@/lib/utils'
import {
  hasDispatchCountdownDirty,
  hasDispatchRouteDurationPending,
  hasDefibrillatorModelDirty,
  hasDefibrillatorModelPending,
  normalizeDispatchAddress,
} from '@/store/fieldState'
import type {
  PatientPhysicalIconGroupId,
  PatientSnsMeasurementDurationSeconds,
  PatientSnsMeasurementGroupId,
} from '@/types/patientPhysical'
import type { CprMode, NumericVitalField } from '@/types/vitals'
import type {
  AttemptLabel,
  AttemptGeneralNotes,
  InstructorNote,
  ParticipantAttempt,
  SessionStateHistoryEntry,
  StudentEvent,
  StudentEventKind,
} from '@/types/session'
import type {
  SavedScenario,
  SavedScenarioSummary,
  ScenarioSnapshotV1,
} from '@/types/savedScenario'
import type { DispatchRoute } from '@/types/dispatchRoute'

type AdminTab = 'scenarios' | 'monitor' | 'physical' | 'defibrillators' | 'report'

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
  initialExistingRoom?: ExistingRoom | null
  session?: {
    code: string
    controllerToken: string
    canControl?: boolean
    onTakeControl?: () => void
  }
}

type ReviewParticipant = {
  id: string
  nickname: string
  joined_at: string
  last_seen_at: string | null
}

type SessionStatusValue = 'waiting' | 'active' | 'ended' | 'error'

type PastReview = {
  attemptVersion: number
  participants: ReviewParticipant[]
  events: StudentEvent[]
  stateHistory: SessionStateHistoryEntry[]
  attempts: ParticipantAttempt[]
  attemptLabels: AttemptLabel[]
  attemptGeneralNotes: AttemptGeneralNotes[]
  instructorNotes: InstructorNote[]
  truncated: boolean
}

type ScenarioBaseline = {
  title: string
  snapshot: ScenarioSnapshotV1
}

type ScenarioConfirmation = {
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
}

type DispatchConfirmationKind = 'start' | 'send'
type RoutePublishStatus = 'idle' | 'pending' | 'failed'

function getRouteWarning(route: DispatchRoute, incidentAddress: string): string | null {
  if (incidentAddress.trim() === '') return 'No Incident-scene address is configured.'
  if (
    normalizeDispatchAddress(route.destinationAddress) !==
    normalizeDispatchAddress(incidentAddress)
  ) {
    return 'Route is still calculating.'
  }
  if (route.status === 'ready') return null
  if (route.status === 'failed') {
    return `Route is unavailable.${route.error ? ` ${route.error}` : ''}`
  }
  return 'Route is still calculating.'
}

function getRouteSignature(route: DispatchRoute): string {
  return JSON.stringify(route)
}

function getResponseError(data: unknown, fallback: string): string {
  if (
    typeof data === 'object' &&
    data !== null &&
    'error' in data &&
    typeof data.error === 'string'
  ) {
    return data.error
  }
  return fallback
}

export default function AdminPage({ initialExistingRoom, session }: SessionAdminProps = {}) {
  useStoreHydration()
  useVitalTrendClock()
  // Only the "Room ended" notice navigates; End Room itself stays put.
  const router = useRouter()
  const [tab, setTab] = useState<AdminTab>('scenarios')
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
  const handlePatientSnsMeasurementResult = useCallback(
    (group: PatientSnsMeasurementGroupId) => {
      setPatientPhysicalSelections((current) => {
        if (current.has(group)) return current
        const next = new Set(current)
        next.add(group)
        return next
      })
    },
    [],
  )
  const {
    measurements: patientSnsMeasurements,
    startMeasurement: startPatientSnsMeasurement,
    toggleMeasurementResult: togglePatientSnsMeasurementResult,
    cancelMeasurement: cancelPatientSnsMeasurement,
    resetMeasurements: resetPatientSnsMeasurements,
  } = usePatientSnsMeasurements(handlePatientSnsMeasurementResult)
  const [scenarioTitle, setScenarioTitle] = useState('')
  const [selectedScenarioFolderId, setSelectedScenarioFolderId] = useState('')
  const [expandedScenarioFolderIds, setExpandedScenarioFolderIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [loadedScenarioId, setLoadedScenarioId] = useState<string | null>(null)
  const [loadedScenarioFolderId, setLoadedScenarioFolderId] = useState<string | null>(null)
  const [loadedScenarioLibraryKind, setLoadedScenarioLibraryKind] =
    useState<SavedScenario['library_kind'] | null>(null)
  const [loadedScenarioCanEdit, setLoadedScenarioCanEdit] = useState(false)
  const [scenarioBaseline, setScenarioBaseline] = useState<ScenarioBaseline | null>(null)
  const [scenarioDraftActive, setScenarioDraftActive] = useState(false)
  const [scenarioRefreshVersion, setScenarioRefreshVersion] = useState(0)
  const [scenarioEditorVersion, setScenarioEditorVersion] = useState(0)
  const [scenarioAction, setScenarioAction] = useState<'idle' | 'saving' | 'deleting'>('idle')
  const [scenarioError, setScenarioError] = useState('')
  const [scenarioConfirmation, setScenarioConfirmation] =
    useState<ScenarioConfirmation | null>(null)
  const [dispatchConfirmation, setDispatchConfirmation] =
    useState<DispatchConfirmationKind | null>(null)
  const [routePublishStatus, setRoutePublishStatus] =
    useState<RoutePublishStatus>('idle')
  const [routePublishError, setRoutePublishError] = useState('')
  const [dispatchActionBusy, setDispatchActionBusy] = useState(false)
  const resetForNewAttempt = useMonitorStore((s) => s.resetForNewAttempt)
  const setDraftVitalValues = useMonitorStore((s) => s.setDraftVitalValues)
  const setCallerInfoDraft = useMonitorStore((s) => s.setCallerInfoDraft)
  const applyScenarioDraft = useMonitorStore((s) => s.applyScenarioDraft)
  const getSharedState = useMonitorStore((s) => s.getSharedState)
  const startDispatchClock = useMonitorStore((s) => s.startDispatchClock)
  const sendMonitorState = useMonitorStore((s) => s.send)
  const scenarioVitalsDraft = useMonitorStore((s) => s.draft)
  const scenarioVitalActive = useMonitorStore((s) => s.draftVitalActive)
  const scenarioLastRhythm = useMonitorStore((s) => s.lastRhythm)
  const scenarioVitalTrend = useMonitorStore((s) => s.vitalTrendDraft)
  const scenarioCallerInfo = useMonitorStore((s) => s.callerInfoDraft)
  const scenarioDispatchMinutes = useMonitorStore((s) => s.dispatchMinutes)
  const scenarioDispatchSeconds = useMonitorStore((s) => s.dispatchSeconds)
  const dispatchSavedSeconds = useMonitorStore((s) => s.dispatchSavedSeconds)
  const dispatchConfirmedSeconds = useMonitorStore((s) => s.dispatchConfirmedSeconds)
  const scenarioDispatchOrigin = useMonitorStore((s) => s.dispatchRouteDraft.originAddress)
  const callerInfoSavedAddress = useMonitorStore((s) => s.callerInfoSaved.address)
  const callerInfoConfirmedAddress = useMonitorStore((s) => s.callerInfoConfirmed.address)
  const dispatchRouteDraft = useMonitorStore((s) => s.dispatchRouteDraft)
  const dispatchRouteSaved = useMonitorStore((s) => s.dispatchRouteSaved)
  const dispatchRouteConfirmed = useMonitorStore((s) => s.dispatchRouteConfirmed)
  const defibrillatorModelDraft = useMonitorStore((s) => s.defibrillatorModelDraft)
  const defibrillatorModelSaved = useMonitorStore((s) => s.defibrillatorModelSaved)
  const defibrillatorModelConfirmed = useMonitorStore((s) => s.defibrillatorModelConfirmed)
  // Flips true on the first Send. Used to gate Start: the call has to be staged
  // before the room can open, so opening it is what begins the scenario.
  const dispatchArmed = useMonitorStore((s) => s.dispatch.armed)
  const defibrillatorModelDirty = hasDefibrillatorModelDirty(
    defibrillatorModelDraft,
    defibrillatorModelSaved,
  )
  const defibrillatorModelPending = hasDefibrillatorModelPending(
    defibrillatorModelSaved,
    defibrillatorModelConfirmed,
  )
  const defibrillatorModelReady = !defibrillatorModelDirty && !defibrillatorModelPending
  const [sessionStatus, setSessionStatus] = useState<SessionStatusValue>('waiting')
  const [participants, setParticipants] = useState<ReviewParticipant[]>([])
  const [spectatedParticipantId, setSpectatedParticipantId] = useState<string | null>(null)
  const [spectatorPresentationMode, setSpectatorPresentationMode] =
    useState<SpectatorPresentationMode>('docked')
  const spectatorButtonRefs = useRef(new Map<string, HTMLButtonElement>())
  const [studentEvents, setStudentEvents] = useState<StudentEvent[]>([])
  const [stateHistory, setStateHistory] = useState<SessionStateHistoryEntry[]>([])
  const [attempts, setAttempts] = useState<ParticipantAttempt[]>([])
  const [attemptLabels, setAttemptLabels] = useState<AttemptLabel[]>([])
  const [attemptGeneralNotes, setAttemptGeneralNotes] = useState<AttemptGeneralNotes[]>([])
  const [instructorNotes, setInstructorNotes] = useState<InstructorNote[]>([])
  const [reviewTruncated, setReviewTruncated] = useState(false)
  const [attemptVersion, setAttemptVersion] = useState(1)
  const [generalNotesDraftState, setGeneralNotesDraftState] = useState<{
    attemptVersion: number
    value: string
  } | null>(null)
  // A past attempt the evaluator has opened in the Report tab. The 2.5s poll
  // stays on the active attempt, because the roster depends on it -- looking
  // back is a deliberate, one-off read rather than something polled.
  const [pastReview, setPastReview] = useState<PastReview | null>(null)
  const [sessionError, setSessionError] = useState('')
  const sessionWriteQueueRef = useRef<Promise<void>>(Promise.resolve())
  const trendCompletionPublishingRef = useRef(new Set<string>())
  const routePublishSequenceRef = useRef(0)
  const routePublishTargetRef = useRef('')
  const lastPublishedRouteRef = useRef('')
  const lastPublishedScenarioTitleRef = useRef<string | null>(null)
  const dispatchActionBusyRef = useRef(false)
  // The instructor's explicit pick of who an instructor-recorded action is
  // credited to. Null means "whoever is first", which is every one-trainee
  // room and so most of them.
  const [creditedChoice, setCreditedChoice] = useState<string | null>(null)
  const [instructorEventError, setInstructorEventError] = useState('')
  // Presses the record has not caught up with yet. The roster poll is the
  // source of truth for the tally, but it is 2.5s behind a press, and a button
  // whose count moves a beat later reads as a button that did not work.
  const [pendingTreatments, setPendingTreatments] = useState<Record<string, number>>({})
  const canControlRoom = session?.canControl ?? true

  const stopSpectating = useCallback((participantId: string) => {
    setSpectatorPresentationMode('docked')
    setSpectatedParticipantId(null)
    window.setTimeout(() => spectatorButtonRefs.current.get(participantId)?.focus(), 0)
  }, [])

  // History rides the poll only while the Report tab is showing it. Each row
  // is a full sent state, so on a long attempt it dwarfs the roster the poll
  // is really for.
  const includeHistory = tab === 'report'
  const refreshReview = useCallback(async () => {
    if (!session) return
    const response = await fetch(
      `/api/session/${session.code}/review${includeHistory ? '?include=history' : ''}`,
      { cache: 'no-store' },
    )
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
    // The evaluation record's second axis. Fetched all along and thrown away
    // until the Report tab existed to render it.
    // Only overwrite history from a response that carried it, so leaving the
    // Report tab does not blank what the next visit will refetch anyway.
    if (includeHistory) setStateHistory(data.stateHistory ?? [])
    setAttempts(data.attempts ?? [])
    setAttemptLabels(data.attemptLabels ?? [])
    setAttemptGeneralNotes(data.attemptGeneralNotes ?? [])
    setInstructorNotes(data.instructorNotes ?? [])
    setReviewTruncated(data.truncated === true)
  }, [includeHistory, session])

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

  const startNewAttempt = async () => {
    if (!session || !canControlRoom) return
    if (generalNotesDirty) {
      setSessionError('Save or revert General Notes before starting a new Attempt.')
      return
    }
    const response = await fetch(`/api/session/${session.code}/attempt`, {
      method: 'POST',
      headers: { 'x-room-controller-token': session.controllerToken },
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
    if (!session || !canControlRoom) return
    if (generalNotesDirty) {
      setSessionError('Save or revert General Notes before ending the Room.')
      return
    }
    // A thrown fetch (offline, a non-JSON 500 from the host) used to reject
    // this handler unhandled: no message, no navigation, the button did
    // nothing. Every failure now says so.
    let data: { session?: { status?: SessionStatusValue }; error?: string }
    try {
      const response = await fetch(`/api/session/${session.code}/end`, {
        method: 'POST',
        headers: { 'x-room-controller-token': session.controllerToken },
      })
      data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setSessionError(data.error ?? `Unable to end room (HTTP ${response.status})`)
        return
      }
    } catch (caught) {
      setSessionError(
        caught instanceof Error ? `Unable to end room: ${caught.message}` : 'Unable to end room',
      )
      return
    }
    setSessionError('')
    // Deliberately no navigation: the spectator mini-player and the Report
    // tab stay useful after End Room (see the spectate work). The "Room
    // ended" notice below is how the instructor leaves when ready.
    if (data.session?.status) setSessionStatus(data.session.status)
  }

  // Selecting the active attempt drops back to the live poll; selecting an
  // earlier one reads it once. Nothing here touches the polled state, so the
  // roster keeps tracking the run in progress while the evaluator looks back.
  const viewReportAttempt = useCallback(
    async (version: number) => {
      if (!session) return
      if (version === attemptVersion) {
        setPastReview(null)
        return
      }
      const response = await fetch(
        `/api/session/${session.code}/review?attempt=${version}&include=history`,
        { cache: 'no-store' },
      )
      const data = await response.json()
      if (!response.ok) {
        setSessionError(data.error ?? 'Unable to load that attempt')
        return
      }
      setSessionError('')
      setPastReview({
        attemptVersion: version,
        participants: data.participants ?? [],
        events: data.events ?? [],
        stateHistory: data.stateHistory ?? [],
        attempts: data.attempts ?? [],
        attemptLabels: data.attemptLabels ?? [],
        attemptGeneralNotes: data.attemptGeneralNotes ?? [],
        instructorNotes: data.instructorNotes ?? [],
        truncated: data.truncated === true,
      })
    },
    [attemptVersion, session],
  )

  // Name an attempt. The response is applied locally so the picker and the
  // status line update at once rather than on the next poll.
  const renameAttempt = useCallback(
    async (version: number, label: string) => {
      if (!session || !canControlRoom) return
      let data: { attempt?: AttemptLabel; error?: string }
      try {
        const response = await fetch(`/api/session/${session.code}/attempt/${version}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-room-controller-token': session.controllerToken,
          },
          body: JSON.stringify({ label }),
        })
        data = await response.json().catch(() => ({}))
        if (!response.ok) {
          setSessionError(data.error ?? `Unable to rename attempt (HTTP ${response.status})`)
          return
        }
      } catch (caught) {
        setSessionError(caught instanceof Error ? caught.message : 'Unable to rename attempt')
        return
      }
      const saved = data.attempt
      if (!saved) return
      setSessionError('')
      const apply = (labels: AttemptLabel[]) => [
        ...labels.filter((entry) => entry.attempt_version !== saved.attempt_version),
        saved,
      ]
      setAttemptLabels(apply)
      setPastReview((current) =>
        current ? { ...current, attemptLabels: apply(current.attemptLabels) } : current,
      )
    },
    [canControlRoom, session],
  )

  const report = pastReview ?? {
    attemptVersion,
    participants,
    events: studentEvents,
    stateHistory,
    attempts,
    attemptLabels,
    attemptGeneralNotes,
    instructorNotes,
    truncated: reviewTruncated,
  }
  const activeAttemptLabel =
    attemptLabels.find((entry) => entry.attempt_version === attemptVersion)?.label ?? ''
  const activeGeneralNotes =
    attemptGeneralNotes.find((entry) => entry.attempt_version === attemptVersion)?.general_notes ?? ''
  const generalNotesDraft = generalNotesDraftState?.attemptVersion === attemptVersion
    ? generalNotesDraftState.value
    : activeGeneralNotes
  const generalNotesDirty = generalNotesDraft !== activeGeneralNotes

  useEffect(() => {
    if (!generalNotesDirty) return
    const warnBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [generalNotesDirty])

  const saveGeneralNotes = useCallback(
    async (generalNotes: string) => {
      if (!session || !canControlRoom) throw new Error('This room is read-only on this device.')
      const response = await fetch(`/api/session/${session.code}/attempt-notes`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-room-controller-token': session.controllerToken,
        },
        body: JSON.stringify({ generalNotes }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.attemptNotes) {
        throw new Error(getResponseError(data, 'Unable to save General Notes'))
      }
      const saved = data.attemptNotes as AttemptGeneralNotes
      setAttemptGeneralNotes((current) => [
        ...current.filter((entry) => entry.attempt_version !== saved.attempt_version),
        saved,
      ])
      setGeneralNotesDraftState({
        attemptVersion: saved.attempt_version,
        value: saved.general_notes,
      })
    },
    [canControlRoom, session],
  )

  const sendReportNote = useCallback(
    async (body: string) => {
      if (!session || !canControlRoom) throw new Error('This room is read-only on this device.')
      const response = await fetch(`/api/session/${session.code}/instructor-notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-room-controller-token': session.controllerToken,
        },
        body: JSON.stringify({ body }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.instructorNote) {
        throw new Error(getResponseError(data, 'Unable to send Report Note'))
      }
      setInstructorNotes((current) => [...current, data.instructorNote as InstructorNote])
      await refreshReview()
    },
    [canControlRoom, refreshReview, session],
  )

  const sendSessionState = useCallback(async (
    updateKind: 'instructor' | 'route-enrichment' | 'trend-completion' = 'instructor',
  ) => {
    if (!session || !canControlRoom) return
    // Completion can sit behind an in-flight Send in the serialized queue.
    // Capture the exact terminal snapshot now so later instructor edits or a
    // replacement Trend cannot change which command/value set gets recorded.
    const trendCompletionSnapshot =
      updateKind === 'trend-completion' ? getSharedState() : null
    const trendCompletionId = trendCompletionSnapshot?.activeVitalTrend?.id ?? ''
    const write = async () => {
      const sharedState = trendCompletionSnapshot ?? getSharedState()
      const activeTrend = sharedState.activeVitalTrend
      // A zero-duration Trend has already reached its targets by the time the
      // original Send is published. Preserve its starting readings in that
      // command row so the following completion write owns the final change,
      // exactly like a timed Trend does.
      if (
        updateKind === 'instructor' &&
        activeTrend?.status === 'complete' &&
        !activeTrend.completionPublished
      ) {
        for (const field of VITAL_TREND_FIELDS) {
          const participant = activeTrend.participants[field]
          if (participant) sharedState.confirmed[field] = participant.start
        }
      }
      const scenarioTitleForWrite = updateKind === 'route-enrichment'
        ? lastPublishedScenarioTitleRef.current ?? scenarioTitle.trim()
        : scenarioTitle.trim()
      const instructorOnly =
        updateKind === 'route-enrichment'
          ? { stateUpdateKind: updateKind }
          : updateKind === 'trend-completion'
            ? {
                stateUpdateKind: updateKind,
                trendCompletionId,
              }
            : {
                stateUpdateKind: updateKind,
                patientInformation: {
                  selected: {
                    sample: [...patientSelections.sample].sort(),
                    opqrst: [...patientSelections.opqrst].sort(),
                  },
                  values: {
                    sample: { ...patientText.sample },
                    opqrst: { ...patientText.opqrst },
                  },
                },
                patientSns: { ...patientPhysicalFindings },
              }
      const response = await fetch(`/api/session/${session.code}/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-room-controller-token': session.controllerToken,
        },
        body: JSON.stringify({
          state: {
            ...sharedState,
            // The title is console state, not monitor state, so it joins here
            // rather than in the store's shared snapshot.
            scenarioTitleConfirmed: scenarioTitleForWrite,
            // The report's instructor rows could show vitals and the dispatch
            // card but not the history the trainee had to elicit or the
            // Pulse/Respiratory/Skin findings they had to palpate for, because
            // none of it left the console. It travels here -- and the server
            // keeps it in session_state_history while stripping it from the
            // session_state the trainee polls, so the answer key stays on the
            // instructor's side of the room.
            instructorOnly,
          },
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(getResponseError(data, 'Unable to send session state'))
      }
      lastPublishedRouteRef.current = getRouteSignature(sharedState.dispatchRouteConfirmed)
      if (updateKind === 'instructor') {
        lastPublishedScenarioTitleRef.current = scenarioTitleForWrite
      }
    }

    const queued = sessionWriteQueueRef.current.then(write, write)
    sessionWriteQueueRef.current = queued.catch(() => undefined)
    await queued
  }, [
    canControlRoom,
    getSharedState,
    patientPhysicalFindings,
    patientSelections,
    patientText,
    scenarioTitle,
    session,
  ])

  const completedVitalTrend = useMonitorStore((state) =>
    state.activeVitalTrend?.status === 'complete' &&
    !state.activeVitalTrend.completionPublished
      ? state.activeVitalTrend
      : null,
  )
  const markVitalTrendCompletionPublished = useMonitorStore(
    (state) => state.markVitalTrendCompletionPublished,
  )
  useEffect(() => {
    if (!completedVitalTrend) return
    const id = completedVitalTrend.id
    if (!session || sessionStatus === 'ended') {
      markVitalTrendCompletionPublished(id)
      return
    }
    if (!canControlRoom) return
    if (trendCompletionPublishingRef.current.has(id)) return

    trendCompletionPublishingRef.current.add(id)
    markVitalTrendCompletionPublished(id)
    void sendSessionState('trend-completion')
      .catch((caught) => {
        markVitalTrendCompletionPublished(id, false)
        setSessionError(
          caught instanceof Error ? caught.message : 'Unable to record Trend completion',
        )
      })
      .finally(() => {
        trendCompletionPublishingRef.current.delete(id)
      })
  }, [
    canControlRoom,
    completedVitalTrend,
    markVitalTrendCompletionPublished,
    sendSessionState,
    session,
    sessionStatus,
  ])

  const publishRouteEnrichment = useCallback(
    (route: DispatchRoute) => {
      if (!session || !canControlRoom || sessionStatus !== 'active') return
      const targetSignature = getRouteSignature(route)
      if (
        lastPublishedRouteRef.current === targetSignature ||
        routePublishTargetRef.current === targetSignature
      ) {
        return
      }

      const sequence = routePublishSequenceRef.current + 1
      routePublishSequenceRef.current = sequence
      routePublishTargetRef.current = targetSignature
      setRoutePublishStatus('pending')
      setRoutePublishError('')

      const publish = async () => {
        const delays = [0, 300, 900]
        let lastError: unknown = null
        for (const delay of delays) {
          if (routePublishSequenceRef.current !== sequence) return
          if (delay > 0) {
            await new Promise<void>((resolve) => window.setTimeout(resolve, delay))
          }
          if (routePublishSequenceRef.current !== sequence) return
          await sessionWriteQueueRef.current.catch(() => undefined)
          if (lastPublishedRouteRef.current === targetSignature) {
            routePublishTargetRef.current = ''
            setRoutePublishStatus('idle')
            setRoutePublishError('')
            return
          }
          const current = useMonitorStore.getState().dispatchRouteConfirmed
          if (
            current.status !== 'ready' ||
            current.originAddress !== route.originAddress ||
            current.destinationAddress !== route.destinationAddress
          ) {
            if (routePublishSequenceRef.current === sequence) {
              routePublishTargetRef.current = ''
              setRoutePublishStatus('idle')
            }
            return
          }
          try {
            await sendSessionState('route-enrichment')
            if (routePublishSequenceRef.current === sequence) {
              routePublishTargetRef.current = ''
              setRoutePublishStatus('idle')
              setRoutePublishError('')
            }
            return
          } catch (caught) {
            lastError = caught
          }
        }

        if (routePublishSequenceRef.current === sequence) {
          routePublishTargetRef.current = ''
          setRoutePublishStatus('failed')
          setRoutePublishError(
            lastError instanceof Error ? lastError.message : 'Route update could not be sent',
          )
        }
      }

      void publish()
    },
    [canControlRoom, sendSessionState, session, sessionStatus],
  )

  const { retryRoute } = useDispatchRouteResolution({
    onConfirmedRouteReady: publishRouteEnrichment,
  })

  useEffect(() => {
    if (sessionStatus === 'active' && dispatchRouteConfirmed.status === 'ready') {
      publishRouteEnrichment(dispatchRouteConfirmed)
    }
  }, [dispatchRouteConfirmed, publishRouteEnrichment, sessionStatus])

  const routeAuthoredUnsaved =
    normalizeDispatchAddress(dispatchRouteDraft.originAddress) !==
      normalizeDispatchAddress(dispatchRouteSaved.originAddress) ||
    normalizeDispatchAddress(scenarioCallerInfo.address) !==
      normalizeDispatchAddress(callerInfoSavedAddress)
  const routeAuthoredUnsent =
    normalizeDispatchAddress(dispatchRouteSaved.originAddress) !==
      normalizeDispatchAddress(dispatchRouteConfirmed.originAddress) ||
    normalizeDispatchAddress(callerInfoSavedAddress) !==
      normalizeDispatchAddress(callerInfoConfirmedAddress)
  const routeChangesNotSent = routeAuthoredUnsaved || routeAuthoredUnsent
  const countdownChangesNotSent =
    hasDispatchCountdownDirty(
      scenarioDispatchMinutes,
      scenarioDispatchSeconds,
      dispatchSavedSeconds,
    ) || hasDispatchRouteDurationPending(dispatchSavedSeconds, dispatchConfirmedSeconds)

  const runStart = useCallback(async () => {
    if (!session || !canControlRoom || dispatchActionBusyRef.current) return
    dispatchActionBusyRef.current = true
    setDispatchActionBusy(true)
    // Nothing mutates until the route preflight has either passed or the
    // instructor explicitly chose Start Anyway.
    startDispatchClock()
    try {
      await sendSessionState()
      const response = await fetch(`/api/session/${session.code}/start`, {
        method: 'POST',
        headers: { 'x-room-controller-token': session.controllerToken },
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setSessionError(getResponseError(data, 'Unable to start session'))
        return
      }
      setSessionError('')
      setSessionStatus(data.session.status)
      await refreshReview()
    } catch (caught) {
      setSessionError(caught instanceof Error ? caught.message : 'Unable to start session')
    } finally {
      dispatchActionBusyRef.current = false
      setDispatchActionBusy(false)
    }
  }, [canControlRoom, refreshReview, sendSessionState, session, startDispatchClock])

  const requestStart = () => {
    const state = useMonitorStore.getState()
    if (getRouteWarning(state.dispatchRouteConfirmed, state.callerInfoConfirmed.address)) {
      setDispatchConfirmation('start')
      return
    }
    void runStart()
  }

  const beforeSend = (): boolean => {
    if (sessionStatus !== 'active') return true
    const state = useMonitorStore.getState()
    const createsNewRun =
      !state.dispatch.armed ||
      (!state.dispatch.countdownLocked &&
        (state.dispatchSavedSeconds !== state.dispatchConfirmedSeconds ||
          normalizeDispatchAddress(state.callerInfoSaved.address) !==
            normalizeDispatchAddress(state.callerInfoConfirmed.address)))
    if (!createsNewRun) return true
    if (!getRouteWarning(state.dispatchRouteSaved, state.callerInfoSaved.address)) return true
    setDispatchConfirmation('send')
    return false
  }

  const runConfirmedSend = async () => {
    if (dispatchActionBusyRef.current) return
    dispatchActionBusyRef.current = true
    setDispatchActionBusy(true)
    sendMonitorState()
    try {
      await sendSessionState()
      setSessionError('')
    } catch (caught) {
      setSessionError(caught instanceof Error ? caught.message : 'Unable to send session state')
    } finally {
      dispatchActionBusyRef.current = false
      setDispatchActionBusy(false)
    }
  }

  // Resolved against the live roster on every render rather than stored,
  // because the roster is polled: a trainee who leaves, or a New Attempt that
  // clears the room, would otherwise leave a stale id selected and every
  // recorded action 404ing against a participant who is no longer there.
  const creditedParticipantId =
    participants.find((participant) => participant.id === creditedChoice)?.id ??
    participants[0]?.id ??
    null

  /**
   * Writes a trainee action the instructor pressed on the trainee's behalf.
   *
   * Fire-and-forget by design: the console is not the trainee's monitor and has
   * no offline queue behind it, so a failure is reported next to the button
   * rather than retried. The row is credited to the trainee; the server stamps
   * the instructor marker.
   */
  const recordInstructorAction = useCallback(
    async (kind: StudentEventKind, label: string, payload?: Record<string, unknown>) => {
      if (!session || !canControlRoom || !creditedParticipantId) return
      try {
        const response = await fetch(`/api/session/${session.code}/instructor-event`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-room-controller-token': session.controllerToken,
          },
          body: JSON.stringify({
            participantId: creditedParticipantId,
            kind,
            label,
            payload,
          }),
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          setInstructorEventError(getResponseError(data, `Unable to record ${label}`))
          return
        }
        setInstructorEventError('')
        // The record just changed, so pull it rather than waiting out the poll.
        await refreshReview()
      } catch (caught) {
        setInstructorEventError(
          caught instanceof Error ? caught.message : `Unable to record ${label}`,
        )
      }
    },
    [canControlRoom, creditedParticipantId, refreshReview, session],
  )

  /**
   * How many times each treatment has been recorded this attempt.
   *
   * Counts every matching action in the run rather than only the ones logged
   * here. Scoped to the live attempt from
   * `studentEvents` rather than `report.events`, which follows the evaluator
   * into past attempts while this grid always records into the current one.
   */
  const treatmentCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const event of studentEvents) {
      if (event.kind !== 'medication' && event.kind !== 'treatment') continue
      if (event.attempt_version !== attemptVersion) continue
      counts[event.label] = (counts[event.label] ?? 0) + 1
    }
    for (const [treatment, pending] of Object.entries(pendingTreatments)) {
      counts[treatment] = (counts[treatment] ?? 0) + pending
    }
    return counts
  }, [attemptVersion, pendingTreatments, studentEvents])

  /**
   * A treatment press, counted optimistically so the tally moves under the finger.
   *
   * The pending entry is released once the write has settled either way --
   * `recordInstructorAction` refreshes the record before it resolves, so a
   * success hands straight over to the polled count with no flicker, and a
   * failure takes the optimistic entry back off rather than leaving a tally
   * claiming a treatment the record never got.
   */
  const recordTreatment = useCallback(
    async (treatment: string, category: TreatmentCategory) => {
      setPendingTreatments((current) => ({
        ...current,
        [treatment]: (current[treatment] ?? 0) + 1,
      }))
      try {
        await recordInstructorAction('treatment', treatment, { category })
      } finally {
        setPendingTreatments((current) => {
          const next = { ...current }
          const remaining = (next[treatment] ?? 1) - 1
          if (remaining > 0) next[treatment] = remaining
          else delete next[treatment]
          return next
        })
      }
    },
    [recordInstructorAction],
  )

  /**
   * Why the treatment grid and the checklist logging cannot write right now, or null
   * when they can. Said out loud on the panel: a dead button with no reason is
   * indistinguishable from a broken one.
   */
  const instructorRecordingUnavailable = !session
    ? 'Start a room to record actions.'
    : !canControlRoom
      ? 'This room is read-only on this device.'
      : sessionStatus === 'ended'
        ? 'This room has ended.'
        : participants.length === 0
          ? 'No device has joined yet.'
          : null
  const attemptNotesUnavailable = !session
    ? 'Start a Room to add notes.'
    : !canControlRoom
      ? 'This Room is read-only on this device.'
      : sessionStatus !== 'active'
        ? 'Start / Dispatch before adding notes.'
        : null

    // CPR override and full instructor resets bypass Save → Send, so in a
  // session they must push shared state themselves — the Send button stays
  // disabled without pending changes and would otherwise strand these locally.
  const cprMode = useMonitorStore((s) => s.cprMode)
  const monitorResetVersion = useMonitorStore((s) => s.monitorResetVersion)
  const immediatePushRef = useRef<{ cprMode: CprMode; resetVersion: number } | null>(null)
  useEffect(() => {
    if (!session || !canControlRoom) return
    const prev = immediatePushRef.current
    immediatePushRef.current = { cprMode, resetVersion: monitorResetVersion }
    if (!prev) return
    if (prev.cprMode === cprMode && prev.resetVersion === monitorResetVersion) return
    void sendSessionState().catch((caught) => {
      setSessionError(
        caught instanceof Error ? caught.message : 'Unable to send session state',
      )
    })
  }, [canControlRoom, cprMode, monitorResetVersion, sendSessionState, session])

  const currentScenarioSnapshot = createScenarioSnapshot({
    defibrillatorModel: defibrillatorModelDraft,
    autoSortText: universalAutoSortText,
    monitor: {
      draft: scenarioVitalsDraft,
      draftVitalActive: scenarioVitalActive,
      lastRhythm: scenarioLastRhythm,
    },
    trend: scenarioVitalTrend,
    callerInfo: scenarioCallerInfo,
    dispatch: {
      minutes: scenarioDispatchMinutes,
      seconds: scenarioDispatchSeconds,
      originAddress: scenarioDispatchOrigin,
    },
    patientInformation: {
      selected: patientSelections,
      values: patientText,
    },
    patientPhysical: {
      selected: patientPhysicalSelections,
      findings: patientPhysicalFindings,
    },
  })
  const scenarioHasContent = hasMeaningfulScenarioContent(currentScenarioSnapshot)
  const scenarioIsDirty = scenarioBaseline
    ? scenarioTitle !== scenarioBaseline.title ||
      !scenarioSnapshotsEqual(currentScenarioSnapshot, scenarioBaseline.snapshot)
    : scenarioTitle.trim() !== '' || scenarioHasContent
  const saveScenarioDisabled =
    (!loadedScenarioId && !scenarioDraftActive) ||
    !scenarioIsDirty ||
    sessionStatus === 'active'

  const resetPatientInformation = () => {
    setPatientSelections(EMPTY_PATIENT_INFORMATION_SELECTIONS())
    setPatientText(EMPTY_PATIENT_INFORMATION_TEXT())
  }
  const resetPatientPhysical = () => {
    setPatientPhysicalSelections(new Set<PatientPhysicalSelection>())
    setPatientPhysicalFindings({})
    setPatientPhysicalActiveIconGroup(null)
    resetPatientSnsMeasurements()
  }
  const clearScenarioAuthoringState = () => {
    const empty = createEmptyScenarioSnapshot()
    applyScenarioDraft(empty)
    setUniversalAutoSortText(empty.autoSortText)
    resetPatientInformation()
    resetPatientPhysical()
    setScenarioTitle('')
    setLoadedScenarioId(null)
    setLoadedScenarioFolderId(null)
    setLoadedScenarioLibraryKind(null)
    setLoadedScenarioCanEdit(false)
    setScenarioBaseline(null)
    setScenarioDraftActive(false)
    setScenarioError('')
    setScenarioEditorVersion((version) => version + 1)
  }
  // Everything on the instructor side: the store (bumping monitorResetVersion,
  // which the effect above picks up to push the cleared state to students) plus
  // the panel state that lives in local component state rather than the store.
  const resetAllInstructorState = () => {
    resetForNewAttempt()
    setUniversalAutoSortText('')
    resetPatientInformation()
    resetPatientPhysical()
    setScenarioTitle('')
    setLoadedScenarioId(null)
    setLoadedScenarioFolderId(null)
    setLoadedScenarioLibraryKind(null)
    setLoadedScenarioCanEdit(false)
    setScenarioBaseline(null)
    setScenarioDraftActive(false)
    setScenarioError('')
    setGeneralNotesDraftState(null)
    setScenarioEditorVersion((version) => version + 1)
  }
  const applyLoadedScenario = (scenario: SavedScenario) => {
    resetPatientSnsMeasurements()
    applyScenarioDraft(scenario.snapshot)
    setUniversalAutoSortText(scenario.snapshot.autoSortText)
    setPatientSelections({
      sample: new Set(scenario.snapshot.patientInformation.selected.sample),
      opqrst: new Set(scenario.snapshot.patientInformation.selected.opqrst),
    })
    setPatientText({
      sample: { ...scenario.snapshot.patientInformation.values.sample },
      opqrst: { ...scenario.snapshot.patientInformation.values.opqrst },
    })
    setPatientPhysicalSelections(new Set(scenario.snapshot.patientPhysical.selected))
    setPatientPhysicalFindings({ ...scenario.snapshot.patientPhysical.findings })
    setPatientPhysicalActiveIconGroup(null)
    setScenarioTitle(scenario.title)
    setLoadedScenarioId(scenario.id)
    setLoadedScenarioFolderId(scenario.folder_id)
    setLoadedScenarioLibraryKind(scenario.library_kind)
    setLoadedScenarioCanEdit(scenario.can_edit)
    setScenarioBaseline({ title: scenario.title, snapshot: scenario.snapshot })
    setScenarioDraftActive(false)
    setScenarioError('')
    setScenarioEditorVersion((version) => version + 1)
  }

  const startScenarioDraft = () => {
    clearScenarioAuthoringState()
    setScenarioDraftActive(true)
    if (selectedScenarioFolderId) {
      handleScenarioFolderExpansionChange(selectedScenarioFolderId, true)
    }
  }

  const handleLoadScenario = (scenario: SavedScenario) => {
    if (sessionStatus === 'active') return
    if (scenarioIsDirty) {
      setScenarioConfirmation({
        title: 'Discard scenario changes',
        description: `Discard the current unsaved changes and load "${scenario.title}"?`,
        confirmLabel: 'Discard',
        onConfirm: () => applyLoadedScenario(scenario),
      })
      return
    }
    applyLoadedScenario(scenario)
  }

  const handleUnloadScenario = () => {
    if (sessionStatus === 'active') return
    if (scenarioIsDirty) {
      setScenarioConfirmation({
        title: 'Discard scenario changes',
        description: 'Discard the current unsaved changes and unload this scenario?',
        confirmLabel: 'Discard',
        onConfirm: clearScenarioAuthoringState,
      })
      return
    }
    clearScenarioAuthoringState()
  }

  const handleScenarioRenamed = (scenario: SavedScenario) => {
    if (loadedScenarioId !== scenario.id) return
    setScenarioTitle(scenario.title)
    setScenarioBaseline((current) => current ? { ...current, title: scenario.title } : current)
  }

  const handleNewScenario = () => {
    if (sessionStatus === 'active' || scenarioAction !== 'idle') return
    if (scenarioIsDirty) {
      setScenarioConfirmation({
        title: 'Start a new scenario',
        description: 'Discard the current unsaved changes and start a new scenario draft?',
        confirmLabel: 'Start New',
        onConfirm: startScenarioDraft,
      })
      return
    }
    startScenarioDraft()
  }

  const handleDeleteDraft = () => {
    if (!scenarioDraftActive || sessionStatus === 'active' || scenarioAction !== 'idle') return
    setScenarioConfirmation({
      title: 'Delete scenario draft',
      description: `Delete "${scenarioTitle.trim() || 'Untitled Scenario'}"? The draft has not been saved.`,
      confirmLabel: 'Delete',
      onConfirm: clearScenarioAuthoringState,
    })
  }

  const handleScenarioFolderDeleted = (folderId: string) => {
    if (
      loadedScenarioFolderId === folderId ||
      (scenarioDraftActive && selectedScenarioFolderId === folderId)
    ) {
      clearScenarioAuthoringState()
    }
  }

  const handleScenarioFolderExpansionChange = (folderId: string, expanded: boolean) => {
    setExpandedScenarioFolderIds((current) => {
      const next = new Set(current)
      if (expanded) {
        next.add(folderId)
      } else {
        next.delete(folderId)
      }
      return next
    })
  }

  const persistScenario = async (personalDestinationFolderId?: string | null) => {
    if (saveScenarioDisabled || scenarioAction !== 'idle') return
    setScenarioAction('saving')
    setScenarioError('')
    const savingCopy = personalDestinationFolderId !== undefined
    const destinationFolderId = savingCopy
      ? personalDestinationFolderId
      : selectedScenarioFolderId || null
    const updatingExisting = Boolean(loadedScenarioId && !savingCopy)
    const autoCreatingFolder = !updatingExisting && destinationFolderId === null
    try {
      const endpoint = updatingExisting
        ? `/api/scenarios/${loadedScenarioId}`
        : '/api/scenarios'
      const response = await fetch(endpoint, {
        method: updatingExisting ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          updatingExisting
            ? { title: scenarioTitle, snapshot: currentScenarioSnapshot }
            : {
                ...(destinationFolderId
                  ? { folderId: destinationFolderId }
                  : { autoCreateFolder: true }),
                title: scenarioTitle,
                snapshot: currentScenarioSnapshot,
              },
        ),
      })
      const data = await response.json() as unknown
      if (!response.ok) throw new Error(getResponseError(data, 'Unable to save scenario'))
      if (
        typeof data !== 'object' ||
        data === null ||
        !('scenario' in data)
      ) {
        throw new Error('Scenario save returned an invalid response')
      }
      const scenario = data.scenario as SavedScenario
      setScenarioTitle(scenario.title)
      setLoadedScenarioId(scenario.id)
      setLoadedScenarioFolderId(scenario.folder_id)
      setLoadedScenarioLibraryKind(scenario.library_kind)
      setLoadedScenarioCanEdit(scenario.can_edit)
      setSelectedScenarioFolderId(scenario.folder_id)
      setScenarioDraftActive(false)
      if (autoCreatingFolder) {
        handleScenarioFolderExpansionChange(scenario.folder_id, true)
      }
      setScenarioBaseline({ title: scenario.title, snapshot: scenario.snapshot })
      setScenarioRefreshVersion((version) => version + 1)
    } catch (caught) {
      setScenarioError(caught instanceof Error ? caught.message : 'Unable to save scenario')
    } finally {
      setScenarioAction('idle')
    }
  }

  const handleSaveScenario = (personalDestinationFolderId?: string | null) => {
    if (
      personalDestinationFolderId === undefined &&
      loadedScenarioLibraryKind === 'template' &&
      loadedScenarioCanEdit
    ) {
      setScenarioConfirmation({
        title: 'Update shared Template',
        description: `Save these changes to "${scenarioTitle.trim() || 'Untitled Scenario'}" for every Account?`,
        confirmLabel: 'Update Template',
        onConfirm: () => void persistScenario(),
      })
      return
    }
    void persistScenario(personalDestinationFolderId)
  }

  const deleteScenario = async (scenario: SavedScenarioSummary) => {
    if (scenarioAction !== 'idle' || sessionStatus === 'active') return
    setScenarioAction('deleting')
    setScenarioError('')
    try {
      const response = await fetch(`/api/scenarios/${scenario.id}`, { method: 'DELETE' })
      if (!response.ok) {
        const data = await response.json() as unknown
        throw new Error(getResponseError(data, 'Unable to delete scenario'))
      }
      if (loadedScenarioId === scenario.id) {
        setLoadedScenarioId(null)
        setLoadedScenarioFolderId(null)
        setLoadedScenarioLibraryKind(null)
        setLoadedScenarioCanEdit(false)
        setSelectedScenarioFolderId(scenario.folder_id)
        setScenarioBaseline(null)
        setScenarioDraftActive(true)
        handleScenarioFolderExpansionChange(scenario.folder_id, true)
      }
      setScenarioRefreshVersion((version) => version + 1)
    } catch (caught) {
      setScenarioError(caught instanceof Error ? caught.message : 'Unable to delete scenario')
    } finally {
      setScenarioAction('idle')
    }
  }

  const handleDeleteScenario = (scenario: SavedScenarioSummary) => {
    if (scenarioAction !== 'idle' || sessionStatus === 'active') return
    const deletingLoadedScenario = loadedScenarioId === scenario.id
    setScenarioConfirmation({
      title: 'Delete scenario',
      description: deletingLoadedScenario
        ? `Delete "${scenario.title}"? The current editor values will be kept as a draft.`
        : `Delete "${scenario.title}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      onConfirm: () => void deleteScenario(scenario),
    })
  }

  /**
   * The letter buttons were local highlight and nothing else, so the one skill
   * the checklist is there to assess -- whether the trainee actually asked --
   * left no trace in the record. Every press is logged now, including the one
   * that clears a letter: an instructor who marked the wrong letter is telling
   * the record something too, and silently dropping half the presses would
   * leave a report that disagrees with the panel the evaluator was looking at.
   */
  const togglePatientSelection = (checklist: PatientInfoChecklist, letter: string) => {
    const asked = !patientSelections[checklist].has(letter)
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
    if (instructorRecordingUnavailable) return
    void recordInstructorAction(
      checklist === 'sample' ? 'sample_ask' : 'opqrst_ask',
      letter,
      { asked },
    )
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

  const handlePatientSnsMeasurementStart = (
    group: PatientSnsMeasurementGroupId,
    durationSeconds: PatientSnsMeasurementDurationSeconds,
  ) => {
    startPatientSnsMeasurement(group, durationSeconds, patientPhysicalFindings)
  }

  const handlePatientSnsMeasurementTap = (group: PatientSnsMeasurementGroupId) => {
    togglePatientSnsMeasurementResult(group, patientPhysicalFindings)
  }

  const displayedRoute = dispatchArmed ? dispatchRouteConfirmed : dispatchRouteDraft
  const displayedIncidentAddress = dispatchArmed
    ? callerInfoConfirmedAddress
    : scenarioCallerInfo.address
  const displayedRouteMatchesIncident =
    normalizeDispatchAddress(displayedRoute.destinationAddress) ===
    normalizeDispatchAddress(displayedIncidentAddress)
  const routeStatus = routeChangesNotSent
    ? { label: 'Route changes not sent', tone: 'text-pending-amber', retry: false }
    : routePublishStatus === 'pending'
      ? { label: 'Route update pending', tone: 'text-pending-amber', retry: false }
      : routePublishStatus === 'failed'
        ? { label: 'Route unavailable', tone: 'text-alarm-red', retry: true }
        : displayedIncidentAddress.trim() === ''
          ? { label: 'No route configured', tone: 'text-neutral-500', retry: false }
          : !displayedRouteMatchesIncident
            ? { label: 'Route calculating', tone: 'text-pending-amber', retry: false }
            : displayedRoute.status === 'failed'
              ? { label: 'Route unavailable', tone: 'text-alarm-red', retry: true }
              : displayedRoute.status === 'ready'
                ? { label: 'Route ready', tone: 'text-ecg-green', retry: false }
                : { label: 'Route calculating', tone: 'text-pending-amber', retry: false }

  const confirmationRoute =
    dispatchConfirmation === 'send' ? dispatchRouteSaved : dispatchRouteConfirmed
  const confirmationAddress =
    dispatchConfirmation === 'send' ? callerInfoSavedAddress : callerInfoConfirmedAddress
  const dispatchRouteWarning = getRouteWarning(confirmationRoute, confirmationAddress)
  const dispatchRouteNowReady = dispatchRouteWarning === null

  return (
    <InstructorLayout>
      {!session ? <RoomLauncher initialExistingRoom={initialExistingRoom} /> : null}
      {session && (
        <div className="grid gap-4 lg:grid-cols-2" data-testid="session-overview-grid">
          <section
            aria-label="Room controls"
            className={cn(
              'grid h-[480px] min-w-0 border border-cyan-bp/60 bg-cyan-bp/10',
              sessionStatus === 'ended'
                ? 'grid-cols-1'
                : 'grid-cols-[minmax(0,13fr)_minmax(204px,7fr)]',
            )}
          >
            <div
              data-testid="room-controls-primary"
              className="flex min-h-0 min-w-0 flex-col p-4"
            >
            <div className="shrink-0">
              <p className="font-mono text-xs font-bold uppercase tracking-wider text-cyan-bp">
                Room code
              </p>
              <RoomCodeCopy code={session.code} className="mt-2" />
              <p className="mt-2 text-sm text-neutral-300">
                Status: <span className="font-bold uppercase">{sessionStatus}</span>
                {' · '}Attempt{' '}
                <span className="font-bold">
                  {attemptVersion}
                  {activeAttemptLabel ? ` · ${activeAttemptLabel}` : ''}
                </span>
              </p>
            </div>
            <div className="mt-3 flex shrink-0 flex-wrap gap-2">
              {!canControlRoom && sessionStatus !== 'ended' ? (
                <button
                  type="button"
                  onClick={session.onTakeControl}
                  className="border border-cyan-bp bg-cyan-bp/15 px-3 py-2 font-mono text-[10px] font-black uppercase tracking-wider text-cyan-bp hover:bg-cyan-bp hover:text-black"
                >
                  Take control
                </button>
              ) : null}
              <button
                type="button"
                onClick={requestStart}
                title={
                  !dispatchArmed
                    ? 'Save and Send the call info before starting'
                    : countdownChangesNotSent
                      ? 'Save and Send the countdown changes before starting'
                    : routeChangesNotSent
                      ? 'Save and Send the route changes before starting'
                    : !defibrillatorModelReady
                      ? 'Save and Send the defibrillator model before starting'
                      : undefined
                }
                disabled={
                  sessionStatus === 'active' ||
                  sessionStatus === 'ended' ||
                  !canControlRoom ||
                  !dispatchArmed ||
                  dispatchActionBusy ||
                  countdownChangesNotSent ||
                  routeChangesNotSent ||
                  !defibrillatorModelReady
                }
                className="border border-ecg-green bg-ecg-green px-3 py-2 font-mono text-[10px] font-black uppercase tracking-wider text-black hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Start / Dispatch
              </button>
              <button
                type="button"
                onClick={startNewAttempt}
                disabled={sessionStatus !== 'active' || !canControlRoom}
                className="border border-pending-amber bg-pending-amber/15 px-3 py-2 font-mono text-[10px] font-black uppercase tracking-wider text-pending-amber hover:bg-pending-amber hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
              >
                New Attempt
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={endSession}
                  disabled={sessionStatus === 'ended' || !canControlRoom}
                  className="border border-alarm-red bg-alarm-red/15 px-3 py-2 font-mono text-[10px] font-black uppercase tracking-wider text-alarm-red hover:bg-alarm-red hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
                >
                  End Room
                </button>
                <span
                  className={cn(
                    'font-mono text-[10px] font-black uppercase tracking-wider',
                    routeStatus.tone,
                  )}
                  data-testid="dispatch-route-status"
                >
                  {routeStatus.label}
                </span>
                {routeStatus.retry ? (
                  <button
                    type="button"
                    onClick={() => {
                      setRoutePublishStatus('idle')
                      setRoutePublishError('')
                      retryRoute()
                    }}
                    className="border border-alarm-red px-2 py-1 font-mono text-[10px] font-black uppercase tracking-wider text-alarm-red hover:bg-alarm-red/15"
                  >
                    Retry route
                  </button>
                ) : null}
              </div>
            </div>
            {sessionError || routePublishError ? (
              <p className="mt-2 shrink-0 text-sm font-semibold text-pending-amber">
                {sessionError || routePublishError}
              </p>
            ) : null}
            {sessionStatus === 'ended' && (
              // A room can end without this tab's End Room click: expiry, or a
              // click from another tab. End Room greys out and the console sat
              // here with no way out, which reads as "it didn't end."
              <div
                data-testid="room-ended-notice"
                className="flex flex-wrap items-center justify-between gap-3 border border-alarm-red/50 bg-alarm-red/10 px-3 py-2"
              >
                <p className="font-mono text-xs uppercase tracking-wider text-alarm-red">
                  Room ended — no longer accepting devices
                </p>
                <button
                  type="button"
                  onClick={() => router.replace('/instructor')}
                  className="border border-neutral-700 px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider text-neutral-300 hover:border-cyan-bp hover:text-cyan-bp"
                >
                  Create a new room
                </button>
              </div>
            )}
            <div className="mt-3 flex min-h-0 flex-1 flex-col border border-neutral-800 bg-black/40 p-3">
              <h2 className="font-mono text-xs font-black uppercase tracking-wider text-neutral-400">
                Devices
              </h2>
              <div className="mt-2 grid min-h-0 flex-1 content-start gap-2 overflow-y-auto pr-1">
                {participants.length === 0 ? (
                  <p className="text-sm text-neutral-500">No devices joined yet.</p>
                ) : (
                  participants.map((participant) => {
                    const connected = isConnected(participant.last_seen_at)
                    const selected = spectatedParticipantId === participant.id
                    return (
                      <div
                        key={participant.id}
                        data-testid={`student-row-${participant.id}`}
                        aria-current={selected ? 'true' : undefined}
                        className={cn(
                          'grid gap-1 border px-3 py-2 text-sm',
                          selected
                            ? 'border-cyan-bp bg-cyan-bp/10'
                            : 'border-neutral-800',
                        )}
                      >
                        <div className="flex min-w-0 items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-2 font-bold text-white">
                            <span
                              role="status"
                              aria-label={connected ? 'Connected' : 'Offline'}
                              className={cn(
                                'inline-block h-2 w-2 shrink-0 rounded-full',
                                connected ? 'bg-ecg-green' : 'bg-neutral-600',
                              )}
                            />
                            <span className="truncate">{participant.nickname}</span>
                          </span>
                          <button
                            ref={(node) => {
                              if (node) spectatorButtonRefs.current.set(participant.id, node)
                              else spectatorButtonRefs.current.delete(participant.id)
                            }}
                            type="button"
                            onClick={() => {
                              if (selected) {
                                stopSpectating(participant.id)
                              } else {
                                setSpectatedParticipantId(participant.id)
                              }
                            }}
                            className={cn(
                              'shrink-0 border px-3 py-1 font-mono text-[10px] font-black uppercase tracking-wider',
                              selected
                                ? 'border-pending-amber bg-pending-amber/15 text-pending-amber hover:bg-pending-amber hover:text-black'
                                : 'border-cyan-bp text-cyan-bp hover:bg-cyan-bp hover:text-black',
                            )}
                          >
                            {selected ? 'Stop Spectating' : 'Spectate'}
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
            </div>
            {sessionStatus !== 'ended' ? (
              <aside
                aria-label="Room QR code controls"
                data-testid="room-qr-rail"
                className="grid min-h-0 min-w-[204px] place-items-center border-l border-neutral-800"
              >
                <RoomQrCode key={session.code} code={session.code} />
              </aside>
            ) : null}
          </section>
          <EmbeddedSpectatorPanel
            code={session.code}
            mode={spectatorPresentationMode}
            onModeChange={setSpectatorPresentationMode}
            onStopSpectating={() => {
              if (spectatedParticipantId) stopSpectating(spectatedParticipantId)
            }}
            participant={
              participants.find((participant) => participant.id === spectatedParticipantId) ?? null
            }
          />
        </div>
      )}
      <div className="flex items-center gap-3" data-testid="admin-save-send-actions">
        <SaveButton />
        <SendButton
          beforeSend={beforeSend}
          onSent={session ? sendSessionState : undefined}
          forceDisabled={Boolean(session && !canControlRoom)}
        />
      </div>
      <div
        className="grid grid-cols-2 border border-neutral-800 bg-neutral-950 p-1 sm:grid-cols-3 lg:grid-cols-5"
        data-testid="admin-tab-list"
      >
        <button
          type="button"
          onClick={() => setTab('scenarios')}
          aria-pressed={tab === 'scenarios'}
          className={cn(
            'min-h-11 px-3 py-2 text-xs font-mono font-bold uppercase leading-tight tracking-wider sm:text-sm',
            tab === 'scenarios'
              ? 'bg-cyan-bp text-black'
              : 'text-neutral-400 hover:bg-neutral-900',
          )}
        >
          Scenarios
        </button>
        <button
          type="button"
          onClick={() => setTab('monitor')}
          aria-pressed={tab === 'monitor'}
          className={cn(
            'min-h-11 px-3 py-2 text-xs font-mono font-bold uppercase leading-tight tracking-wider sm:text-sm',
            tab === 'monitor'
              ? 'bg-cyan-bp text-black'
              : 'text-neutral-400 hover:bg-neutral-900',
          )}
        >
          Monitor &amp; Patient SNS
        </button>
        <button
          type="button"
          onClick={() => setTab('physical')}
          aria-pressed={tab === 'physical'}
          className={cn(
            'min-h-11 px-3 py-2 text-xs font-mono font-bold uppercase leading-tight tracking-wider sm:text-sm',
            tab === 'physical'
              ? 'bg-cyan-bp text-black'
              : 'text-neutral-400 hover:bg-neutral-900',
          )}
        >
          Patient Physical
        </button>
        <button
          type="button"
          onClick={() => setTab('defibrillators')}
          aria-pressed={tab === 'defibrillators'}
          className={cn(
            'min-h-11 px-3 py-2 text-xs font-mono font-bold uppercase leading-tight tracking-wider sm:text-sm',
            tab === 'defibrillators'
              ? 'bg-cyan-bp text-black'
              : 'text-neutral-400 hover:bg-neutral-900',
          )}
        >
          Defibrillators
        </button>
        <button
          type="button"
          onClick={() => setTab('report')}
          aria-pressed={tab === 'report'}
          className={cn(
            'min-h-11 px-3 py-2 text-xs font-mono font-bold uppercase leading-tight tracking-wider sm:text-sm',
            tab === 'report'
              ? 'bg-cyan-bp text-black'
              : 'text-neutral-400 hover:bg-neutral-900',
          )}
        >
          Report
        </button>
      </div>
      {tab === 'monitor' ? (
        <div
          className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,11fr)_minmax(0,4fr)_minmax(0,9fr)] lg:items-stretch lg:gap-3 xl:[@media(min-height:800px)]:grid-cols-[minmax(0,8fr)_minmax(0,3fr)_minmax(0,5fr)] xl:[@media(min-height:800px)]:gap-4"
          data-testid="monitor-patient-sns-layout"
        >
          <VitalsControls
            autoSortText={universalAutoSortText}
            patientSns={{
              selected: patientPhysicalSelections,
              findings: patientPhysicalFindings,
              activeIconGroup: patientPhysicalActiveIconGroup,
              onIconGroupClick: handlePatientPhysicalIconGroupClick,
              measurements: patientSnsMeasurements,
              onMeasurementStart: handlePatientSnsMeasurementStart,
              onMeasurementTap: handlePatientSnsMeasurementTap,
              onMeasurementCancel: cancelPatientSnsMeasurement,
            }}
            onTimedVitalsClick={handleTimedVitalsPatientPhysicalUpdate}
            sessionEtco2Calibrated={
              session
                ? anyoneCalibratedEtco2(studentEvents, attemptVersion, monitorResetVersion)
                : undefined
            }
            attemptNotes={
              <AttemptNotesPanel
                key={`${attemptVersion}:${attemptNotesUnavailable ?? 'ready'}`}
                generalNotes={activeGeneralNotes}
                generalNotesDraft={generalNotesDraft}
                onGeneralNotesDraftChange={(value) => {
                  setGeneralNotesDraftState({ attemptVersion, value })
                }}
                onSaveGeneralNotes={saveGeneralNotes}
                onSendReportNote={sendReportNote}
                disabledReason={attemptNotesUnavailable}
              />
            }
          />
          <TreatmentRecorder
            medications={ALL_MEDICATIONS}
            traumaTreatments={TRAUMA_TREATMENTS}
            participants={participants}
            participantId={creditedParticipantId}
            onParticipantChange={setCreditedChoice}
            onRecord={(treatment, category) => void recordTreatment(treatment, category)}
            counts={treatmentCounts}
            unavailableReason={instructorRecordingUnavailable}
            error={instructorEventError}
          />
          <PatientInformationPanel
            selected={patientSelections}
            values={patientText}
            onTextChange={handlePatientTextChange}
            onToggle={togglePatientSelection}
          />
        </div>
      ) : tab === 'physical' ? (
        <PatientPhysicalPanel
          selected={patientPhysicalSelections}
          findings={patientPhysicalFindings}
          activeIconGroup={patientPhysicalActiveIconGroup}
          onToggle={togglePatientPhysicalSelection}
          onIconGroupClick={handlePatientPhysicalIconGroupClick}
        />
      ) : tab === 'defibrillators' ? (
        <DefibrillatorPanel disabled={sessionStatus === 'active'} />
      ) : tab === 'report' ? (
        <EvaluationReportPanel
          events={report.events}
          stateHistory={report.stateHistory}
          attempts={report.attempts}
          participants={report.participants}
          attemptVersion={report.attemptVersion}
          onAttemptVersionChange={(version) => void viewReportAttempt(version)}
          attemptLabels={report.attemptLabels}
          generalNotes={
            report.attemptGeneralNotes.find(
              (entry) => entry.attempt_version === report.attemptVersion,
            )?.general_notes ?? ''
          }
          instructorNotes={report.instructorNotes}
          onRenameAttempt={session ? (version, label) => void renameAttempt(version, label) : undefined}
          truncated={report.truncated}
        />
      ) : (
        <div className="grid gap-4">
          <ScenarioLibraryPanel
            selectedFolderId={selectedScenarioFolderId}
            expandedFolderIds={expandedScenarioFolderIds}
            loadedScenarioId={loadedScenarioId}
            scenarioDraftActive={scenarioDraftActive}
            scenarioDraftTitle={scenarioTitle}
            onScenarioTitleChange={setScenarioTitle}
            scenarioIsDirty={scenarioIsDirty}
            scenarioAction={scenarioAction}
            scenarioError={scenarioError}
            refreshVersion={scenarioRefreshVersion}
            onSelectedFolderChange={setSelectedScenarioFolderId}
            onExpandedFolderChange={handleScenarioFolderExpansionChange}
            onLoadScenario={handleLoadScenario}
            onScenarioRenamed={handleScenarioRenamed}
            onUnloadScenario={handleUnloadScenario}
            onFolderDeleted={handleScenarioFolderDeleted}
            onLoadedScenarioFolderChange={setLoadedScenarioFolderId}
            onNewScenario={handleNewScenario}
            onSaveScenario={handleSaveScenario}
            onDeleteScenario={handleDeleteScenario}
            onDeleteDraft={handleDeleteDraft}
            scenarioSelectionDisabled={sessionStatus === 'active'}
          />
          <CallerInfoForm
            key={scenarioEditorVersion}
            autoSortText={universalAutoSortText}
            onAutoSortChange={handleUniversalAutoSortChange}
          />
        </div>
      )}
      <ConfirmationDialog
        open={scenarioConfirmation !== null}
        title={scenarioConfirmation?.title ?? ''}
        description={scenarioConfirmation?.description ?? ''}
        confirmLabel={scenarioConfirmation?.confirmLabel ?? 'Confirm'}
        onCancel={() => setScenarioConfirmation(null)}
        onConfirm={() => {
          const confirmation = scenarioConfirmation
          setScenarioConfirmation(null)
          confirmation?.onConfirm()
        }}
      />
      <ConfirmationDialog
        open={dispatchConfirmation !== null}
        title={dispatchRouteNowReady ? 'Route calculation is complete' : 'Route not ready'}
        description={
          dispatchRouteNowReady
            ? 'The route is ready. Review the action below before continuing.'
            : dispatchRouteWarning ?? 'The route is not ready.'
        }
        confirmLabel={
          dispatchRouteNowReady
            ? dispatchConfirmation === 'send'
              ? 'Send'
              : 'Start / Dispatch'
            : dispatchConfirmation === 'send'
              ? 'Send Anyway'
              : 'Start Anyway'
        }
        confirmDisabled={dispatchActionBusy}
        onCancel={() => setDispatchConfirmation(null)}
        onConfirm={() => {
          const confirmation = dispatchConfirmation
          setDispatchConfirmation(null)
          if (confirmation === 'send') {
            void runConfirmedSend()
          } else if (confirmation === 'start') {
            void runStart()
          }
        }}
      />
    </InstructorLayout>
  )
}
