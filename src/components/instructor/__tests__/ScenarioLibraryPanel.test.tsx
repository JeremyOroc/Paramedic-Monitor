import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { createEmptyScenarioSnapshot } from '@/lib/scenarioSnapshot'
import type { SavedScenario, ScenarioFolder } from '@/types/savedScenario'

import { ScenarioLibraryPanel } from '../ScenarioLibraryPanel'

const timestamp = '2026-08-18T10:00:00.000Z'

function folder(id: string, name: string, scenarioCount: number): ScenarioFolder {
  return {
    id,
    name,
    scenario_count: scenarioCount,
    created_at: timestamp,
    updated_at: timestamp,
  }
}

function savedScenario(
  id: string,
  folderId: string,
  title: string,
  position: number,
): SavedScenario {
  return {
    id,
    folder_id: folderId,
    scenario_number: Number(id.replace(/\D/g, '')),
    title,
    position,
    snapshot: createEmptyScenarioSnapshot(),
    created_at: timestamp,
    updated_at: timestamp,
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function summary(scenario: SavedScenario) {
  return {
    id: scenario.id,
    folder_id: scenario.folder_id,
    scenario_number: scenario.scenario_number,
    title: scenario.title,
    position: scenario.position,
    created_at: scenario.created_at,
    updated_at: scenario.updated_at,
  }
}

function createFetchMock(options: { empty?: boolean } = {}) {
  const folders = options.empty
    ? []
    : [folder('general', 'General', 2), folder('trauma', 'Trauma', 0)]
  const scenarios = options.empty
    ? []
    : [
        savedScenario('scenario-1', 'general', 'Chest Pain', 1),
        savedScenario('scenario-2', 'general', 'Older Call', 2),
      ]

  const fetchMock = vi.spyOn(window, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    if (url === '/api/scenario-folders' && method === 'GET') {
      return jsonResponse({ folders })
    }
    if (url.startsWith('/api/scenarios?folderId=')) {
      const folderId = new URL(url, 'http://localhost').searchParams.get('folderId')
      return jsonResponse({
        scenarios: scenarios
          .filter((scenario) => scenario.folder_id === folderId)
          .toSorted((left, right) => left.position - right.position)
          .map(summary),
      })
    }
    if (url.startsWith('/api/scenarios/') && method === 'GET') {
      const scenario = scenarios.find((item) => item.id === url.split('/').at(-1))
      return scenario ? jsonResponse({ scenario }) : jsonResponse({ error: 'Not found' }, 404)
    }
    if (url.startsWith('/api/scenarios/') && method === 'PATCH') {
      const scenario = scenarios.find((item) => item.id === url.split('/').at(-1))
      const body = JSON.parse(String(init?.body)) as { folderId: string }
      if (!scenario) return jsonResponse({ error: 'Not found' }, 404)
      scenario.folder_id = body.folderId
      scenario.position = scenarios.filter((item) => item.folder_id === body.folderId).length + 1
      return jsonResponse({ scenario })
    }
    if (url.endsWith('/order') && method === 'PATCH') {
      const body = JSON.parse(String(init?.body)) as { scenarioIds: string[] }
      body.scenarioIds.forEach((id, index) => {
        const scenario = scenarios.find((item) => item.id === id)
        if (scenario) scenario.position = index + 1
      })
      return jsonResponse({
        scenarios: body.scenarioIds
          .map((id) => scenarios.find((scenario) => scenario.id === id))
          .filter((scenario): scenario is SavedScenario => scenario !== undefined)
          .map(summary),
      })
    }
    if (url === '/api/scenario-folders' && method === 'POST') {
      const body = JSON.parse(String(init?.body)) as { name: string }
      const created = folder('new-folder', body.name, 0)
      folders.push(created)
      return jsonResponse({ folder: created }, 201)
    }
    if (url === '/api/scenario-folders/general' && method === 'PATCH') {
      const body = JSON.parse(String(init?.body)) as { name: string }
      const current = folders.find((item) => item.id === 'general')
      if (current) current.name = body.name
      return jsonResponse({ folder: current })
    }
    if (url.startsWith('/api/scenario-folders/') && method === 'DELETE') {
      const folderId = url.split('/').at(-1)
      const folderIndex = folders.findIndex((item) => item.id === folderId)
      if (folderIndex >= 0) folders.splice(folderIndex, 1)
      for (let index = scenarios.length - 1; index >= 0; index -= 1) {
        if (scenarios[index].folder_id === folderId) scenarios.splice(index, 1)
      }
      return new Response(null, { status: 204 })
    }
    return jsonResponse({ error: `Unhandled ${method} ${url}` }, 500)
  })

  return { fetchMock, folders, scenarios }
}

type HarnessProps = {
  onLoad?: (value: SavedScenario) => void
  onUnload?: () => void
  onFolderDeleted?: (folderId: string) => void
  scenarioSelectionDisabled?: boolean
}

function Harness({
  onLoad = vi.fn(),
  onUnload = vi.fn(),
  onFolderDeleted = vi.fn(),
  scenarioSelectionDisabled = false,
}: HarnessProps) {
  const [selectedFolderId, setSelectedFolderId] = useState('general')
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(() => new Set())
  const [loadedScenarioId, setLoadedScenarioId] = useState<string | null>(null)
  return (
    <ScenarioLibraryPanel
      selectedFolderId={selectedFolderId}
      expandedFolderIds={expandedFolderIds}
      loadedScenarioId={loadedScenarioId}
      refreshVersion={0}
      onSelectedFolderChange={setSelectedFolderId}
      onExpandedFolderChange={(folderId, expanded) => {
        setExpandedFolderIds((current) => {
          const next = new Set(current)
          if (expanded) next.add(folderId)
          else next.delete(folderId)
          return next
        })
      }}
      onLoadScenario={(value) => {
        setLoadedScenarioId(value.id)
        onLoad(value)
      }}
      onUnloadScenario={() => {
        setLoadedScenarioId(null)
        onUnload()
      }}
      onFolderDeleted={onFolderDeleted}
      onLoadedScenarioFolderChange={vi.fn()}
      scenarioSelectionDisabled={scenarioSelectionDisabled}
    />
  )
}

describe('ScenarioLibraryPanel', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('blocks scenario load activation while selection is disabled', async () => {
    createFetchMock()
    const onLoad = vi.fn()
    const user = userEvent.setup()
    render(<Harness onLoad={onLoad} scenarioSelectionDisabled />)

    await user.click(await screen.findByRole('button', { name: /General/ }))
    const row = await screen.findByRole('button', { name: 'Load Chest Pain' })
    expect(row).toHaveAttribute('aria-disabled', 'true')

    await user.click(row)
    fireEvent.keyDown(row, { key: 'Enter' })

    expect(onLoad).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Unload Chest Pain' })).toBeNull()
  })

  it('treats General as ordinary and toggles scenario loading from the row', async () => {
    createFetchMock()
    const onLoad = vi.fn()
    const onUnload = vi.fn()
    const user = userEvent.setup()
    render(<Harness onLoad={onLoad} onUnload={onUnload} />)

    const generalButton = await screen.findByRole('button', { name: /General/ })
    expect(generalButton).toHaveAttribute('aria-expanded', 'false')
    expect(generalButton).toHaveAttribute('aria-current', 'true')
    await user.click(generalButton)
    await waitFor(() => expect(generalButton).toHaveAttribute('aria-expanded', 'true'))
    const generalSection = screen.getByRole('button', { name: /General/ }).closest('section') as HTMLElement
    expect(within(generalSection).getByRole('button', { name: 'Rename' })).toBeInTheDocument()
    expect(within(generalSection).getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Load' })).toBeNull()

    const chestPainRow = screen.getByRole('button', { name: 'Load Chest Pain' })
    await user.click(chestPainRow)
    await waitFor(() => expect(onLoad).toHaveBeenCalledWith(expect.objectContaining({ id: 'scenario-1' })))
    expect(screen.getByRole('button', { name: 'Unload Chest Pain' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: 'Unload Chest Pain' }))
    expect(onUnload).toHaveBeenCalledOnce()
  })

  it('supports keyboard loading and keeps nested order controls from activating the row', async () => {
    createFetchMock()
    const onLoad = vi.fn()
    const user = userEvent.setup()
    render(<Harness onLoad={onLoad} />)
    await user.click(await screen.findByRole('button', { name: /General/ }))
    const row = await screen.findByRole('button', { name: 'Load Chest Pain' })

    row.focus()
    await user.keyboard('{Enter}')
    await waitFor(() => expect(onLoad).toHaveBeenCalledOnce())

    onLoad.mockClear()
    await user.click(screen.getByRole('button', { name: 'Move Older Call up' }))
    expect(onLoad).not.toHaveBeenCalled()
  })

  it('opens folders independently and allows every folder to be closed', async () => {
    createFetchMock()
    const user = userEvent.setup()
    render(<Harness />)

    const general = await screen.findByRole('button', { name: /General/ })
    const trauma = screen.getByRole('button', { name: /Trauma/ })
    expect(general).toHaveAttribute('aria-expanded', 'false')
    expect(trauma).toHaveAttribute('aria-expanded', 'false')

    await user.click(general)
    await screen.findByRole('region', { name: 'General scenarios' })
    await user.click(trauma)

    expect(general).toHaveAttribute('aria-expanded', 'true')
    expect(trauma).toHaveAttribute('aria-expanded', 'true')
    expect(general).not.toHaveAttribute('aria-current')
    expect(trauma).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('region', { name: 'General scenarios' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Trauma scenarios' })).toBeInTheDocument()

    await user.click(trauma)
    await user.click(general)
    expect(general).toHaveAttribute('aria-expanded', 'false')
    expect(trauma).toHaveAttribute('aria-expanded', 'false')
    expect(trauma).toHaveAttribute('aria-current', 'true')
    expect(screen.queryByRole('region', { name: /scenarios$/ })).toBeNull()
  })

  it('opens and selects a newly created folder', async () => {
    createFetchMock()
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(await screen.findByRole('button', { name: 'New Folder' }))
    await user.type(screen.getByLabelText('New folder name'), 'Airway')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    const airway = await screen.findByRole('button', { name: /Airway/ })
    expect(airway).toHaveAttribute('aria-expanded', 'true')
    expect(airway).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('region', { name: 'Airway scenarios' })).toBeInTheDocument()
  })

  it('persists Up/Down and drag ordering optimistically', async () => {
    const { fetchMock } = createFetchMock()
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(await screen.findByRole('button', { name: /General/ }))
    await screen.findByText('Chest Pain')

    await user.click(screen.getByRole('button', { name: 'Move Older Call up' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      '/api/scenario-folders/general/order',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ scenarioIds: ['scenario-2', 'scenario-1'] }),
      }),
    ))

    const rows = screen.getAllByRole('button', { name: /^(Load|Unload) / })
    const data = new Map<string, string>()
    const dataTransfer = {
      effectAllowed: 'none',
      setData: (type: string, value: string) => data.set(type, value),
      getData: (type: string) => data.get(type) ?? '',
    }
    fireEvent.dragStart(rows[0], { dataTransfer })
    fireEvent.dragOver(rows[1], { dataTransfer, clientY: 100 })
    fireEvent.drop(rows[1], { dataTransfer, clientY: 100 })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      '/api/scenario-folders/general/order',
      expect.objectContaining({ method: 'PATCH' }),
    ))
  })

  it('moves a scenario to another folder and appends through the existing fallback', async () => {
    const { fetchMock } = createFetchMock()
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(await screen.findByRole('button', { name: /General/ }))
    await screen.findByText('Chest Pain')
    await user.click(screen.getByRole('button', { name: /Trauma/ }))

    await user.selectOptions(screen.getByLabelText('Move Chest Pain'), 'trauma')
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      '/api/scenarios/scenario-1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ folderId: 'trauma' }),
      }),
    ))
    const traumaSection = screen.getByRole('button', { name: /Trauma/ })
      .closest('section') as HTMLElement
    expect(await within(traumaSection).findByRole('button', { name: 'Load Chest Pain' }))
      .toBeInTheDocument()
    const generalSection = screen.getByRole('button', { name: /General/ })
      .closest('section') as HTMLElement
    expect(within(generalSection).queryByRole('button', { name: 'Load Chest Pain' })).toBeNull()
  })

  it('deletes empty folders without prompting and confirms cascade deletion for non-empty folders', async () => {
    const { fetchMock } = createFetchMock()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const onFolderDeleted = vi.fn()
    const user = userEvent.setup()
    render(<Harness onFolderDeleted={onFolderDeleted} />)
    await user.click(await screen.findByRole('button', { name: /General/ }))
    await screen.findByText('Chest Pain')

    const generalSection = screen.getByRole('button', { name: /General/ }).closest('section') as HTMLElement
    await user.click(within(generalSection).getByRole('button', { name: 'Delete' }))
    expect(confirm).toHaveBeenCalledWith(
      'Delete "General" and its 2 scenarios? This cannot be undone.',
    )
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      '/api/scenario-folders/general',
      { method: 'DELETE' },
    ))
    await waitFor(() => expect(onFolderDeleted).toHaveBeenCalledWith('general'))
    expect(screen.getByRole('button', { name: /Trauma/ })).toHaveAttribute('aria-current', 'true')

    const traumaSection = screen.getByRole('button', { name: /Trauma/ }).closest('section') as HTMLElement
    await user.click(within(traumaSection).getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      '/api/scenario-folders/trauma',
      { method: 'DELETE' },
    ))
    expect(confirm).toHaveBeenCalledOnce()
  })

  it('renders the empty-library save guidance', async () => {
    createFetchMock({ empty: true })
    render(<Harness />)

    expect(await screen.findByText('No scenario folders. Saving a scenario will create Folder 1.')).toBeInTheDocument()
  })
})
