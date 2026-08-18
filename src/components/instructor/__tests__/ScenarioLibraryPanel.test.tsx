import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { createEmptyScenarioSnapshot } from '@/lib/scenarioSnapshot'
import type { SavedScenario, ScenarioFolder } from '@/types/savedScenario'

import { ScenarioLibraryPanel } from '../ScenarioLibraryPanel'

const general: ScenarioFolder = {
  id: 'general',
  name: 'General',
  is_general: true,
  scenario_count: 2,
  created_at: '2026-08-18T10:00:00.000Z',
  updated_at: '2026-08-18T10:00:00.000Z',
}
const trauma: ScenarioFolder = {
  id: 'trauma',
  name: 'Trauma',
  is_general: false,
  scenario_count: 0,
  created_at: '2026-08-18T10:00:00.000Z',
  updated_at: '2026-08-18T10:00:00.000Z',
}
const scenario: SavedScenario = {
  id: 'scenario-1',
  folder_id: 'general',
  scenario_number: 1,
  title: 'Chest Pain',
  snapshot: createEmptyScenarioSnapshot(),
  created_at: '2026-08-18T10:00:00.000Z',
  updated_at: '2026-08-18T12:00:00.000Z',
}
const olderScenario: SavedScenario = {
  ...scenario,
  id: 'scenario-2',
  scenario_number: 2,
  title: 'Older Call',
  updated_at: '2026-08-18T11:00:00.000Z',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function createFetchMock() {
  const folders = [general, trauma]
  const scenarios = [scenario, olderScenario]
  return vi.spyOn(window, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    if (url === '/api/scenario-folders' && method === 'GET') {
      return jsonResponse({ folders })
    }
    if (url.startsWith('/api/scenarios?folderId=')) {
      const folderId = new URL(url, 'http://localhost').searchParams.get('folderId')
      return jsonResponse({
        scenarios: scenarios
          .filter((item) => item.folder_id === folderId)
          .map((item) => ({
            id: item.id,
            folder_id: item.folder_id,
            scenario_number: item.scenario_number,
            title: item.title,
            created_at: item.created_at,
            updated_at: item.updated_at,
          })),
      })
    }
    if (url === '/api/scenarios/scenario-1' && method === 'GET') {
      return jsonResponse({ scenario })
    }
    if (url === '/api/scenarios/scenario-1' && method === 'PATCH') {
      const body = JSON.parse(String(init?.body)) as { folderId: string }
      scenario.folder_id = body.folderId
      return jsonResponse({ scenario })
    }
    if (url === '/api/scenario-folders' && method === 'POST') {
      const body = JSON.parse(String(init?.body)) as { name: string }
      const folder = { ...trauma, id: 'new-folder', name: body.name }
      folders.push(folder)
      return jsonResponse({ folder }, 201)
    }
    if (url === '/api/scenario-folders/trauma' && method === 'PATCH') {
      const body = JSON.parse(String(init?.body)) as { name: string }
      trauma.name = body.name
      return jsonResponse({ folder: trauma })
    }
    if (url === '/api/scenario-folders/trauma' && method === 'DELETE') {
      return jsonResponse({ generalFolderId: 'general' })
    }
    return jsonResponse({ error: `Unhandled ${method} ${url}` }, 500)
  })
}

function Harness({ onLoad }: { onLoad: (value: SavedScenario) => void }) {
  const [selectedFolderId, setSelectedFolderId] = useState('general')
  const [loadedScenarioId, setLoadedScenarioId] = useState<string | null>(null)
  return (
    <ScenarioLibraryPanel
      selectedFolderId={selectedFolderId}
      loadedScenarioId={loadedScenarioId}
      refreshVersion={0}
      onSelectedFolderChange={setSelectedFolderId}
      onLoadScenario={(value) => {
        setLoadedScenarioId(value.id)
        onLoad(value)
      }}
    />
  )
}

describe('ScenarioLibraryPanel', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    scenario.folder_id = 'general'
    trauma.name = 'Trauma'
  })

  it('renders General first, locks its controls, orders scenarios, and loads a row', async () => {
    createFetchMock()
    const onLoad = vi.fn()
    const user = userEvent.setup()
    render(<Harness onLoad={onLoad} />)

    await waitFor(() => expect(screen.getByRole('button', { name: /General/ })).toHaveAttribute('aria-expanded', 'true'))
    const folderButtons = screen.getAllByRole('button').filter((button) =>
      /General|Trauma/.test(button.textContent ?? '') && button.hasAttribute('aria-expanded'),
    )
    expect(folderButtons.map((button) => button.textContent)).toEqual([
      expect.stringContaining('General'),
      expect.stringContaining('Trauma'),
    ])
    expect(screen.getByTestId('scenario-folder-scroll')).toHaveClass('max-h-96', 'overflow-y-auto')
    expect(screen.queryByLabelText('Rename General')).toBeNull()
    const generalRegion = screen.getByLabelText('General scenarios')
    expect((generalRegion.textContent ?? '').indexOf('Chest Pain')).toBeLessThan(
      (generalRegion.textContent ?? '').indexOf('Older Call'),
    )

    await user.click(within(generalRegion).getAllByRole('button', { name: 'Load' })[0])
    await waitFor(() => expect(onLoad).toHaveBeenCalledWith(scenario))
  })

  it('creates, renames, deletes, and moves folders without requiring scenario Save', async () => {
    const fetchMock = createFetchMock()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    render(<Harness onLoad={vi.fn()} />)

    await waitFor(() => expect(screen.getByText('Chest Pain')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'New Folder' }))
    await user.type(screen.getByLabelText('New folder name'), 'Cardiac')
    await user.click(screen.getByRole('button', { name: 'Create' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/scenario-folders', expect.objectContaining({ method: 'POST' })))

    await user.click(screen.getByRole('button', { name: /General/ }))
    await waitFor(() => expect(screen.getByText('Chest Pain')).toBeInTheDocument())
    await user.selectOptions(screen.getByLabelText('Move Chest Pain'), 'trauma')
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/scenarios/scenario-1', expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ folderId: 'trauma' }),
      }))
    })

    const traumaSection = screen.getByRole('button', { name: /Trauma/ }).closest('section') as HTMLElement
    await user.click(within(traumaSection).getByRole('button', { name: 'Rename' }))
    const rename = screen.getByLabelText('Rename Trauma')
    await user.clear(rename)
    await user.type(rename, 'Major Trauma')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.getByRole('button', { name: /Major Trauma/ })).toBeInTheDocument())

    const renamedSection = screen.getByRole('button', { name: /Major Trauma/ }).closest('section') as HTMLElement
    await user.click(within(renamedSection).getByRole('button', { name: 'Delete' }))
    expect(window.confirm).toHaveBeenCalledWith(
      'Delete "Major Trauma"? Its scenarios will move to General.',
    )
  })

  it('supports dropping a draggable scenario on a closed folder header', async () => {
    const fetchMock = createFetchMock()
    render(<Harness onLoad={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('Chest Pain')).toBeInTheDocument())

    const row = screen.getByText('Chest Pain').closest('[draggable="true"]') as HTMLElement
    const target = screen.getByRole('button', { name: /Trauma/ }).closest('section') as HTMLElement
    const data = new Map<string, string>()
    const dataTransfer = {
      effectAllowed: 'none',
      setData: (type: string, value: string) => data.set(type, value),
      getData: (type: string) => data.get(type) ?? '',
    }

    fireEvent.dragStart(row, { dataTransfer })
    fireEvent.drop(target, { dataTransfer })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      '/api/scenarios/scenario-1',
      expect.objectContaining({ method: 'PATCH' }),
    ))
  })
})
