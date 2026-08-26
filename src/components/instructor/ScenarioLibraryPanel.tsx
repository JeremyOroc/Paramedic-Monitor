'use client'

import {
  useCallback,
  useEffect,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'

import { cn } from '@/lib/utils'
import type {
  SavedScenario,
  SavedScenarioListResponse,
  ScenarioFolder,
  ScenarioFolderListResponse,
} from '@/types/savedScenario'

type ScenarioLibraryPanelProps = {
  selectedFolderId: string
  expandedFolderIds: ReadonlySet<string>
  loadedScenarioId: string | null
  refreshVersion: number
  onSelectedFolderChange: (folderId: string) => void
  onExpandedFolderChange: (folderId: string, expanded: boolean) => void
  onLoadScenario: (scenario: SavedScenario) => void
  onUnloadScenario: () => void
  onFolderDeleted: (folderId: string) => void
  onLoadedScenarioFolderChange: (folderId: string) => void
}

type MutationStatus = 'idle' | 'working'
type DropTarget = { scenarioId: string; edge: 'before' | 'after' }

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

export function ScenarioLibraryPanel({
  selectedFolderId,
  expandedFolderIds,
  loadedScenarioId,
  refreshVersion,
  onSelectedFolderChange,
  onExpandedFolderChange,
  onLoadScenario,
  onUnloadScenario,
  onFolderDeleted,
  onLoadedScenarioFolderChange,
}: ScenarioLibraryPanelProps) {
  const [folders, setFolders] = useState<ScenarioFolder[]>([])
  const [scenariosByFolderId, setScenariosByFolderId] = useState<
    Record<string, SavedScenarioListResponse['scenarios']>
  >({})
  const [loadingFolderIds, setLoadingFolderIds] = useState<Set<string>>(() => new Set())
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [status, setStatus] = useState<MutationStatus>('idle')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)

  const loadFolders = useCallback(async () => {
    const data = await requestJson<ScenarioFolderListResponse>('/api/scenario-folders')
    setFolders(data.folders)
    const selectedExists = data.folders.some((folder) => folder.id === selectedFolderId)
    if (!selectedExists) onSelectedFolderChange(data.folders[0]?.id ?? '')
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
        body: JSON.stringify({ name: newFolderName }),
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
    if (
      folder.scenario_count > 0 &&
      !window.confirm(
        `Delete "${folder.name}" and its ${folder.scenario_count} ${folder.scenario_count === 1 ? 'scenario' : 'scenarios'}? This cannot be undone.`,
      )
    ) {
      return
    }

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
        onSelectedFolderChange(remainingFolders[0]?.id ?? '')
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

  const loadScenario = async (scenarioId: string) => {
    if (loadedScenarioId === scenarioId) {
      onUnloadScenario()
      return
    }
    await runMutation(async () => {
      const data = await requestJson<{ scenario: SavedScenario }>(`/api/scenarios/${scenarioId}`)
      onLoadScenario(data.scenario)
    })
  }

  const activateScenario = (event: KeyboardEvent<HTMLDivElement>, scenarioId: string) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
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
    const scenarioId = event.dataTransfer.getData('text/scenario-id')
    const sourceFolderId = [...expandedFolderIds].find((expandedFolderId) =>
      (scenariosByFolderId[expandedFolderId] ?? [])
        .some((scenario) => scenario.id === scenarioId),
    )
    if (scenarioId && sourceFolderId) {
      void moveScenario(scenarioId, sourceFolderId, folderId)
    }
  }

  const handleScenarioDragOver = (
    event: DragEvent<HTMLDivElement>,
    scenarioId: string,
  ) => {
    event.preventDefault()
    event.stopPropagation()
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
    event.stopPropagation()
    const draggedScenarioId = event.dataTransfer.getData('text/scenario-id')
    const edge = dropTarget?.scenarioId === targetScenarioId ? dropTarget.edge : 'before'
    setDropTarget(null)
    if (!draggedScenarioId || draggedScenarioId === targetScenarioId || status === 'working') {
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

  return (
    <section className="border border-neutral-800 bg-neutral-950 p-4" aria-label="Scenarios library">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-800 pb-3">
        <div>
          <h2 className="text-sm uppercase tracking-wider text-neutral-400">Scenarios</h2>
          <p className="mt-1 text-xs text-neutral-600">Global Supabase library</p>
        </div>
        <button
          type="button"
          onClick={() => setCreatingFolder(true)}
          disabled={creatingFolder || status === 'working'}
          className="border border-cyan-bp bg-cyan-bp/10 px-3 py-2 font-mono text-xs font-bold uppercase tracking-wider text-cyan-bp hover:bg-cyan-bp/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          New Folder
        </button>
      </div>

      {creatingFolder ? (
        <form
          className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2"
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
            disabled={!newFolderName.trim() || status === 'working'}
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

      {error ? <p role="alert" className="mt-3 text-sm font-semibold text-alarm-red">{error}</p> : null}

      <div className="mt-3 max-h-96 overflow-y-auto border border-neutral-800" data-testid="scenario-folder-scroll">
        {loading && folders.length === 0 ? (
          <p className="p-4 text-sm text-neutral-500">Loading scenarios…</p>
        ) : folders.length === 0 ? (
          <p className="p-4 text-sm text-neutral-500">No scenario folders. Saving a scenario will create Folder 1.</p>
        ) : (
          folders.map((folder) => {
            const selectedFolder = folder.id === selectedFolderId
            const expanded = expandedFolderIds.has(folder.id)
            const scenarios = scenariosByFolderId[folder.id] ?? []
            const loadingScenarios = loadingFolderIds.has(folder.id)
            const renaming = renamingFolderId === folder.id
            return (
              <section
                key={folder.id}
                className="border-b border-neutral-800 last:border-b-0"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => handleFolderDrop(event, folder.id)}
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
                      <button type="submit" disabled={!renameValue.trim()} className="text-xs uppercase text-ecg-green disabled:opacity-40">Save</button>
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
                      <button
                        type="button"
                        onClick={() => {
                          setRenamingFolderId(folder.id)
                          setRenameValue(folder.name)
                        }}
                        disabled={status === 'working'}
                        className="font-mono text-[10px] uppercase text-cyan-bp disabled:opacity-40"
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteFolder(folder)}
                        disabled={status === 'working'}
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
                    {loadingScenarios && scenariosByFolderId[folder.id] === undefined ? (
                      <p className="px-2 py-3 text-sm text-neutral-600">Loading scenarios…</p>
                    ) : scenarios.length === 0 ? (
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
                            tabIndex={0}
                            aria-pressed={selected}
                            aria-label={`${selected ? 'Unload' : 'Load'} ${scenario.title}`}
                            draggable={status === 'idle'}
                            onClick={() => void loadScenario(scenario.id)}
                            onKeyDown={(event) => activateScenario(event, scenario.id)}
                            onDragStart={(event) => {
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
                              'relative grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto_minmax(8rem,auto)] items-center gap-2 border p-2 focus:outline-none focus:ring-2 focus:ring-cyan-bp',
                              selected
                                ? 'border-ecg-green bg-ecg-green/10'
                                : 'border-neutral-800 bg-neutral-950 hover:border-cyan-bp/60',
                              showBefore && 'before:absolute before:inset-x-0 before:-top-1 before:h-0.5 before:bg-cyan-bp',
                              showAfter && 'after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:bg-cyan-bp',
                            )}
                          >
                            <span aria-hidden="true" title="Drag to reorder or move" className="cursor-grab font-mono text-neutral-600">⋮⋮</span>
                            <div className="min-w-0 border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white">
                              <span className="block truncate">{scenario.title}</span>
                            </div>
                            <div
                              className="grid grid-cols-2 gap-1"
                              onClick={stopRowActivation}
                              onKeyDown={stopRowKeyboardActivation}
                            >
                              <button
                                type="button"
                                aria-label={`Move ${scenario.title} up`}
                                onClick={() => moveScenarioBy(folder.id, scenario.id, -1)}
                                disabled={index === 0 || status === 'working'}
                                className="border border-neutral-700 px-2 py-2 font-mono text-xs text-cyan-bp disabled:cursor-not-allowed disabled:text-neutral-700"
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                aria-label={`Move ${scenario.title} down`}
                                onClick={() => moveScenarioBy(folder.id, scenario.id, 1)}
                                disabled={index === scenarios.length - 1 || status === 'working'}
                                className="border border-neutral-700 px-2 py-2 font-mono text-xs text-cyan-bp disabled:cursor-not-allowed disabled:text-neutral-700"
                              >
                                ↓
                              </button>
                            </div>
                            <label
                              className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2"
                              onClick={stopRowActivation}
                              onKeyDown={stopRowKeyboardActivation}
                            >
                              <span className="text-[10px] uppercase text-neutral-500">Move</span>
                              <select
                                aria-label={`Move ${scenario.title}`}
                                value={folder.id}
                                onChange={(event) => void moveScenario(
                                  scenario.id,
                                  folder.id,
                                  event.target.value,
                                )}
                                disabled={status === 'working'}
                                className="min-w-0 border border-neutral-700 bg-neutral-900 px-2 py-2 text-xs text-neutral-200 disabled:opacity-40"
                              >
                                {folders.map((target) => (
                                  <option key={target.id} value={target.id}>{target.name}</option>
                                ))}
                              </select>
                            </label>
                          </div>
                        )
                      })
                    )}
                  </div>
                ) : null}
              </section>
            )
          })
        )}
      </div>
    </section>
  )
}
