import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createEmptyScenarioSnapshot } from '@/lib/scenarioSnapshot'

const scenarioService = vi.hoisted(() => ({
  listSavedScenarios: vi.fn(),
  createSavedScenario: vi.fn(),
  getSavedScenario: vi.fn(),
  updateSavedScenario: vi.fn(),
  deleteSavedScenario: vi.fn(),
}))

vi.mock('@/server/scenarios/access', () => ({
  requireScenarioLibraryAccess: vi.fn(),
}))
vi.mock('@/server/scenarios/service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/server/scenarios/service')>()),
  ...scenarioService,
}))

import { DELETE, GET as GET_ONE, PATCH } from '../[id]/route'
import { GET, POST } from '../route'

const snapshot = createEmptyScenarioSnapshot()
const saved = {
  id: 'scenario-1',
  folder_id: 'general',
  scenario_number: 1,
  title: 'Scenario 1',
  snapshot,
  created_at: '2026-08-18T10:00:00.000Z',
  updated_at: '2026-08-18T10:00:00.000Z',
}

describe('saved scenario routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requires a folder for list/create and accepts a versioned snapshot', async () => {
    const missingFolder = await GET(new Request('http://localhost/api/scenarios'))
    expect(missingFolder.status).toBe(400)

    scenarioService.listSavedScenarios.mockResolvedValue([saved])
    const listed = await GET(new Request('http://localhost/api/scenarios?folderId=general'))
    expect(scenarioService.listSavedScenarios).toHaveBeenCalledWith('general')
    expect((await listed.json()).scenarios).toHaveLength(1)

    scenarioService.createSavedScenario.mockResolvedValue(saved)
    const created = await POST(new Request('http://localhost/api/scenarios', {
      method: 'POST',
      body: JSON.stringify({ folderId: 'general', title: '', snapshot }),
    }))
    expect(created.status).toBe(201)
    expect(scenarioService.createSavedScenario).toHaveBeenCalledWith('general', '', snapshot)

    const invalid = await POST(new Request('http://localhost/api/scenarios', {
      method: 'POST',
      body: JSON.stringify({ folderId: 'general', title: '', snapshot: { version: 2 } }),
    }))
    expect(invalid.status).toBe(400)
  })

  it('loads, patches, moves, and deletes a saved scenario', async () => {
    scenarioService.getSavedScenario.mockResolvedValue(saved)
    scenarioService.updateSavedScenario.mockResolvedValue({ ...saved, folder_id: 'trauma' })
    scenarioService.deleteSavedScenario.mockResolvedValue(undefined)
    const context = { params: Promise.resolve({ id: 'scenario-1' }) }

    const loaded = await GET_ONE(
      new Request('http://localhost/api/scenarios/scenario-1'),
      context,
    )
    expect((await loaded.json()).scenario.title).toBe('Scenario 1')

    await PATCH(new Request('http://localhost/api/scenarios/scenario-1', {
      method: 'PATCH',
      body: JSON.stringify({ folderId: 'trauma', title: 'Moved', snapshot }),
    }), context)
    expect(scenarioService.updateSavedScenario).toHaveBeenCalledWith('scenario-1', {
      folderId: 'trauma',
      title: 'Moved',
      snapshot,
    })

    const invalid = await PATCH(new Request('http://localhost/api/scenarios/scenario-1', {
      method: 'PATCH',
      body: JSON.stringify({ snapshot: { version: 9 } }),
    }), context)
    expect(invalid.status).toBe(400)

    const deleted = await DELETE(
      new Request('http://localhost/api/scenarios/scenario-1', { method: 'DELETE' }),
      context,
    )
    expect(deleted.status).toBe(204)
    expect(scenarioService.deleteSavedScenario).toHaveBeenCalledWith('scenario-1')
  })
})
