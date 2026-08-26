import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { createEmptyScenarioSnapshot } from '@/lib/scenarioSnapshot'
import { useMonitorStore } from '@/store/monitorStore'
import type { SavedScenario } from '@/types/savedScenario'

import AdminPage from '@/components/instructor/AdminPage'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/admin',
}))

const general = {
  id: 'general',
  name: 'General',
  scenario_count: 1,
  created_at: '2026-08-18T10:00:00.000Z',
  updated_at: '2026-08-18T10:00:00.000Z',
}

function savedScenario(): SavedScenario {
  const snapshot = createEmptyScenarioSnapshot()
  snapshot.autoSortText = 'ADDRESS: 123 Rue Principale\nHR: 145'
  snapshot.monitor.draft.hr = 145
  snapshot.monitor.draftVitalActive.hr = true
  snapshot.callerInfo.address = '123 Rue Principale'
  snapshot.callerInfo.extra1Label = 'Unit'
  snapshot.callerInfo.extra1 = 'Medic 42'
  snapshot.dispatch.minutes = 4
  snapshot.patientInformation.selected.sample = ['S']
  snapshot.patientInformation.values.sample.S = 'Chest pain'
  snapshot.patientPhysical.selected = ['front-chest']
  snapshot.patientPhysical.findings = { 'front-chest': 'Tenderness' }
  return {
    id: 'scenario-1',
    folder_id: 'general',
    scenario_number: 1,
    title: 'Chest Pain',
    position: 1,
    snapshot,
    created_at: '2026-08-18T10:00:00.000Z',
    updated_at: '2026-08-18T12:00:00.000Z',
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function scenarioSummary(scenario: SavedScenario) {
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

describe('AdminPage scenario library integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    useMonitorStore.getState().reset()
  })

  it('loads all four authoring areas, stages only, and saves a manual FC edit', async () => {
    const stored = savedScenario()
    const fetchMock = vi.spyOn(window, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      if (url === '/api/scenario-folders') return jsonResponse({ folders: [general] })
      if (url === '/api/scenarios?folderId=general') {
        return jsonResponse({ scenarios: [scenarioSummary(stored)] })
      }
      if (url === '/api/scenarios/scenario-1' && method === 'GET') {
        return jsonResponse({ scenario: stored })
      }
      if (url === '/api/scenarios/scenario-1' && method === 'PATCH') {
        const body = JSON.parse(String(init?.body)) as {
          title: string
          snapshot: SavedScenario['snapshot']
        }
        return jsonResponse({ scenario: { ...stored, title: body.title, snapshot: body.snapshot } })
      }
      return jsonResponse({ error: `Unhandled ${method} ${url}` }, 500)
    })
    const user = userEvent.setup()
    render(<AdminPage />)

    await waitFor(() => expect(screen.getByText('Chest Pain')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Load Chest Pain' }))
    await user.click(screen.getByRole('button', { name: 'Expand Caller Info' }))

    await waitFor(() => expect(screen.getByLabelText('Scenario title')).toHaveValue('Chest Pain'))
    expect(screen.getByLabelText('Auto-sort scenario')).toHaveValue(stored.snapshot.autoSortText)
    expect(screen.getByLabelText('Adresse')).toHaveValue('123 Rue Principale')
    expect(screen.getByLabelText('Extra 1 title')).toHaveValue('Unit')
    expect(screen.getByRole('button', { name: 'Save Scenario' })).toBeDisabled()
    expect(useMonitorStore.getState().draft.hr).toBe(145)
    expect(useMonitorStore.getState().confirmed.hr).toBe(0)

    const title = screen.getByLabelText('Scenario title')
    await user.type(title, ' edited')
    expect(screen.getByRole('button', { name: 'Save Scenario' })).toBeEnabled()
    await user.clear(title)
    await user.type(title, 'Chest Pain')
    expect(screen.getByRole('button', { name: 'Save Scenario' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Monitor & Patient SNS' }))
    expect(screen.getByLabelText('Sample S information')).toHaveValue('Chest pain')
    expect(
      within(screen.getByRole('region', { name: 'Sample' })).getByRole('button', { name: 'S' }),
    ).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: 'Patient Physical' }))
    expect(screen.getByRole('button', { name: 'Front chest' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: 'Monitor & Patient SNS' }))
    const fc = screen.getByLabelText('FC')
    await user.clear(fc)
    await user.type(fc, '160')
    await user.click(screen.getByRole('button', { name: 'Scenarios' }))
    await user.click(screen.getByRole('button', { name: 'Expand Caller Info' }))
    expect(screen.getByRole('button', { name: 'Save Scenario' })).toBeEnabled()

    const confirmDiscard = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await user.click(screen.getByRole('button', { name: 'Unload Chest Pain' }))
    await waitFor(() => expect(confirmDiscard).toHaveBeenCalledWith(
      'Discard unsaved scenario changes and unload this scenario?',
    ))
    await user.click(screen.getByRole('button', { name: 'Monitor & Patient SNS' }))
    expect(screen.getByLabelText('FC')).toHaveValue(160)
    await user.click(screen.getByRole('button', { name: 'Scenarios' }))
    await user.click(screen.getByRole('button', { name: 'Expand Caller Info' }))

    await user.click(screen.getByRole('button', { name: 'Save Scenario' }))

    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(
        ([url, init]) => String(url) === '/api/scenarios/scenario-1' && init?.method === 'PATCH',
      )
      expect(patchCall).toBeDefined()
      const body = JSON.parse(String(patchCall?.[1]?.body))
      expect(body.snapshot.monitor.draft.hr).toBe(160)
    })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save Scenario' })).toBeDisabled())
    expect(useMonitorStore.getState().confirmed.hr).toBe(0)
  })

  it('creates a blank-title fallback and deletes it while retaining the draft', async () => {
    let stored: SavedScenario | null = null
    const fetchMock = vi.spyOn(window, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      if (url === '/api/scenario-folders') {
        return jsonResponse({ folders: [{ ...general, scenario_count: stored ? 1 : 0 }] })
      }
      if (url === '/api/scenarios?folderId=general') {
        if (!stored) return jsonResponse({ scenarios: [] })
        return jsonResponse({ scenarios: [scenarioSummary(stored)] })
      }
      if (url === '/api/scenarios' && method === 'POST') {
        const body = JSON.parse(String(init?.body)) as { snapshot: SavedScenario['snapshot'] }
        stored = {
          ...savedScenario(),
          title: 'Scenario 1',
          snapshot: body.snapshot,
        }
        return jsonResponse({ scenario: stored }, 201)
      }
      if (url === '/api/scenarios/scenario-1' && method === 'DELETE') {
        stored = null
        return new Response(null, { status: 204 })
      }
      return jsonResponse({ error: `Unhandled ${method} ${url}` }, 500)
    })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    render(<AdminPage />)
    await waitFor(() => expect(screen.getByRole('button', { name: /General/ })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Expand Caller Info' }))

    expect(screen.getByRole('button', { name: 'Save Scenario' })).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Auto-sort scenario'), {
      target: { value: 'ADDRESS: 55 Main Street\nHR: 120' },
    })
    expect(screen.getByRole('button', { name: 'Save Scenario' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Save Scenario' }))

    await waitFor(() => expect(screen.getByLabelText('Scenario title')).toHaveValue('Scenario 1'))
    expect(screen.getByRole('button', { name: 'Save Scenario' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Delete Scenario' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Delete Scenario' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      '/api/scenarios/scenario-1',
      { method: 'DELETE' },
    ))
    expect(screen.getByLabelText('Auto-sort scenario')).toHaveValue('ADDRESS: 55 Main Street\nHR: 120')
    expect(screen.getByRole('button', { name: 'Delete Scenario' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Save Scenario' })).toBeEnabled()
  })

  it('auto-creates Folder 1 and saves when the scenario library is empty', async () => {
    let created: SavedScenario | null = null
    const autoFolder = {
      ...general,
      id: 'folder-1',
      name: 'Folder 1',
      scenario_count: 1,
    }
    const fetchMock = vi.spyOn(window, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      if (url === '/api/scenario-folders') {
        return jsonResponse({ folders: created ? [autoFolder] : [] })
      }
      if (url === '/api/scenarios?folderId=folder-1') {
        return jsonResponse({ scenarios: created ? [scenarioSummary(created)] : [] })
      }
      if (url === '/api/scenarios' && method === 'POST') {
        const body = JSON.parse(String(init?.body)) as {
          autoCreateFolder?: boolean
          snapshot: SavedScenario['snapshot']
        }
        created = {
          ...savedScenario(),
          folder_id: 'folder-1',
          title: 'Scenario 1',
          snapshot: body.snapshot,
        }
        return jsonResponse({ scenario: created }, 201)
      }
      return jsonResponse({ error: `Unhandled ${method} ${url}` }, 500)
    })
    const user = userEvent.setup()
    render(<AdminPage />)

    expect(await screen.findByText('No scenario folders. Saving a scenario will create Folder 1.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Expand Caller Info' }))
    fireEvent.change(screen.getByLabelText('Auto-sort scenario'), {
      target: { value: 'ADDRESS: 55 Main Street\nHR: 120' },
    })
    expect(screen.getByRole('button', { name: 'Save Scenario' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Save Scenario' }))

    await waitFor(() => {
      const createCall = fetchMock.mock.calls.find(
        ([url, init]) => String(url) === '/api/scenarios' && init?.method === 'POST',
      )
      expect(createCall).toBeDefined()
      expect(JSON.parse(String(createCall?.[1]?.body))).toMatchObject({
        autoCreateFolder: true,
      })
    })
    expect(await screen.findByRole('button', { name: /Folder 1/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(screen.getByLabelText('Scenario title')).toHaveValue('Scenario 1')
  })

  it('cascade-deleting the loaded folder clears authoring drafts without changing confirmed state', async () => {
    const stored = savedScenario()
    let deleted = false
    vi.spyOn(window, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      if (url === '/api/scenario-folders') {
        return jsonResponse({ folders: deleted ? [] : [general] })
      }
      if (url === '/api/scenarios?folderId=general') {
        return jsonResponse({ scenarios: deleted ? [] : [scenarioSummary(stored)] })
      }
      if (url === '/api/scenarios/scenario-1' && method === 'GET') {
        return jsonResponse({ scenario: stored })
      }
      if (url === '/api/scenario-folders/general' && method === 'DELETE') {
        deleted = true
        return new Response(null, { status: 204 })
      }
      return jsonResponse({ error: `Unhandled ${method} ${url}` }, 500)
    })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    useMonitorStore.getState().setDraftVitalValues({ hr: 99 })
    useMonitorStore.getState().save()
    useMonitorStore.getState().send()
    const user = userEvent.setup()
    render(<AdminPage />)

    await user.click(await screen.findByRole('button', { name: 'Load Chest Pain' }))
    await user.click(screen.getByRole('button', { name: 'Expand Caller Info' }))
    await waitFor(() => expect(useMonitorStore.getState().draft.hr).toBe(145))
    expect(useMonitorStore.getState().confirmed.hr).toBe(99)

    const generalSection = screen.getByRole('button', { name: /General/ }).closest('section') as HTMLElement
    await user.click(within(generalSection).getByRole('button', { name: 'Delete' }))

    await user.click(await screen.findByRole('button', { name: 'Expand Caller Info' }))
    await waitFor(() => expect(screen.getByLabelText('Scenario title')).toHaveValue(''))
    expect(useMonitorStore.getState().draft.hr).toBe(0)
    expect(useMonitorStore.getState().confirmed.hr).toBe(99)
    expect(screen.getByLabelText('Auto-sort scenario')).toHaveValue('')
    expect(await screen.findByText('No scenario folders. Saving a scenario will create Folder 1.')).toBeInTheDocument()
  })
})
