'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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
import {
  createEmptyScenarioSnapshot,
  createScenarioSnapshot,
  hasMeaningfulScenarioContent,
  scenarioSnapshotsEqual,
} from '@/lib/scenarioSnapshot'
import { parseVitalsAutoSort, type TimedVitalsSlot } from '@/lib/vitalsAutoSort'
import { useMonitorStore } from '@/store/monitorStore'
import { usePatientSnsMeasurements } from '@/hooks/usePatientSnsMeasurements'
import { useStoreHydration } from '@/hooks/useStoreHydration'
import { cn } from '@/lib/utils'
import {
  hasDefibrillatorModelDirty,
  hasDefibrillatorModelPending,
} from '@/store/fieldState'
import type {
  PatientPhysicalIconGroupId,
  PatientSnsMeasurementDurationSeconds,
  PatientSnsMeasurementGroupId,
} from '@/types/patientPhysical'
import type { CprMode, NumericVitalField } from '@/types/vitals'
import type {
  ParticipantAttempt,
  SessionStateHistoryEntry,
  StudentEvent,
} from '@/types/session'
import type {
  SavedScenario,
  SavedScenarioSummary,
  ScenarioSnapshotV1,
} from '@/types/savedScenario'

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

type SessionStatusValue = 'waiting' | 'active' | 'ended' | 'error'

type PastReview = {
  attemptVersion: number
  participants: ReviewParticipant[]
  events: StudentEvent[]
  stateHistory: SessionStateHistoryEntry[]
  attempts: ParticipantAttempt[]
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

export default function AdminPage({ session }: SessionAdminProps = {}) {
  useStoreHydration()
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
  const [scenarioBaseline, setScenarioBaseline] = useState<ScenarioBaseline | null>(null)
  const [scenarioDraftActive, setScenarioDraftActive] = useState(false)
  const [scenarioRefreshVersion, setScenarioRefreshVersion] = useState(0)
  const [scenarioEditorVersion, setScenarioEditorVersion] = useState(0)
  const [scenarioAction, setScenarioAction] = useState<'idle' | 'saving' | 'deleting'>('idle')
  const [scenarioError, setScenarioError] = useState('')
  const [scenarioConfirmation, setScenarioConfirmation] =
    useState<ScenarioConfirmation | null>(null)
  const resetForNewAttempt = useMonitorStore((s) => s.resetForNewAttempt)
  const setDraftVitalValues = useMonitorStore((s) => s.setDraftVitalValues)
  const setCallerInfoDraft = useMonitorStore((s) => s.setCallerInfoDraft)
  const applyScenarioDraft = useMonitorStore((s) => s.applyScenarioDraft)
  const getSharedState = useMonitorStore((s) => s.getSharedState)
  const startDispatchClock = useMonitorStore((s) => s.startDispatchClock)
  const scenarioVitalsDraft = useMonitorStore((s) => s.draft)
  const scenarioVitalActive = useMonitorStore((s) => s.draftVitalActive)
  const scenarioLastRhythm = useMonitorStore((s) => s.lastRhythm)
  const scenarioCallerInfo = useMonitorStore((s) => s.callerInfoDraft)
  const scenarioDispatchMinutes = useMonitorStore((s) => s.dispatchMinutes)
  const scenarioDispatchSeconds = useMonitorStore((s) => s.dispatchSeconds)
  const scenarioDispatchOrigin = useMonitorStore((s) => s.dispatchRouteDraft.originAddress)
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
  const [reviewTruncated, setReviewTruncated] = useState(false)
  const [attemptVersion, setAttemptVersion] = useState(1)
  // A past attempt the evaluator has opened in the Report tab. The 2.5s poll
  // stays on the active attempt, because the roster depends on it -- looking
  // back is a deliberate, one-off read rather than something polled.
  const [pastReview, setPastReview] = useState<PastReview | null>(null)
  const [sessionError, setSessionError] = useState('')

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
      { headers: { 'x-session-host-token': session.hostToken } },
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
    // A thrown fetch (offline, a non-JSON 500 from the host) used to reject
    // this handler unhandled: no message, no navigation, the button did
    // nothing. Every failure now says so.
    let data: { session?: { status?: SessionStatusValue }; error?: string }
    try {
      const response = await fetch(`/api/session/${session.code}/end`, {
        method: 'POST',
        headers: { 'x-session-host-token': session.hostToken },
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
        { headers: { 'x-session-host-token': session.hostToken } },
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
        truncated: data.truncated === true,
      })
    },
    [attemptVersion, session],
  )

  const report = pastReview ?? {
    attemptVersion,
    participants,
    events: studentEvents,
    stateHistory,
    attempts,
    truncated: reviewTruncated,
  }

  const sendSessionState = useCallback(async () => {
    if (!session) return
    const response = await fetch(`/api/session/${session.code}/state`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-host-token': session.hostToken,
      },
      body: JSON.stringify({
        state: {
          ...getSharedState(),
          // The title is console state, not monitor state, so it joins here
          // rather than in the store's shared snapshot.
          scenarioTitleConfirmed: scenarioTitle.trim(),
        },
      }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error ?? 'Unable to send session state')
  }, [getSharedState, scenarioTitle, session])

  // CPR override and full instructor resets bypass Save → Send, so in a
  // session they must push shared state themselves — the Send button stays
  // disabled without pending changes and would otherwise strand these locally.
  const cprMode = useMonitorStore((s) => s.cprMode)
  const monitorResetVersion = useMonitorStore((s) => s.monitorResetVersion)
  const immediatePushRef = useRef<{ cprMode: CprMode; resetVersion: number } | null>(null)
  useEffect(() => {
    if (!session) return
    const prev = immediatePushRef.current
    immediatePushRef.current = { cprMode, resetVersion: monitorResetVersion }
    if (!prev) return
    if (prev.cprMode === cprMode && prev.resetVersion === monitorResetVersion) return
    void sendSessionState().catch((caught) => {
      setSessionError(
        caught instanceof Error ? caught.message : 'Unable to send session state',
      )
    })
  }, [cprMode, monitorResetVersion, sendSessionState, session])

  const currentScenarioSnapshot = createScenarioSnapshot({
    defibrillatorModel: defibrillatorModelDraft,
    autoSortText: universalAutoSortText,
    monitor: {
      draft: scenarioVitalsDraft,
      draftVitalActive: scenarioVitalActive,
      lastRhythm: scenarioLastRhythm,
    },
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
    setScenarioBaseline(null)
    setScenarioDraftActive(false)
    setScenarioError('')
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

  const handleSaveScenario = async () => {
    if (saveScenarioDisabled || scenarioAction !== 'idle') return
    setScenarioAction('saving')
    setScenarioError('')
    const autoCreatingFolder = !loadedScenarioId && !selectedScenarioFolderId
    try {
      const endpoint = loadedScenarioId
        ? `/api/scenarios/${loadedScenarioId}`
        : '/api/scenarios'
      const response = await fetch(endpoint, {
        method: loadedScenarioId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          loadedScenarioId
            ? { title: scenarioTitle, snapshot: currentScenarioSnapshot }
            : {
                ...(selectedScenarioFolderId
                  ? { folderId: selectedScenarioFolderId }
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

  const handlePatientSnsMeasurementStart = (
    group: PatientSnsMeasurementGroupId,
    durationSeconds: PatientSnsMeasurementDurationSeconds,
  ) => {
    startPatientSnsMeasurement(group, durationSeconds, patientPhysicalFindings)
  }

  const handlePatientSnsMeasurementTap = (group: PatientSnsMeasurementGroupId) => {
    togglePatientSnsMeasurementResult(group, patientPhysicalFindings)
  }

  return (
    <InstructorLayout>
      {session && (
        <div className="grid gap-4 lg:grid-cols-2" data-testid="session-overview-grid">
          <section
            aria-label="Room controls"
            className="flex h-[480px] min-w-0 flex-col border border-cyan-bp/60 bg-cyan-bp/10 p-4"
          >
            <div className="shrink-0">
              <p className="font-mono text-xs font-bold uppercase tracking-wider text-cyan-bp">
                Room code
              </p>
              <RoomCodeCopy code={session.code} className="mt-2" />
              <p className="mt-2 text-sm text-neutral-300">
                Status: <span className="font-bold uppercase">{sessionStatus}</span>
                {' · '}Attempt <span className="font-bold">{attemptVersion}</span>
              </p>
            </div>
            <div className="mt-3 flex shrink-0 flex-wrap gap-2">
              <button
                type="button"
                onClick={startSession}
                title={
                  !dispatchArmed
                    ? 'Save and Send the call info before starting'
                    : !defibrillatorModelReady
                      ? 'Save and Send the defibrillator model before starting'
                      : undefined
                }
                disabled={
                  sessionStatus === 'active' ||
                  sessionStatus === 'ended' ||
                  !dispatchArmed ||
                  !defibrillatorModelReady
                }
                className="border border-ecg-green bg-ecg-green px-3 py-2 font-mono text-[10px] font-black uppercase tracking-wider text-black hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Start / Dispatch
              </button>
              <button
                type="button"
                onClick={startNewAttempt}
                disabled={sessionStatus !== 'active'}
                className="border border-pending-amber bg-pending-amber/15 px-3 py-2 font-mono text-[10px] font-black uppercase tracking-wider text-pending-amber hover:bg-pending-amber hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
              >
                New Attempt
              </button>
              <button
                type="button"
                onClick={endSession}
                disabled={sessionStatus === 'ended'}
                className="border border-alarm-red bg-alarm-red/15 px-3 py-2 font-mono text-[10px] font-black uppercase tracking-wider text-alarm-red hover:bg-alarm-red hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
              >
                End Room
              </button>
            </div>
            {sessionError ? (
              <p className="mt-2 shrink-0 text-sm font-semibold text-pending-amber">
                {sessionError}
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
                  Room ended — no longer accepting trainees
                </p>
                <button
                  type="button"
                  onClick={() => router.replace('/')}
                  className="border border-neutral-700 px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider text-neutral-300 hover:border-cyan-bp hover:text-cyan-bp"
                >
                  Create a new room
                </button>
              </div>
            )}
            <div className="mt-3 flex min-h-0 flex-1 flex-col border border-neutral-800 bg-black/40 p-3">
              <h2 className="font-mono text-xs font-black uppercase tracking-wider text-neutral-400">
                Students
              </h2>
              <div className="mt-2 grid min-h-0 flex-1 content-start gap-2 overflow-y-auto pr-1">
                {participants.length === 0 ? (
                  <p className="text-sm text-neutral-500">No students joined yet.</p>
                ) : (
                  participants.map((participant) => {
                    const connected = isConnected(participant.last_seen_at)
                    const selected = spectatedParticipantId === participant.id
                    const progress = participantProgress(
                      studentEvents,
                      participant.id,
                      attemptVersion,
                    )
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
          </section>
          <EmbeddedSpectatorPanel
            code={session.code}
            hostToken={session.hostToken}
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
        <SendButton onSent={session ? sendSessionState : undefined} />
      </div>
      <div
        className="grid grid-cols-5 border border-neutral-800 bg-neutral-950 p-1"
        data-testid="admin-tab-list"
      >
        <button
          type="button"
          onClick={() => setTab('scenarios')}
          aria-pressed={tab === 'scenarios'}
          className={cn(
            'px-4 py-2 text-sm font-mono font-bold uppercase tracking-wider',
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
            'px-4 py-2 text-sm font-mono font-bold uppercase tracking-wider',
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
            'px-4 py-2 text-sm font-mono font-bold uppercase tracking-wider',
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
            'px-4 py-2 text-sm font-mono font-bold uppercase tracking-wider',
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
            'px-4 py-2 text-sm font-mono font-bold uppercase tracking-wider',
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
          className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,11fr)_minmax(0,9fr)] lg:items-stretch lg:gap-3 xl:[@media(min-height:800px)]:grid-cols-[minmax(0,8fr)_minmax(0,5fr)] xl:[@media(min-height:800px)]:gap-4"
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
              session ? anyoneCalibratedEtco2(studentEvents, attemptVersion) : undefined
            }
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
            scenarioIsDirty={scenarioIsDirty}
            scenarioAction={scenarioAction}
            scenarioError={scenarioError}
            refreshVersion={scenarioRefreshVersion}
            onSelectedFolderChange={setSelectedScenarioFolderId}
            onExpandedFolderChange={handleScenarioFolderExpansionChange}
            onLoadScenario={handleLoadScenario}
            onUnloadScenario={handleUnloadScenario}
            onFolderDeleted={handleScenarioFolderDeleted}
            onLoadedScenarioFolderChange={setLoadedScenarioFolderId}
            onNewScenario={handleNewScenario}
            onSaveScenario={() => void handleSaveScenario()}
            onDeleteScenario={handleDeleteScenario}
            onDeleteDraft={handleDeleteDraft}
            scenarioSelectionDisabled={sessionStatus === 'active'}
          />
          <CallerInfoForm
            key={scenarioEditorVersion}
            autoSortText={universalAutoSortText}
            onAutoSortChange={handleUniversalAutoSortChange}
            scenarioTitle={scenarioTitle}
            onScenarioTitleChange={setScenarioTitle}
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
    </InstructorLayout>
  )
}
