'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'

import { ConfirmationDialog } from '@/components/instructor/ConfirmationDialog'
import { useCountdown } from '@/hooks/useCountdown'
import { cn } from '@/lib/utils'
import { useMonitorStore } from '@/store/monitorStore'
import type {
  SavedScenario,
  SavedScenarioListResponse,
  SavedScenarioSummary,
  ScenarioFolder,
  ScenarioFolderListResponse,
} from '@/types/savedScenario'

type ScenarioLibraryPanelProps = {
  selectedFolderId: string
  expandedFolderIds: ReadonlySet<string>
  loadedScenarioId: string | null
  scenarioDraftActive: boolean
  scenarioDraftTitle: string
  onScenarioTitleChange: (value: string) => void
  scenarioIsDirty: boolean
  scenarioAction: 'idle' | 'saving' | 'deleting'
  scenarioError: string
  refreshVersion: number
  onSelectedFolderChange: (folderId: string) => void
  onExpandedFolderChange: (folderId: string, expanded: boolean) => void
  onLoadScenario: (scenario: SavedScenario) => void
  onScenarioRenamed: (scenario: SavedScenario) => void
  onUnloadScenario: () => void
  onFolderDeleted: (folderId: string) => void
  onLoadedScenarioFolderChange: (folderId: string) => void
  onNewScenario: () => void
  onSaveScenario: (personalDestinationFolderId?: string | null) => void
  onDeleteScenario: (scenario: SavedScenarioSummary) => void
  onDeleteDraft: () => void
  scenarioSelectionDisabled?: boolean
}

type MutationStatus = 'idle' | 'working'
type LibraryKind = ScenarioFolder['library_kind']
type DropTarget = { scenarioId: string; edge: 'before' | 'after' }
type FolderDropTarget = { folderId: string; edge: 'before' | 'after' }

function errorMessage(value: unknown, fallback: string): string {
  if (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof value.error === 'string'
  ) {
    return value.error
  }
  return fallback
}

async function parseErrorResponse(response: Response, fallback: string): Promise<string> {
  const data = await response.json().catch(() => null) as unknown
  return errorMessage(data, fallback)
}

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init)
  const data = await response.json() as unknown
  if (!response.ok) throw new Error(errorMessage(data, 'Scenario library request failed'))
  return data as T
}

async function requestEmpty(input: RequestInfo | URL, init?: RequestInit): Promise<void> {
  const response = await fetch(input, init)
  if (!response.ok) {
    throw new Error(await parseErrorResponse(response, 'Scenario library request failed'))
  }
}

function reorderScenarioList(
  scenarios: SavedScenarioListResponse['scenarios'],
  scenarioId: string,
  targetScenarioId: string,
  edge: DropTarget['edge'],
): SavedScenarioListResponse['scenarios'] {
  const source = scenarios.find((scenario) => scenario.id === scenarioId)
  if (!source || scenarioId === targetScenarioId) return scenarios

  const withoutSource = scenarios.filter((scenario) => scenario.id !== scenarioId)
  const targetIndex = withoutSource.findIndex((scenario) => scenario.id === targetScenarioId)
  if (targetIndex < 0) return scenarios
  const insertionIndex = edge === 'after' ? targetIndex + 1 : targetIndex
  const next = [...withoutSource]
  next.splice(insertionIndex, 0, source)
  return next.map((scenario, index) => ({ ...scenario, position: index + 1 }))
}

function reorderFolderList(
  folders: ScenarioFolder[],
  folderId: string,
  targetFolderId: string,
  edge: FolderDropTarget['edge'],
): ScenarioFolder[] {
  const source = folders.find((folder) => folder.id === folderId)
  if (!source || folderId === targetFolderId) return folders

  const withoutSource = folders.filter((folder) => folder.id !== folderId)
  const targetIndex = withoutSource.findIndex((folder) => folder.id === targetFolderId)
  if (targetIndex < 0) return folders
  const insertionIndex = edge === 'after' ? targetIndex + 1 : targetIndex
  const next = [...withoutSource]
  next.splice(insertionIndex, 0, source)
  return next.map((folder, index) => ({ ...folder, position: index + 1 }))
}

type ScenarioRowActionsProps = {
  title: string
  saveDisabled: boolean
  deleteDisabled: boolean
  saving: boolean
  deleting: boolean
  saveLabel?: string
  className?: string
  onSave: () => void
  onDelete: () => void
}

type EditableScenarioTitleProps = {
  title: string
  editable: boolean
  selected?: boolean
  activationDisabled?: boolean
  onActivate?: () => void
  onCommit: (value: string) => Promise<boolean>
}

const TITLE_SINGLE_CLICK_DELAY_MS = 250

function EditableScenarioTitle({
  title,
  editable,
  selected = false,
  activationDisabled = false,
  onActivate,
  onCommit,
}: EditableScenarioTitleProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(title)
  const [saving, setSaving] = useState(false)
  const cancelRef = useRef(false)
  const clickTimerRef = useRef<number | null>(null)
  const activateRef = useRef(onActivate)
  const activationDisabledRef = useRef(activationDisabled)

  const cancelPendingActivation = useCallback(() => {
    if (clickTimerRef.current === null) return
    window.clearTimeout(clickTimerRef.current)
    clickTimerRef.current = null
  }, [])

  useEffect(() => {
    activateRef.current = onActivate
  }, [onActivate])

  useEffect(() => cancelPendingActivation, [cancelPendingActivation])

  useEffect(() => {
    activationDisabledRef.current = activationDisabled
    if (activationDisabled) cancelPendingActivation()
  }, [activationDisabled, cancelPendingActivation])

  const startEditing = () => {
    if (!editable) return
    cancelPendingActivation()
    setValue(title)
    cancelRef.current = false
    setEditing(true)
  }

  const finishEditing = async () => {
    if (cancelRef.current || saving) return
    if (value === title) {
      setEditing(false)
      return
    }
    setSaving(true)
    const saved = await onCommit(value)
    setSaving(false)
    if (saved) setEditing(false)
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={value}
        disabled={saving}
        aria-label={`Rename ${title}`}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => void finishEditing()}
        onKeyDown={(event) => {
          event.stopPropagation()
          if (event.key === 'Escape') {
            cancelRef.current = true
            setEditing(false)
          } else if (event.key === 'Enter') {
            event.preventDefault()
            event.currentTarget.blur()
          }
        }}
        className="block min-h-8 w-full min-w-0 border border-cyan-bp bg-black px-2 py-1 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-bp disabled:opacity-60"
      />
    )
  }

  if (!editable && !onActivate) {
    return <span className="block select-none truncate">{title}</span>
  }

  const activateImmediately = () => {
    cancelPendingActivation()
    if (!activationDisabledRef.current) activateRef.current?.()
  }

  const scheduleActivation = () => {
    cancelPendingActivation()
    if (activationDisabledRef.current) return
    clickTimerRef.current = window.setTimeout(() => {
      clickTimerRef.current = null
      if (!activationDisabledRef.current) activateRef.current?.()
    }, TITLE_SINGLE_CLICK_DELAY_MS)
  }

  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={onActivate
        ? `${selected ? 'Unload' : 'Load'} ${title} from title`
        : `Rename ${title}`}
      aria-pressed={onActivate ? selected : undefined}
      aria-disabled={activationDisabled || undefined}
      title={onActivate ? 'Click to load or unload · Double-click to rename' : 'Double-click to rename'}
      onClick={(event) => {
        event.stopPropagation()
        if (onActivate) scheduleActivation()
      }}
      onDoubleClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        cancelPendingActivation()
        startEditing()
      }}
      onKeyDown={(event) => {
        event.stopPropagation()
        if (onActivate && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault()
          activateImmediately()
        } else if (event.key === 'F2' || (!onActivate && event.key === 'Enter')) {
          event.preventDefault()
          startEditing()
        }
      }}
      className="block select-none truncate outline-none focus:ring-2 focus:ring-cyan-bp"
    >
      {title}
    </span>
  )
}

function ScenarioRowActions({
  title,
  saveDisabled,
  deleteDisabled,
  saving,
  deleting,
  saveLabel = 'Save',
  className,
  onSave,
  onDelete,
}: ScenarioRowActionsProps) {
  return (
    <div
      className={cn('grid grid-cols-2 gap-1', className)}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        aria-label={`Save ${title}`}
        onClick={onSave}
        disabled={saveDisabled}
        className="min-h-8 border border-ecg-green bg-neutral-900 px-2 py-1 font-mono text-[10px] font-bold uppercase text-ecg-green hover:bg-ecg-green/10 focus:outline-none focus:ring-2 focus:ring-ecg-green disabled:cursor-not-allowed disabled:border-neutral-800 disabled:text-neutral-600 disabled:hover:bg-neutral-900"
      >
        {saving ? 'Saving' : saveLabel}
      </button>
      <button
        type="button"
        aria-label={`Delete ${title}`}
        onClick={onDelete}
        disabled={deleteDisabled}
        className="min-h-8 border border-alarm-red bg-neutral-900 px-2 py-1 font-mono text-[10px] font-bold uppercase text-alarm-red hover:bg-alarm-red/10 focus:outline-none focus:ring-2 focus:ring-alarm-red disabled:cursor-not-allowed disabled:border-neutral-800 disabled:text-neutral-600 disabled:hover:bg-neutral-900"
      >
        {deleting ? 'Deleting' : 'Delete'}
      </button>
    </div>
  )
}

type ScenarioDraftRowProps = {
  title: string
  dirty: boolean
  action: 'idle' | 'saving' | 'deleting'
  disabled: boolean
  onTitleChange: (value: string) => void
  onSave: () => void
  onDelete: () => void
}

function ScenarioDraftRow({
  title,
  dirty,
  action,
  disabled,
  onTitleChange,
  onSave,
  onDelete,
}: ScenarioDraftRowProps) {
  return (
    <div
      aria-label={`Scenario draft ${title}`}
      className={cn(
        'grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-1 border border-ecg-green bg-ecg-green/10 p-1',
        disabled && 'opacity-60',
      )}
    >
      <div className="flex min-h-8 min-w-0 items-center gap-2 border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-white">
        <div className="min-w-0 flex-1">
          <EditableScenarioTitle
            title={title}
            editable={!disabled}
            onCommit={async (value) => {
              onTitleChange(value)
              return true
            }}
          />
        </div>
        <span className="shrink-0 font-mono text-[9px] uppercase text-pending-amber">Draft</span>
      </div>
      <ScenarioRowActions
        title={title}
        saveDisabled={!dirty || action !== 'idle' || disabled}
        deleteDisabled={action !== 'idle' || disabled}
        saving={action === 'saving'}
        deleting={action === 'deleting'}
        onSave={onSave}
        onDelete={onDelete}
      />
    </div>
  )
}

export function ScenarioLibraryPanel({
  selectedFolderId,
  expandedFolderIds,
  loadedScenarioId,
  scenarioDraftActive,
  scenarioDraftTitle,
  onScenarioTitleChange,
  scenarioIsDirty,
  scenarioAction,
  scenarioError,
  refreshVersion,
  onSelectedFolderChange,
  onExpandedFolderChange,
  onLoadScenario,
  onScenarioRenamed,
  onUnloadScenario,
  onFolderDeleted,
  onLoadedScenarioFolderChange,
  onNewScenario,
  onSaveScenario,
  onDeleteScenario,
  onDeleteDraft,
  scenarioSelectionDisabled = false,
}: ScenarioLibraryPanelProps) {
  const [folders, setFolders] = useState<ScenarioFolder[]>([])
  const [role, setRole] = useState<'instructor' | 'administrator'>('instructor')
  const [scenariosByFolderId, setScenariosByFolderId] = useState<
    Record<string, SavedScenarioListResponse['scenarios']>
  >({})
  const [loadingFolderIds, setLoadingFolderIds] = useState<Set<string>>(() => new Set())
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderLibraryKind, setNewFolderLibraryKind] = useState<LibraryKind>('personal')
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [status, setStatus] = useState<MutationStatus>('idle')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)
  const [folderDropTarget, setFolderDropTarget] = useState<FolderDropTarget | null>(null)
  const [folderPendingDeletion, setFolderPendingDeletion] = useState<ScenarioFolder | null>(null)
  const dispatchMinutes = useMonitorStore((state) => state.dispatchMinutes)
  const dispatchSeconds = useMonitorStore((state) => state.dispatchSeconds)
  const setDispatchMinutes = useMonitorStore((state) => state.setDispatchMinutes)
  const setDispatchSeconds = useMonitorStore((state) => state.setDispatchSeconds)
  const dispatchCountdownLocked = useMonitorStore((state) => state.dispatch.countdownLocked)
  const dispatchCountdownEndsAt = useMonitorStore((state) => state.dispatch.countdownEndsAt)
  const liveDispatchCountdown = useCountdown(dispatchCountdownEndsAt)

  const loadFolders = useCallback(async () => {
    const data = await requestJson<ScenarioFolderListResponse>('/api/scenario-folders')
    setFolders(data.folders)
    setRole(data.role)
    const selectedExists = data.folders.some((folder) => folder.id === selectedFolderId)
    if (!selectedExists) {
      onSelectedFolderChange(
        data.folders.find((folder) => folder.library_kind === 'personal')?.id ?? '',
      )
    }
    return data.folders
  }, [onSelectedFolderChange, selectedFolderId])

  const loadScenarios = useCallback(async (folderId: string) => {
    setLoadingFolderIds((current) => new Set(current).add(folderId))
    try {
      const data = await requestJson<SavedScenarioListResponse>(
        `/api/scenarios?folderId=${encodeURIComponent(folderId)}`,
      )
      setScenariosByFolderId((current) => ({
        ...current,
        [folderId]: data.scenarios,
      }))
    } finally {
      setLoadingFolderIds((current) => {
        const next = new Set(current)
        next.delete(folderId)
        return next
      })
    }
  }, [])

  // Folder and scenario lists are external server resources. These effects only
  // synchronize them when expansion or an explicit refresh changes.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let cancelled = false
    loadFolders()
      .then(() => {
        if (!cancelled) setError('')
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : 'Unable to load scenarios')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [loadFolders, refreshVersion])

  useEffect(() => {
    let cancelled = false
    Promise.all([...expandedFolderIds].map((folderId) => loadScenarios(folderId)))
      .then(() => {
        if (!cancelled) setError('')
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : 'Unable to load scenarios')
        }
      })
    return () => {
      cancelled = true
    }
  }, [expandedFolderIds, loadScenarios, refreshVersion])
  /* eslint-enable react-hooks/set-state-in-effect */

  const runMutation = async (mutation: () => Promise<void>) => {
    setStatus('working')
    setError('')
    try {
      await mutation()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Scenario library update failed')
    } finally {
      setStatus('idle')
    }
  }

  const createFolder = async () => {
    await runMutation(async () => {
      const data = await requestJson<{ folder: ScenarioFolder }>('/api/scenario-folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFolderName,
          libraryKind: newFolderLibraryKind,
        }),
      })
      setNewFolderName('')
      setCreatingFolder(false)
      onSelectedFolderChange(data.folder.id)
      onExpandedFolderChange(data.folder.id, true)
      setScenariosByFolderId((current) => ({ ...current, [data.folder.id]: [] }))
      await loadFolders()
    })
  }

  const renameFolder = async (folderId: string) => {
    await runMutation(async () => {
      await requestJson(`/api/scenario-folders/${folderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameValue }),
      })
      setRenamingFolderId(null)
      setRenameValue('')
      await loadFolders()
    })
  }

  const deleteFolder = async (folder: ScenarioFolder) => {
    await runMutation(async () => {
      await requestEmpty(`/api/scenario-folders/${folder.id}`, { method: 'DELETE' })
      onFolderDeleted(folder.id)
      onExpandedFolderChange(folder.id, false)
      setScenariosByFolderId((current) => {
        const next = { ...current }
        delete next[folder.id]
        return next
      })
      const remainingFolders = await loadFolders()
      if (selectedFolderId === folder.id) {
        onSelectedFolderChange(
          remainingFolders.find((candidate) => candidate.library_kind === 'personal')?.id ?? '',
        )
      }
    })
  }

  const moveScenario = async (
    scenarioId: string,
    sourceFolderId: string,
    targetFolderId: string,
  ) => {
    if (!targetFolderId || targetFolderId === sourceFolderId) return
    await runMutation(async () => {
      const data = await requestJson<{ scenario: SavedScenario }>(`/api/scenarios/${scenarioId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: targetFolderId }),
      })
      setScenariosByFolderId((current) => {
        const next = {
          ...current,
          [sourceFolderId]: (current[sourceFolderId] ?? [])
            .filter((scenario) => scenario.id !== scenarioId)
            .map((scenario, index) => ({ ...scenario, position: index + 1 })),
        }
        if (expandedFolderIds.has(targetFolderId)) {
          next[targetFolderId] = [...(current[targetFolderId] ?? []), data.scenario]
            .toSorted((left, right) => left.position - right.position)
        }
        return next
      })
      if (loadedScenarioId === scenarioId) onLoadedScenarioFolderChange(targetFolderId)
      await loadFolders()
    })
  }

  const persistScenarioOrder = async (
    folderId: string,
    previous: SavedScenarioListResponse['scenarios'],
    next: SavedScenarioListResponse['scenarios'],
  ) => {
    setScenariosByFolderId((current) => ({ ...current, [folderId]: next }))
    setStatus('working')
    setError('')
    try {
      const data = await requestJson<SavedScenarioListResponse>(
        `/api/scenario-folders/${folderId}/order`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scenarioIds: next.map((scenario) => scenario.id) }),
        },
      )
      setScenariosByFolderId((current) => ({ ...current, [folderId]: data.scenarios }))
    } catch (caught) {
      setScenariosByFolderId((current) => ({ ...current, [folderId]: previous }))
      setError(caught instanceof Error ? caught.message : 'Unable to reorder scenarios')
    } finally {
      setStatus('idle')
    }
  }

  const moveScenarioBy = (folderId: string, scenarioId: string, delta: -1 | 1) => {
    if (status === 'working') return
    const scenarios = scenariosByFolderId[folderId] ?? []
    const currentIndex = scenarios.findIndex((scenario) => scenario.id === scenarioId)
    const target = scenarios[currentIndex + delta]
    if (currentIndex < 0 || !target) return
    const next = reorderScenarioList(
      scenarios,
      scenarioId,
      target.id,
      delta < 0 ? 'before' : 'after',
    )
    void persistScenarioOrder(folderId, scenarios, next)
  }

  const persistFolderOrder = async (
    libraryKind: LibraryKind,
    previous: ScenarioFolder[],
    next: ScenarioFolder[],
  ) => {
    const mergeScope = (scoped: ScenarioFolder[]) => {
      const otherScope = folders.filter((folder) => folder.library_kind !== libraryKind)
      return libraryKind === 'personal'
        ? [...scoped, ...otherScope]
        : [...otherScope, ...scoped]
    }
    setFolders(mergeScope(next))
    setStatus('working')
    setError('')
    try {
      const data = await requestJson<ScenarioFolderListResponse>(
        '/api/scenario-folders/order',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            libraryKind,
            folderIds: next.map((folder) => folder.id),
          }),
        },
      )
      setFolders(mergeScope(data.folders))
    } catch (caught) {
      setFolders(mergeScope(previous))
      setError(caught instanceof Error ? caught.message : 'Unable to reorder folders')
    } finally {
      setStatus('idle')
    }
  }

  const moveFolderBy = (folderId: string, delta: -1 | 1) => {
    if (controlsDisabled) return
    const folder = folders.find((candidate) => candidate.id === folderId)
    if (!folder?.can_edit) return
    const scopedFolders = folders.filter(
      (candidate) => candidate.library_kind === folder.library_kind,
    )
    const currentIndex = scopedFolders.findIndex((candidate) => candidate.id === folderId)
    const target = scopedFolders[currentIndex + delta]
    if (currentIndex < 0 || !target) return
    const next = reorderFolderList(
      scopedFolders,
      folderId,
      target.id,
      delta < 0 ? 'before' : 'after',
    )
    void persistFolderOrder(folder.library_kind, scopedFolders, next)
  }

  const startNewScenario = () => {
    const personalFolder = folders.find((folder) => folder.library_kind === 'personal')
    onSelectedFolderChange(personalFolder?.id ?? '')
    if (personalFolder) onExpandedFolderChange(personalFolder.id, true)
    onNewScenario()
  }

  const startNewTemplateScenario = () => {
    const selectedTemplate = folders.find(
      (folder) => folder.id === selectedFolderId && folder.library_kind === 'template',
    )
    const templateFolder = selectedTemplate ?? folders.find(
      (folder) => folder.library_kind === 'template',
    )
    if (!templateFolder) {
      setError('Create a Template folder before creating a Template scenario')
      return
    }
    onSelectedFolderChange(templateFolder.id)
    onExpandedFolderChange(templateFolder.id, true)
    onNewScenario()
  }

  const loadScenario = async (scenarioId: string) => {
    if (scenarioSelectionDisabled) return
    if (loadedScenarioId === scenarioId) {
      onUnloadScenario()
      return
    }
    await runMutation(async () => {
      const data = await requestJson<{ scenario: SavedScenario }>(`/api/scenarios/${scenarioId}`)
      onLoadScenario(data.scenario)
    })
  }

  const renameScenario = async (
    scenario: SavedScenarioSummary,
    title: string,
  ): Promise<boolean> => {
    if (!scenario.can_edit || controlsDisabled) return false
    setStatus('working')
    setError('')
    try {
      const data = await requestJson<{ scenario: SavedScenario }>(
        `/api/scenarios/${scenario.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title }),
        },
      )
      setScenariosByFolderId((current) => ({
        ...current,
        [scenario.folder_id]: (current[scenario.folder_id] ?? []).map((candidate) =>
          candidate.id === scenario.id
            ? { ...candidate, title: data.scenario.title, updated_at: data.scenario.updated_at }
            : candidate,
        ),
      }))
      onScenarioRenamed(data.scenario)
      return true
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to rename scenario')
      return false
    } finally {
      setStatus('idle')
    }
  }

  const activateScenario = (event: KeyboardEvent<HTMLDivElement>, scenarioId: string) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    if (scenarioSelectionDisabled) return
    void loadScenario(scenarioId)
  }

  const stopRowActivation = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation()
  }
  const stopRowKeyboardActivation = (event: KeyboardEvent<HTMLElement>) => {
    event.stopPropagation()
  }

  const handleFolderDrop = (event: DragEvent<HTMLElement>, folderId: string) => {
    event.preventDefault()
    if (scenarioSelectionDisabled || status === 'working' || scenarioAction !== 'idle') return
    const draggedFolderId = event.dataTransfer.getData('text/folder-id')
    if (draggedFolderId) {
      event.stopPropagation()
      const edge = folderDropTarget?.folderId === folderId
        ? folderDropTarget.edge
        : 'before'
      setFolderDropTarget(null)
      const targetFolder = folders.find((candidate) => candidate.id === folderId)
      const draggedFolder = folders.find((candidate) => candidate.id === draggedFolderId)
      if (
        !targetFolder?.can_edit ||
        !draggedFolder?.can_edit ||
        targetFolder.library_kind !== draggedFolder.library_kind
      ) return
      const scopedFolders = folders.filter(
        (candidate) => candidate.library_kind === targetFolder.library_kind,
      )
      const next = reorderFolderList(scopedFolders, draggedFolderId, folderId, edge)
      if (next !== scopedFolders) {
        void persistFolderOrder(targetFolder.library_kind, scopedFolders, next)
      }
      return
    }
    const scenarioId = event.dataTransfer.getData('text/scenario-id')
    const sourceFolderId = [...expandedFolderIds].find((expandedFolderId) =>
      (scenariosByFolderId[expandedFolderId] ?? [])
        .some((scenario) => scenario.id === scenarioId),
    )
    const sourceFolder = folders.find((candidate) => candidate.id === sourceFolderId)
    const targetFolder = folders.find((candidate) => candidate.id === folderId)
    if (
      scenarioId &&
      sourceFolderId &&
      sourceFolder?.can_edit &&
      targetFolder?.can_edit &&
      sourceFolder.library_kind === targetFolder.library_kind
    ) {
      void moveScenario(scenarioId, sourceFolderId, folderId)
    }
  }

  const handleFolderDragOver = (event: DragEvent<HTMLElement>, folderId: string) => {
    event.preventDefault()
    const folder = folders.find((candidate) => candidate.id === folderId)
    const transferTypes = Array.from(event.dataTransfer.types ?? [])
    if (
      controlsDisabled || !folder?.can_edit ||
      (transferTypes.length > 0 && !transferTypes.includes('text/folder-id'))
    ) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const edge = event.clientY >= bounds.top + bounds.height / 2 ? 'after' : 'before'
    setFolderDropTarget({ folderId, edge })
  }

  const handleScenarioDragOver = (
    event: DragEvent<HTMLDivElement>,
    scenarioId: string,
  ) => {
    event.preventDefault()
    const transferTypes = Array.from(event.dataTransfer.types ?? [])
    if (transferTypes.length > 0 && !transferTypes.includes('text/scenario-id')) return
    event.stopPropagation()
    if (scenarioSelectionDisabled || status === 'working' || scenarioAction !== 'idle') return
    const bounds = event.currentTarget.getBoundingClientRect()
    const edge = event.clientY >= bounds.top + bounds.height / 2 ? 'after' : 'before'
    setDropTarget({ scenarioId, edge })
  }

  const handleScenarioDrop = (
    event: DragEvent<HTMLDivElement>,
    folderId: string,
    targetScenarioId: string,
  ) => {
    event.preventDefault()
    const draggedScenarioId = event.dataTransfer.getData('text/scenario-id')
    if (!draggedScenarioId) return
    event.stopPropagation()
    const edge = dropTarget?.scenarioId === targetScenarioId ? dropTarget.edge : 'before'
    setDropTarget(null)
    if (
      !draggedScenarioId ||
      draggedScenarioId === targetScenarioId ||
      status === 'working' ||
      scenarioAction !== 'idle' ||
      scenarioSelectionDisabled
    ) {
      return
    }
    const scenarios = scenariosByFolderId[folderId] ?? []
    const next = reorderScenarioList(
      scenarios,
      draggedScenarioId,
      targetScenarioId,
      edge,
    )
    void persistScenarioOrder(folderId, scenarios, next)
  }

  const draftTitle = scenarioDraftTitle.trim() || 'Untitled Scenario'
  const personalFolders = folders.filter((folder) => folder.library_kind === 'personal')
  const templateFolders = folders.filter((folder) => folder.library_kind === 'template')
  const controlsDisabled =
    status === 'working' || scenarioAction !== 'idle' || scenarioSelectionDisabled

  return (
    <section className="min-w-0 border border-neutral-800 bg-neutral-950 p-4" aria-label="Scenarios library">
      <div className="grid gap-3 border-b border-neutral-800 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="pt-2 text-sm uppercase tracking-wider text-neutral-400">Scenarios</h2>
          <div className="grid min-w-0 gap-1" data-testid="scenario-dispatch-countdown">
            <span className="text-xs uppercase tracking-wider text-neutral-400">
              Dispatch countdown
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                min={0}
                step={1}
                value={dispatchMinutes === 0 ? '' : dispatchMinutes}
                placeholder="0"
                disabled={dispatchCountdownLocked}
                onChange={(event) => setDispatchMinutes(Number(event.target.value))}
                aria-label="Dispatch countdown minutes"
                aria-describedby={dispatchCountdownLocked ? 'scenario-dispatch-countdown-lock-status' : undefined}
                className={cn(
                  'w-20 border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-bp',
                  'disabled:cursor-not-allowed disabled:border-neutral-800 disabled:text-neutral-500',
                )}
              />
              <span className="text-xs uppercase tracking-wider text-neutral-500">min</span>
              <input
                type="number"
                min={0}
                max={59}
                step={1}
                value={dispatchSeconds === 0 ? '' : dispatchSeconds}
                placeholder="0"
                disabled={dispatchCountdownLocked}
                onChange={(event) => setDispatchSeconds(Number(event.target.value))}
                aria-label="Dispatch countdown seconds"
                aria-describedby={dispatchCountdownLocked ? 'scenario-dispatch-countdown-lock-status' : undefined}
                className={cn(
                  'w-20 border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-bp',
                  'disabled:cursor-not-allowed disabled:border-neutral-800 disabled:text-neutral-500',
                )}
              />
              <span className="text-xs uppercase tracking-wider text-neutral-500">sec</span>
            </div>
            {dispatchCountdownLocked ? (
              <p
                id="scenario-dispatch-countdown-lock-status"
                className="font-mono text-xs font-bold uppercase tracking-wider text-pending-amber"
              >
                Locked · Live {liveDispatchCountdown.formatted}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={startNewScenario}
            disabled={
              loading ||
              status === 'working' ||
              scenarioAction !== 'idle' ||
              scenarioSelectionDisabled
            }
            className="border border-cyan-bp bg-cyan-bp/10 px-3 py-2 font-mono text-xs font-bold uppercase tracking-wider text-cyan-bp hover:bg-cyan-bp/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            New Scenario
          </button>
          {role === 'administrator' ? (
            <button
              type="button"
              onClick={startNewTemplateScenario}
              disabled={
                loading ||
                status === 'working' ||
                scenarioAction !== 'idle' ||
                scenarioSelectionDisabled
              }
              className="border border-purple-etco2 bg-purple-etco2/10 px-3 py-2 font-mono text-xs font-bold uppercase tracking-wider text-purple-etco2 hover:bg-purple-etco2/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              New Template
            </button>
          ) : null}
          <button
            type="button"
            aria-label="New Folder"
            onClick={() => {
              setNewFolderLibraryKind('personal')
              setCreatingFolder(true)
            }}
            disabled={
              creatingFolder ||
              loading ||
              status === 'working' ||
              scenarioAction !== 'idle' ||
              scenarioSelectionDisabled
            }
            className="border border-cyan-bp bg-cyan-bp/10 px-3 py-2 font-mono text-xs font-bold uppercase tracking-wider text-cyan-bp hover:bg-cyan-bp/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            New Personal Folder
          </button>
          {role === 'administrator' ? (
            <button
              type="button"
              onClick={() => {
                setNewFolderLibraryKind('template')
                setCreatingFolder(true)
              }}
              disabled={
                creatingFolder ||
                loading ||
                status === 'working' ||
                scenarioAction !== 'idle' ||
                scenarioSelectionDisabled
              }
              className="border border-purple-etco2 bg-purple-etco2/10 px-3 py-2 font-mono text-xs font-bold uppercase tracking-wider text-purple-etco2 hover:bg-purple-etco2/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              New Template Folder
            </button>
          ) : null}
        </div>
      </div>

      {creatingFolder ? (
        <div className="mt-3 text-xs uppercase tracking-wider text-neutral-500">
          Creating in {newFolderLibraryKind === 'personal' ? 'My Scenarios' : 'Templates'}
        </div>
      ) : null}

      {creatingFolder ? (
        <form
          className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            void createFolder()
          }}
        >
          <input
            autoFocus
            value={newFolderName}
            onChange={(event) => setNewFolderName(event.target.value)}
            aria-label="New folder name"
            className="min-w-0 border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-bp"
          />
          <button
            type="submit"
            disabled={!newFolderName.trim() || controlsDisabled}
            className="border border-ecg-green px-3 py-2 font-mono text-xs uppercase text-ecg-green disabled:opacity-40"
          >
            Create
          </button>
          <button
            type="button"
            onClick={() => {
              setCreatingFolder(false)
              setNewFolderName('')
            }}
            className="border border-neutral-700 px-3 py-2 font-mono text-xs uppercase text-neutral-400"
          >
            Cancel
          </button>
        </form>
      ) : null}

      {error || scenarioError ? (
        <p role="alert" className="mt-3 text-sm font-semibold text-alarm-red">
          {error || scenarioError}
        </p>
      ) : null}

      <div
        className="mt-3 grid gap-3 md:grid-cols-2 md:items-start"
        data-testid="scenario-folder-list"
      >
        {loading && folders.length === 0 ? (
          <p className="border border-neutral-800 p-4 text-sm text-neutral-500 md:col-span-2">
            Loading scenarios…
          </p>
        ) : (
          <>
            {([
              {
                kind: 'personal' as const,
                title: 'My Scenarios',
                scopedFolders: personalFolders,
              },
              {
                kind: 'template' as const,
                title: 'Templates',
                scopedFolders: templateFolders,
              },
            ]).map(({ kind, title, scopedFolders }) => (
              <div
                key={kind}
                className="min-w-0 border border-neutral-800"
                data-testid={`${kind}-scenario-library`}
              >
                <div className={cn(
                  'border-b border-neutral-800 px-3 py-2 font-mono text-xs font-bold uppercase tracking-[0.18em]',
                  kind === 'personal'
                    ? 'bg-cyan-bp/5 text-cyan-bp'
                    : 'bg-purple-etco2/5 text-purple-etco2',
                )}>
                  {title}
                </div>
            {kind === 'personal' && personalFolders.length === 0 && scenarioDraftActive && !selectedFolderId ? (
              <section className="border-b border-neutral-800">
            <div className="bg-cyan-bp/10 px-2 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <span aria-hidden="true" className="font-mono text-cyan-bp">−</span>
                <span className="truncate font-mono text-sm font-bold uppercase tracking-wider text-neutral-200">
                  Folder 1
                </span>
                <span className="text-xs text-neutral-600">(0)</span>
              </div>
            </div>
            <div
              role="region"
              className="grid gap-2 bg-black/40 p-2"
              aria-label="Folder 1 scenarios"
            >
              <ScenarioDraftRow
                title={draftTitle}
                dirty={scenarioIsDirty}
                action={scenarioAction}
                disabled={scenarioSelectionDisabled}
                onTitleChange={onScenarioTitleChange}
                onSave={() => onSaveScenario()}
                onDelete={onDeleteDraft}
              />
            </div>
              </section>
            ) : kind === 'personal' && personalFolders.length === 0 ? (
              <p className="border-b border-neutral-800 p-4 text-sm text-neutral-500">
                No scenario folders. Select New Scenario to start a draft; Folder 1 will be created when you save.
              </p>
            ) : kind === 'template' && templateFolders.length === 0 ? (
              <p className="p-4 text-sm text-neutral-500">No shared Templates yet.</p>
            ) : null}
            {scopedFolders.map((folder) => {
            const folderIndex = scopedFolders.findIndex((candidate) => candidate.id === folder.id)
            const selectedFolder = folder.id === selectedFolderId
            const expanded = expandedFolderIds.has(folder.id)
            const scenarios = scenariosByFolderId[folder.id] ?? []
            const loadingScenarios = loadingFolderIds.has(folder.id)
            const renaming = renamingFolderId === folder.id
            return (
              <section
                key={folder.id}
                draggable={!controlsDisabled && !renaming && folder.can_edit}
                onDragStart={(event) => {
                  event.dataTransfer.setData('text/folder-id', folder.id)
                  event.dataTransfer.effectAllowed = 'move'
                }}
                onDragOver={(event) => handleFolderDragOver(event, folder.id)}
                onDrop={(event) => handleFolderDrop(event, folder.id)}
                onDragEnd={() => setFolderDropTarget(null)}
                className={cn(
                  'relative border-b border-neutral-800 last:border-b-0',
                  folderDropTarget?.folderId === folder.id &&
                    folderDropTarget.edge === 'before' &&
                    'before:absolute before:inset-x-0 before:-top-px before:z-20 before:h-0.5 before:bg-cyan-bp',
                  folderDropTarget?.folderId === folder.id &&
                    folderDropTarget.edge === 'after' &&
                    'after:absolute after:inset-x-0 after:-bottom-px after:z-20 after:h-0.5 after:bg-cyan-bp',
                )}
              >
                <div className={cn('grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-2 py-2', selectedFolder ? 'bg-cyan-bp/10' : 'bg-neutral-900/50')}>
                  {renaming ? (
                    <form
                      className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2"
                      onSubmit={(event) => {
                        event.preventDefault()
                        void renameFolder(folder.id)
                      }}
                    >
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(event) => setRenameValue(event.target.value)}
                        aria-label={`Rename ${folder.name}`}
                        className="min-w-0 border border-neutral-700 bg-black px-2 py-1 text-sm text-white"
                      />
                      <button type="submit" disabled={!renameValue.trim() || controlsDisabled} className="text-xs uppercase text-ecg-green disabled:opacity-40">Save</button>
                      <button type="button" onClick={() => setRenamingFolderId(null)} className="text-xs uppercase text-neutral-400">Cancel</button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (expanded) {
                          onExpandedFolderChange(folder.id, false)
                        } else {
                          onSelectedFolderChange(folder.id)
                          onExpandedFolderChange(folder.id, true)
                        }
                      }}
                      aria-expanded={expanded}
                      aria-current={selectedFolder ? 'true' : undefined}
                      className="flex min-w-0 items-center gap-2 text-left"
                    >
                      <span aria-hidden="true" className="font-mono text-cyan-bp">{expanded ? '−' : '+'}</span>
                      <span className="truncate font-mono text-sm font-bold uppercase tracking-wider text-neutral-200">{folder.name}</span>
                      <span className="text-xs text-neutral-600">({folder.scenario_count})</span>
                    </button>
                  )}
                  {!renaming ? (
                    <div className="flex items-center gap-2">
                      <span aria-hidden="true" title="Drag to reorder" className="cursor-grab font-mono text-neutral-600">⋮⋮</span>
                      <button
                        type="button"
                        aria-label={`Move ${folder.name} up`}
                        onClick={() => moveFolderBy(folder.id, -1)}
                        disabled={folderIndex === 0 || controlsDisabled || !folder.can_edit}
                        className="border border-neutral-700 px-2 py-1 font-mono text-xs text-cyan-bp disabled:cursor-not-allowed disabled:text-neutral-700"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label={`Move ${folder.name} down`}
                        onClick={() => moveFolderBy(folder.id, 1)}
                        disabled={folderIndex === scopedFolders.length - 1 || controlsDisabled || !folder.can_edit}
                        className="border border-neutral-700 px-2 py-1 font-mono text-xs text-cyan-bp disabled:cursor-not-allowed disabled:text-neutral-700"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRenamingFolderId(folder.id)
                          setRenameValue(folder.name)
                        }}
                        disabled={controlsDisabled || !folder.can_edit}
                        className="font-mono text-[10px] uppercase text-cyan-bp disabled:opacity-40"
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => setFolderPendingDeletion(folder)}
                        disabled={controlsDisabled || !folder.can_edit}
                        className="font-mono text-[10px] uppercase text-alarm-red disabled:opacity-40"
                      >
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>

                {expanded ? (
                  <div
                    role="region"
                    className="grid gap-2 bg-black/40 p-2"
                    aria-label={`${folder.name} scenarios`}
                  >
                    {scenarioDraftActive && selectedFolder ? (
                      <ScenarioDraftRow
                        title={draftTitle}
                        dirty={scenarioIsDirty}
                        action={scenarioAction}
                        disabled={scenarioSelectionDisabled}
                        onTitleChange={onScenarioTitleChange}
                        onSave={() => onSaveScenario()}
                        onDelete={onDeleteDraft}
                      />
                    ) : null}
                    {loadingScenarios && scenariosByFolderId[folder.id] === undefined ? (
                      <p className="px-2 py-3 text-sm text-neutral-600">Loading scenarios…</p>
                    ) : scenarios.length === 0 && !(scenarioDraftActive && selectedFolder) ? (
                      <p className="px-2 py-3 text-sm text-neutral-600">No scenarios in this folder.</p>
                    ) : (
                      scenarios.map((scenario, index) => {
                        const selected = loadedScenarioId === scenario.id
                        const showBefore = dropTarget?.scenarioId === scenario.id && dropTarget.edge === 'before'
                        const showAfter = dropTarget?.scenarioId === scenario.id && dropTarget.edge === 'after'
                        return (
                          <div
                            key={scenario.id}
                            role="button"
                            tabIndex={scenarioSelectionDisabled ? -1 : 0}
                            aria-pressed={selected}
                            aria-disabled={scenarioSelectionDisabled}
                            aria-label={`${selected ? 'Unload' : 'Load'} ${scenario.title}`}
                            draggable={!controlsDisabled && scenario.can_edit}
                            onClick={() => void loadScenario(scenario.id)}
                            onKeyDown={(event) => activateScenario(event, scenario.id)}
                            onDragStart={(event) => {
                              event.stopPropagation()
                              event.dataTransfer.setData('text/scenario-id', scenario.id)
                              event.dataTransfer.effectAllowed = 'move'
                            }}
                            onDragOver={(event) => handleScenarioDragOver(event, scenario.id)}
                            onDragLeave={(event) => {
                              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                                setDropTarget(null)
                              }
                            }}
                            onDrop={(event) => handleScenarioDrop(event, folder.id, scenario.id)}
                            onDragEnd={() => setDropTarget(null)}
                            className={cn(
                              'relative grid min-h-11 cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1 border px-2 py-1 focus:outline-none focus:ring-2 focus:ring-cyan-bp 2xl:grid-cols-[auto_minmax(0,1fr)_minmax(8rem,10rem)_auto_auto]',
                              selected
                                ? 'border-ecg-green bg-ecg-green/10'
                                : 'border-neutral-800 bg-neutral-950 hover:border-cyan-bp/60',
                              scenarioSelectionDisabled && 'cursor-not-allowed opacity-60',
                              showBefore && 'before:absolute before:inset-x-0 before:-top-1 before:h-0.5 before:bg-cyan-bp',
                              showAfter && 'after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:bg-cyan-bp',
                            )}
                          >
                            <span aria-hidden="true" title="Drag to reorder or move" className="cursor-grab font-mono text-neutral-600">⋮⋮</span>
                            <div className="min-h-8 min-w-0 border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm leading-6 text-white">
                              <EditableScenarioTitle
                                title={scenario.title}
                                editable={!controlsDisabled && scenario.can_edit}
                                selected={selected}
                                activationDisabled={scenarioSelectionDisabled}
                                onActivate={scenario.can_edit
                                  ? () => void loadScenario(scenario.id)
                                  : undefined}
                                onCommit={(value) => renameScenario(scenario, value)}
                              />
                            </div>
                            <label
                              className="col-start-2 row-start-2 grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-1 2xl:col-auto 2xl:row-auto"
                              onClick={stopRowActivation}
                              onKeyDown={stopRowKeyboardActivation}
                            >
                              <span className="text-[9px] uppercase text-neutral-500">Move</span>
                              <select
                                aria-label={`Move ${scenario.title}`}
                                value={folder.id}
                                onChange={(event) => void moveScenario(
                                  scenario.id,
                                  folder.id,
                                  event.target.value,
                                )}
                                disabled={controlsDisabled || !scenario.can_edit}
                                className="min-h-8 min-w-0 border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-200 disabled:opacity-40"
                              >
                                {folders
                                  .filter((target) => target.library_kind === folder.library_kind)
                                  .map((target) => (
                                  <option key={target.id} value={target.id}>{target.name}</option>
                                ))}
                              </select>
                            </label>
                            <div
                              className="col-start-3 row-start-2 grid grid-cols-2 gap-1 2xl:col-auto 2xl:row-auto"
                              onClick={stopRowActivation}
                              onKeyDown={stopRowKeyboardActivation}
                            >
                              <button
                                type="button"
                                aria-label={`Move ${scenario.title} up`}
                                onClick={() => moveScenarioBy(folder.id, scenario.id, -1)}
                                disabled={index === 0 || controlsDisabled || !scenario.can_edit}
                                className="min-h-8 border border-neutral-700 px-2 py-1 font-mono text-xs text-cyan-bp disabled:cursor-not-allowed disabled:text-neutral-700"
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                aria-label={`Move ${scenario.title} down`}
                                onClick={() => moveScenarioBy(folder.id, scenario.id, 1)}
                                disabled={index === scenarios.length - 1 || controlsDisabled || !scenario.can_edit}
                                className="min-h-8 border border-neutral-700 px-2 py-1 font-mono text-xs text-cyan-bp disabled:cursor-not-allowed disabled:text-neutral-700"
                              >
                                ↓
                              </button>
                            </div>
                            <ScenarioRowActions
                              title={scenario.title}
                              saveDisabled={!selected || !scenarioIsDirty || controlsDisabled}
                              deleteDisabled={controlsDisabled || !scenario.can_edit}
                              saving={selected && scenarioAction === 'saving'}
                              deleting={scenarioAction === 'deleting'}
                              saveLabel={scenario.can_edit ? 'Save' : 'Save Copy'}
                              className="col-start-3 row-start-1 2xl:col-auto 2xl:row-auto"
                              onSave={() => onSaveScenario(
                                scenario.can_edit ? undefined : personalFolders[0]?.id ?? null,
                              )}
                              onDelete={() => onDeleteScenario(scenario)}
                            />
                          </div>
                        )
                      })
                    )}
                  </div>
                ) : null}
              </section>
            )
          })}
              </div>
            ))}
          </>
        )}
      </div>
      <ConfirmationDialog
        open={folderPendingDeletion !== null}
        title="Delete folder"
        description={folderPendingDeletion
          ? folderPendingDeletion.scenario_count > 0
            ? `Delete "${folderPendingDeletion.name}" and its ${folderPendingDeletion.scenario_count} ${folderPendingDeletion.scenario_count === 1 ? 'scenario' : 'scenarios'}? This cannot be undone.`
            : `Delete "${folderPendingDeletion.name}"? This folder is empty. This cannot be undone.`
          : ''}
        confirmLabel="Delete"
        onCancel={() => setFolderPendingDeletion(null)}
        onConfirm={() => {
          const folder = folderPendingDeletion
          setFolderPendingDeletion(null)
          if (folder) void deleteFolder(folder)
        }}
      />
    </section>
  )
}
