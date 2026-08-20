import { beforeEach, describe, expect, it, vi } from 'vitest'

const reorderSavedScenarios = vi.hoisted(() => vi.fn())

vi.mock('@/server/scenarios/access', () => ({
  requireScenarioLibraryAccess: vi.fn(),
}))
vi.mock('@/server/scenarios/service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/server/scenarios/service')>()),
  reorderSavedScenarios,
}))

import { PATCH } from '../route'

describe('scenario folder order route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('validates and persists the complete ordered scenario id list', async () => {
    const context = { params: Promise.resolve({ id: 'general' }) }
    const invalid = await PATCH(new Request('http://localhost/api/scenario-folders/general/order', {
      method: 'PATCH',
      body: JSON.stringify({ scenarioIds: ['one', 2] }),
    }), context)
    expect(invalid.status).toBe(400)

    reorderSavedScenarios.mockResolvedValue([
      { id: 'two', folder_id: 'general', position: 1 },
      { id: 'one', folder_id: 'general', position: 2 },
    ])
    const reordered = await PATCH(new Request('http://localhost/api/scenario-folders/general/order', {
      method: 'PATCH',
      body: JSON.stringify({ scenarioIds: ['two', 'one'] }),
    }), context)

    expect(reordered.status).toBe(200)
    expect(await reordered.json()).toEqual({
      scenarios: [
        { id: 'two', folder_id: 'general', position: 1 },
        { id: 'one', folder_id: 'general', position: 2 },
      ],
    })
    expect(reorderSavedScenarios).toHaveBeenCalledWith('general', ['two', 'one'])
  })
})
