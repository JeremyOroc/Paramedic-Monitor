import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createEmptyScenarioSnapshot } from '@/lib/scenarioSnapshot'

import {
  createScenarioFolder,
  getSavedScenario,
  listSavedScenarios,
  listScenarioFolders,
  renameScenarioFolder,
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
  is_general: true,
  created_at: timestamp,
  updated_at: timestamp,
}

const scenario = {
  id: 'scenario-3',
  folder_id: 'general',
  scenario_number: 3,
  title: 'Scenario 3',
  snapshot: createEmptyScenarioSnapshot(),
  created_at: timestamp,
  updated_at: timestamp,
}

describe('scenario library service', () => {
  beforeEach(() => {
    createServiceClient.mockReset()
  })

  it('places General first, sorts custom folders case-insensitively, and adds counts', async () => {
    mockClient([
      new QueryBuilder({
        data: [
          { ...general, id: 'zebra', name: 'zebra', is_general: false },
          { ...general, id: 'alpha', name: 'Alpha', is_general: false },
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

    expect(folders.map((folder) => folder.name)).toEqual(['General', 'Alpha', 'zebra'])
    expect(folders.map((folder) => folder.scenario_count)).toEqual([1, 2, 0])
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

  it('rejects renaming the immutable General folder before issuing an update', async () => {
    const lookup = new QueryBuilder({ data: general, error: null })
    const client = mockClient([lookup])

    await expect(renameScenarioFolder('general', 'Renamed')).rejects.toMatchObject({
      status: 409,
      message: 'General folder cannot be renamed',
    })
    expect(client.from).toHaveBeenCalledTimes(1)
  })

  it('requests updated-first scenario ordering with scenario number as a stable tie-breaker', async () => {
    const folderLookup = new QueryBuilder({ data: general, error: null })
    const scenarioList = new QueryBuilder({ data: [scenario], error: null })
    mockClient([folderLookup, scenarioList])

    await expect(listSavedScenarios('general')).resolves.toMatchObject([
      { id: 'scenario-3', scenario_number: 3 },
    ])
    expect(scenarioList.order).toHaveBeenNthCalledWith(1, 'updated_at', { ascending: false })
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
})
