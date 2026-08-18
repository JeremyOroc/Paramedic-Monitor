'use client'

import { useCallback, useEffect, useState, type DragEvent } from 'react'

import { cn } from '@/lib/utils'
import type {
  SavedScenario,
  SavedScenarioListResponse,
  ScenarioFolder,
  ScenarioFolderListResponse,
} from '@/types/savedScenario'

type ScenarioLibraryPanelProps = {
  selectedFolderId: string
  loadedScenarioId: string | null
  refreshVersion: number
  onSelectedFolderChange: (folderId: string) => void
  onLoadScenario: (scenario: SavedScenario) => void
}

type MutationStatus = 'idle' | 'working'

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

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init)
  const data = await response.json() as unknown
  if (!response.ok) throw new Error(errorMessage(data, 'Scenario library request failed'))
  return data as T
}

export function ScenarioLibraryPanel({
  selectedFolderId,
  loadedScenarioId,
  refreshVersion,
  onSelectedFolderChange,
  onLoadScenario,
}: ScenarioLibraryPanelProps) {
  const [folders, setFolders] = useState<ScenarioFolder[]>([])
  const [scenarios, setScenarios] = useState<SavedScenarioListResponse['scenarios']>([])
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [status, setStatus] = useState<MutationStatus>('idle')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadFolders = useCallback(async () => {
    const data = await requestJson<ScenarioFolderListResponse>('/api/scenario-folders')
    setFolders(data.folders)
    const selectedExists = data.folders.some((folder) => folder.id === selectedFolderId)
    if (!selectedExists) {
      const general = data.folders.find((folder) => folder.is_general)
      if (general) onSelectedFolderChange(general.id)
    }
  }, [onSelectedFolderChange, selectedFolderId])

  const loadScenarios = useCallback(async () => {
    if (!selectedFolderId) {
      setScenarios([])
      return
    }
    const data = await requestJson<SavedScenarioListResponse>(
      `/api/scenarios?folderId=${encodeURIComponent(selectedFolderId)}`,
    )
    setScenarios(data.scenarios)
  }, [selectedFolderId])

  // The folder library is an external server resource. Fetching on mount and
  // when the selected folder changes is the synchronization case effects are
  // intended for; the async callbacks commit the returned server state.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let cancelled = false
    Promise.all([loadFolders(), loadScenarios()])
      .then(() => {
        if (!cancelled) setError('')
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : 'Unable to load scenarios')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [loadFolders, loadScenarios, refreshVersion])
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
    if (!window.confirm(`Delete "${folder.name}"? Its scenarios will move to General.`)) return
    await runMutation(async () => {
      const data = await requestJson<{ generalFolderId: string }>(
        `/api/scenario-folders/${folder.id}`,
        { method: 'DELETE' },
      )
      onSelectedFolderChange(data.generalFolderId)
      await loadFolders()
    })
  }

  const moveScenario = async (scenarioId: string, folderId: string) => {
    if (!folderId || folderId === selectedFolderId) return
    await runMutation(async () => {
      await requestJson(`/api/scenarios/${scenarioId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId }),
      })
      setScenarios((current) => current.filter((scenario) => scenario.id !== scenarioId))
      await loadFolders()
    })
  }

  const loadScenario = async (scenarioId: string) => {
    await runMutation(async () => {
      const data = await requestJson<{ scenario: SavedScenario }>(`/api/scenarios/${scenarioId}`)
      onLoadScenario(data.scenario)
    })
  }

  const handleFolderDrop = (event: DragEvent<HTMLElement>, folderId: string) => {
    event.preventDefault()
    const scenarioId = event.dataTransfer.getData('text/scenario-id')
    if (scenarioId) void moveScenario(scenarioId, folderId)
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
          <p className="p-4 text-sm text-neutral-500">No scenario folders are available.</p>
        ) : (
          folders.map((folder) => {
            const expanded = folder.id === selectedFolderId
            const renaming = renamingFolderId === folder.id
            return (
              <section
                key={folder.id}
                className="border-b border-neutral-800 last:border-b-0"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => handleFolderDrop(event, folder.id)}
              >
                <div className={cn('grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-2 py-2', expanded ? 'bg-cyan-bp/10' : 'bg-neutral-900/50')}>
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
                      onClick={() => onSelectedFolderChange(folder.id)}
                      aria-expanded={expanded}
                      className="flex min-w-0 items-center gap-2 text-left"
                    >
                      <span aria-hidden="true" className="font-mono text-cyan-bp">{expanded ? '−' : '+'}</span>
                      <span className="truncate font-mono text-sm font-bold uppercase tracking-wider text-neutral-200">{folder.name}</span>
                      <span className="text-xs text-neutral-600">({folder.scenario_count})</span>
                    </button>
                  )}
                  {!folder.is_general && !renaming ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setRenamingFolderId(folder.id)
                          setRenameValue(folder.name)
                        }}
                        className="font-mono text-[10px] uppercase text-cyan-bp"
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteFolder(folder)}
                        className="font-mono text-[10px] uppercase text-alarm-red"
                      >
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>

                {expanded ? (
                  <div className="grid gap-2 bg-black/40 p-2" aria-label={`${folder.name} scenarios`}>
                    {scenarios.length === 0 ? (
                      <p className="px-2 py-3 text-sm text-neutral-600">No scenarios in this folder.</p>
                    ) : (
                      scenarios.map((scenario) => (
                        <div
                          key={scenario.id}
                          draggable
                          onDragStart={(event) => {
                            event.dataTransfer.setData('text/scenario-id', scenario.id)
                            event.dataTransfer.effectAllowed = 'move'
                          }}
                          className={cn(
                            'grid grid-cols-[auto_minmax(0,1fr)_minmax(8rem,auto)_auto] items-center gap-2 border p-2',
                            loadedScenarioId === scenario.id
                              ? 'border-ecg-green bg-ecg-green/10'
                              : 'border-neutral-800 bg-neutral-950',
                          )}
                        >
                          <span aria-label={`Drag ${scenario.title}`} title="Drag to another folder" className="cursor-grab font-mono text-neutral-600">⋮⋮</span>
                          <div className="min-w-0 border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white">
                            <span className="block truncate">{scenario.title}</span>
                          </div>
                          <label className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
                            <span className="text-[10px] uppercase text-neutral-500">Move</span>
                            <select
                              aria-label={`Move ${scenario.title}`}
                              value={folder.id}
                              onChange={(event) => void moveScenario(scenario.id, event.target.value)}
                              className="min-w-0 border border-neutral-700 bg-neutral-900 px-2 py-2 text-xs text-neutral-200"
                            >
                              {folders.map((target) => (
                                <option key={target.id} value={target.id}>{target.name}</option>
                              ))}
                            </select>
                          </label>
                          <button
                            type="button"
                            onClick={() => void loadScenario(scenario.id)}
                            disabled={status === 'working'}
                            className="border border-cyan-bp px-3 py-2 font-mono text-xs font-bold uppercase tracking-wider text-cyan-bp hover:bg-cyan-bp/10 disabled:opacity-40"
                          >
                            Load
                          </button>
                        </div>
                      ))
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
