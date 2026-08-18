import { beforeEach, describe, expect, it, vi } from 'vitest'

const scenarioService = vi.hoisted(() => ({
  listScenarioFolders: vi.fn(),
  createScenarioFolder: vi.fn(),
  renameScenarioFolder: vi.fn(),
  deleteScenarioFolder: vi.fn(),
}))

vi.mock('@/server/scenarios/access', () => ({
  requireScenarioLibraryAccess: vi.fn(),
}))
vi.mock('@/server/scenarios/service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/server/scenarios/service')>()),
  ...scenarioService,
}))

import { DELETE, PATCH } from '../[id]/route'
import { GET, POST } from '../route'

describe('scenario folder routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists and creates folders through the typed service boundary', async () => {
    scenarioService.listScenarioFolders.mockResolvedValue([{ id: 'general', name: 'General' }])
    scenarioService.createScenarioFolder.mockResolvedValue({ id: 'cardiac', name: 'Cardiac' })

    const list = await GET(new Request('http://localhost/api/scenario-folders'))
    const create = await POST(new Request('http://localhost/api/scenario-folders', {
      method: 'POST',
      body: JSON.stringify({ name: ' Cardiac ' }),
    }))

    expect(await list.json()).toEqual({ folders: [{ id: 'general', name: 'General' }] })
    expect(create.status).toBe(201)
    expect(scenarioService.createScenarioFolder).toHaveBeenCalledWith(' Cardiac ')
  })

  it('validates names and routes rename/delete operations', async () => {
    const invalid = await POST(new Request('http://localhost/api/scenario-folders', {
      method: 'POST',
      body: JSON.stringify({ name: 10 }),
    }))
    expect(invalid.status).toBe(400)

    scenarioService.renameScenarioFolder.mockResolvedValue({ id: 'trauma', name: 'Major Trauma' })
    scenarioService.deleteScenarioFolder.mockResolvedValue('general')
    const context = { params: Promise.resolve({ id: 'trauma' }) }
    const renamed = await PATCH(new Request('http://localhost/api/scenario-folders/trauma', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Major Trauma' }),
    }), context)
    const deleted = await DELETE(
      new Request('http://localhost/api/scenario-folders/trauma', { method: 'DELETE' }),
      context,
    )

    expect(await renamed.json()).toEqual({ folder: { id: 'trauma', name: 'Major Trauma' } })
    expect(await deleted.json()).toEqual({ generalFolderId: 'general' })
  })
})
