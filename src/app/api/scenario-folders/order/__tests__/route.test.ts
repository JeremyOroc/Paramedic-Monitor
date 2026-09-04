import { beforeEach, describe, expect, it, vi } from 'vitest'

const reorderScenarioFolders = vi.hoisted(() => vi.fn())

vi.mock('@/server/scenarios/access', () => ({
  requireScenarioLibraryAccess: vi.fn(),
}))
vi.mock('@/server/scenarios/service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/server/scenarios/service')>()),
  reorderScenarioFolders,
}))

import { PATCH } from '../route'

describe('global scenario folder order route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('validates and persists the complete ordered folder id list', async () => {
    const invalid = await PATCH(new Request('http://localhost/api/scenario-folders/order', {
      method: 'PATCH',
      body: JSON.stringify({ folderIds: ['one', 2] }),
    }))
    expect(invalid.status).toBe(400)

    reorderScenarioFolders.mockResolvedValue([
      { id: 'two', name: 'Two', position: 1, scenario_count: 0 },
      { id: 'one', name: 'One', position: 2, scenario_count: 1 },
    ])
    const reordered = await PATCH(new Request('http://localhost/api/scenario-folders/order', {
      method: 'PATCH',
      body: JSON.stringify({ folderIds: ['two', 'one'] }),
    }))

    expect(reordered.status).toBe(200)
    expect(await reordered.json()).toEqual({
      folders: [
        { id: 'two', name: 'Two', position: 1, scenario_count: 0 },
        { id: 'one', name: 'One', position: 2, scenario_count: 1 },
      ],
    })
    expect(reorderScenarioFolders).toHaveBeenCalledWith(['two', 'one'])
  })
})
