import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createEmptyScenarioSnapshot } from '@/lib/scenarioSnapshot'

import {
  createSavedScenario,
  createScenarioFolder,
  deleteScenarioFolder,
  getSavedScenario,
  listSavedScenarios,
  listScenarioFolders,
  renameScenarioFolder,
  reorderSavedScenarios,
  updateSavedScenario,
} from '../service'

const createServiceClient = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/server', () => ({ createServiceClient }))

type QueryError = { code?: string; message: string } | null
type QueryResult<T> = { data: T; error: QueryError }

class QueryBuilder<T> implements PromiseLike<QueryResult<T>> {
  select = vi.fn(() => this)
  insert = vi.fn(() => this)
  update = vi.fn(() => this)
  delete = vi.fn(() => this)
  eq = vi.fn(() => this)
  order = vi.fn(() => this)
  single = vi.fn(() => this)
  maybeSingle = vi.fn(() => this)

  constructor(private readonly result: QueryResult<T>) {}

  then<TResult1 = QueryResult<T>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.result).then(onfulfilled, onrejected)
  }
}

function mockClient(builders: QueryBuilder<unknown>[]) {
  let builderIndex = 0
  const client = {
    from: vi.fn(() => builders[builderIndex++]),
    rpc: vi.fn(),
  }
  createServiceClient.mockReturnValue(client as never)
  return client
}

const timestamp = '2026-08-18T12:00:00.000Z'
const general = {
  id: 'general',
  name: 'General',
  created_at: timestamp,
  updated_at: timestamp,
}

const scenario = {
  id: 'scenario-3',
  folder_id: 'general',
  scenario_number: 3,
  title: 'Scenario 3',
  position: 1,
  snapshot: createEmptyScenarioSnapshot(),
  created_at: timestamp,
  updated_at: timestamp,
}

describe('scenario library service', () => {
  beforeEach(() => {
    createServiceClient.mockReset()
  })

  it('sorts every folder case-insensitively and adds counts', async () => {
    mockClient([
      new QueryBuilder({
        data: [
          { ...general, id: 'zebra', name: 'zebra' },
          { ...general, id: 'alpha', name: 'Alpha' },
          general,
        ],
        error: null,
      }),
      new QueryBuilder({
        data: [{ folder_id: 'alpha' }, { folder_id: 'alpha' }, { folder_id: 'general' }],
        error: null,
      }),
    ])

    const folders = await listScenarioFolders()

    expect(folders.map((folder) => folder.name)).toEqual(['Alpha', 'General', 'zebra'])
    expect(folders.map((folder) => folder.scenario_count)).toEqual([2, 1, 0])
  })

  it('maps case-insensitive folder uniqueness failures to a conflict', async () => {
    const insert = new QueryBuilder({
      data: null,
      error: { code: '23505', message: 'duplicate key value' },
    })
    mockClient([insert])

    await expect(createScenarioFolder('  GENERAL  ')).rejects.toMatchObject({
      status: 409,
      message: 'A folder with that name already exists',
    })
    expect(insert.insert).toHaveBeenCalledWith({ name: 'GENERAL' })
  })

  it('allows the former General folder to be renamed', async () => {
    const lookup = new QueryBuilder({ data: general, error: null })
    const updated = new QueryBuilder({
      data: { ...general, name: 'Renamed' },
      error: null,
    })
    mockClient([lookup, updated])

    await expect(renameScenarioFolder('general', 'Renamed')).resolves.toMatchObject({
      name: 'Renamed',
    })
    expect(updated.update).toHaveBeenCalledWith({ name: 'Renamed' })
  })

  it('requests persisted position ordering with scenario number as a stable tie-breaker', async () => {
    const folderLookup = new QueryBuilder({ data: general, error: null })
    const scenarioList = new QueryBuilder({ data: [scenario], error: null })
    mockClient([folderLookup, scenarioList])

    await expect(listSavedScenarios('general')).resolves.toMatchObject([
      { id: 'scenario-3', scenario_number: 3 },
    ])
    expect(scenarioList.order).toHaveBeenNthCalledWith(1, 'position', { ascending: true })
    expect(scenarioList.order).toHaveBeenNthCalledWith(2, 'scenario_number', { ascending: true })
  })

  it('rejects malformed stored snapshots at the service boundary', async () => {
    mockClient([
      new QueryBuilder({
        data: { ...scenario, snapshot: { version: 2 } },
        error: null,
      }),
    ])

    await expect(getSavedScenario('scenario-3')).rejects.toMatchObject({
      status: 500,
      message: 'Scenario scenario-3 contains an invalid snapshot',
    })
  })

  it('uses the record-reserved scenario number when an updated title is blank', async () => {
    const current = new QueryBuilder({ data: scenario, error: null })
    const updated = new QueryBuilder({ data: scenario, error: null })
    mockClient([current, updated])

    await updateSavedScenario('scenario-3', { title: '   ' })

    expect(updated.update).toHaveBeenCalledWith({ title: 'Scenario 3' })
  })

  it('deletes any folder directly so the foreign key can cascade its scenarios', async () => {
    const deleted = new QueryBuilder({ data: { id: 'general' }, error: null })
    mockClient([deleted])

    await expect(deleteScenarioFolder('general')).resolves.toBeUndefined()
    expect(deleted.delete).toHaveBeenCalledOnce()
    expect(deleted.eq).toHaveBeenCalledWith('id', 'general')
  })

  it('uses the atomic auto-folder RPC only when no folder is supplied', async () => {
    const client = mockClient([])
    client.rpc.mockResolvedValue({ data: scenario, error: null })

    await expect(
      createSavedScenario(null, '', createEmptyScenarioSnapshot()),
    ).resolves.toMatchObject({ id: 'scenario-3', position: 1 })
    expect(client.rpc).toHaveBeenCalledWith('create_saved_scenario_with_auto_folder', {
      requested_title: '',
      scenario_snapshot: createEmptyScenarioSnapshot(),
    })
  })

  it('moves scenarios through the append RPC and persists complete folder order', async () => {
    const current = new QueryBuilder({ data: scenario, error: null })
    const client = mockClient([current])
    client.rpc
      .mockResolvedValueOnce({
        data: { ...scenario, folder_id: 'trauma', position: 4 },
        error: null,
      })
      .mockResolvedValueOnce({
        data: [
          { ...scenario, id: 'scenario-2', position: 1 },
          { ...scenario, position: 2 },
        ],
        error: null,
      })

    await expect(updateSavedScenario('scenario-3', { folderId: 'trauma' })).resolves.toMatchObject({
      folder_id: 'trauma',
      position: 4,
    })
    await expect(
      reorderSavedScenarios('trauma', ['scenario-2', 'scenario-3']),
    ).resolves.toMatchObject([{ id: 'scenario-2', position: 1 }, { id: 'scenario-3', position: 2 }])
    expect(client.rpc).toHaveBeenNthCalledWith(1, 'move_saved_scenario', {
      scenario_to_move: 'scenario-3',
      target_folder: 'trauma',
    })
    expect(client.rpc).toHaveBeenNthCalledWith(2, 'reorder_saved_scenarios', {
      folder_to_reorder: 'trauma',
      ordered_scenario_ids: ['scenario-2', 'scenario-3'],
    })
  })
})
