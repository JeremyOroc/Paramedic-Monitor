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
  reorderScenarioFolders,
  reorderSavedScenarios,
  updateSavedScenario,
} from '../service'

const createAuthenticatedClient = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/server', () => ({ createAuthenticatedClient }))

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
  createAuthenticatedClient.mockResolvedValue(client as never)
  return client
}

const timestamp = '2026-08-18T12:00:00.000Z'
const general = {
  id: 'general',
  name: 'General',
  library_kind: 'personal' as const,
  owner_user_id: 'user-1',
  position: 1,
  created_at: timestamp,
  updated_at: timestamp,
}

const account = {
  user_id: 'user-1',
  username: 'Instructor.One',
  email: 'one@example.test',
  role: 'instructor' as const,
  status: 'enabled' as const,
}

const administrator = {
  ...account,
  username: 'Jeremy',
  role: 'administrator' as const,
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
    createAuthenticatedClient.mockReset()
  })

  it('preserves persisted folder order and adds counts', async () => {
    mockClient([
      new QueryBuilder({
        data: [
          { ...general, id: 'zebra', name: 'zebra', position: 1 },
          { ...general, id: 'alpha', name: 'Alpha', position: 2 },
          { ...general, position: 3 },
        ],
        error: null,
      }),
      new QueryBuilder({
        data: [{ folder_id: 'alpha' }, { folder_id: 'alpha' }, { folder_id: 'general' }],
        error: null,
      }),
    ])

    const folders = await listScenarioFolders(account)

    expect(folders.map((folder) => folder.name)).toEqual(['zebra', 'Alpha', 'General'])
    expect(folders.map((folder) => folder.scenario_count)).toEqual([0, 2, 1])
  })

  it('maps case-insensitive folder uniqueness failures to a conflict', async () => {
    const insert = new QueryBuilder({
      data: null,
      error: { code: '23505', message: 'duplicate key value' },
    })
    mockClient([insert])

    await expect(createScenarioFolder(account, '  GENERAL  ', 'personal')).rejects.toMatchObject({
      status: 409,
      message: 'A folder with that name already exists',
    })
    expect(insert.insert).toHaveBeenCalledWith({
      name: 'GENERAL',
      library_kind: 'personal',
      owner_user_id: 'user-1',
    })
  })

  it('allows the former General folder to be renamed', async () => {
    const lookup = new QueryBuilder({ data: general, error: null })
    const updated = new QueryBuilder({
      data: { ...general, name: 'Renamed' },
      error: null,
    })
    mockClient([lookup, updated])

    await expect(renameScenarioFolder(account, 'general', 'Renamed')).resolves.toMatchObject({
      name: 'Renamed',
    })
    expect(updated.update).toHaveBeenCalledWith({ name: 'Renamed' })
  })

  it('requests persisted position ordering with scenario number as a stable tie-breaker', async () => {
    const folderLookup = new QueryBuilder({ data: general, error: null })
    const scenarioList = new QueryBuilder({ data: [scenario], error: null })
    mockClient([folderLookup, scenarioList])

    await expect(listSavedScenarios(account, 'general')).resolves.toMatchObject([
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
      new QueryBuilder({ data: general, error: null }),
    ])

    await expect(getSavedScenario(account, 'scenario-3')).rejects.toMatchObject({
      status: 500,
      message: 'Scenario scenario-3 contains an invalid snapshot',
    })
  })

  it('uses the record-reserved scenario number when an updated title is blank', async () => {
    const current = new QueryBuilder({ data: scenario, error: null })
    const currentFolder = new QueryBuilder({ data: general, error: null })
    const updated = new QueryBuilder({ data: scenario, error: null })
    const updatedFolder = new QueryBuilder({ data: general, error: null })
    mockClient([current, currentFolder, updated, updatedFolder])

    await updateSavedScenario(account, 'scenario-3', { title: '   ' })

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
    const client = mockClient([new QueryBuilder({ data: general, error: null })])
    client.rpc.mockResolvedValue({ data: scenario, error: null })

    await expect(
      createSavedScenario(account, null, '', createEmptyScenarioSnapshot()),
    ).resolves.toMatchObject({ id: 'scenario-3', position: 1 })
    expect(client.rpc).toHaveBeenCalledWith('create_saved_scenario_with_auto_folder', {
      requested_title: '',
      scenario_snapshot: createEmptyScenarioSnapshot(),
    })
  })

  it('moves scenarios through the append RPC and persists complete folder order', async () => {
    const trauma = { ...general, id: 'trauma', name: 'Trauma' }
    const current = new QueryBuilder({ data: scenario, error: null })
    const currentFolder = new QueryBuilder({ data: general, error: null })
    const movedFolder = new QueryBuilder({ data: trauma, error: null })
    const reorderFolder = new QueryBuilder({ data: trauma, error: null })
    const client = mockClient([current, currentFolder, movedFolder, reorderFolder])
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

    await expect(updateSavedScenario(account, 'scenario-3', { folderId: 'trauma' })).resolves.toMatchObject({
      folder_id: 'trauma',
      position: 4,
    })
    await expect(
      reorderSavedScenarios(account, 'trauma', ['scenario-2', 'scenario-3']),
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

  it('persists complete global folder order and restores scenario counts', async () => {
    const counts = new QueryBuilder({ data: [{ folder_id: 'trauma' }], error: null })
    const client = mockClient([counts])
    client.rpc.mockResolvedValue({
      data: [
        { ...general, id: 'trauma', name: 'Trauma', position: 1 },
        { ...general, position: 2 },
      ],
      error: null,
    })

    await expect(reorderScenarioFolders(account, 'personal', ['trauma', 'general'])).resolves.toMatchObject([
      { id: 'trauma', position: 1, scenario_count: 1 },
      { id: 'general', position: 2, scenario_count: 0 },
    ])
    expect(client.rpc).toHaveBeenCalledWith('reorder_scenario_folders', {
      library_scope: 'personal',
      ordered_folder_ids: ['trauma', 'general'],
    })
  })

  it('reports Templates as read-only for Instructors and editable for Administrators', async () => {
    const template = {
      ...general,
      library_kind: 'template' as const,
      owner_user_id: null,
    }
    mockClient([
      new QueryBuilder({ data: [template], error: null }),
      new QueryBuilder({ data: [], error: null }),
    ])
    await expect(listScenarioFolders(account)).resolves.toMatchObject([{ can_edit: false }])

    mockClient([
      new QueryBuilder({ data: [template], error: null }),
      new QueryBuilder({ data: [], error: null }),
    ])
    await expect(listScenarioFolders(administrator)).resolves.toMatchObject([{ can_edit: true }])
  })

  it('rejects Template creation before querying for a non-Administrator', async () => {
    await expect(createScenarioFolder(account, 'Shared', 'template')).rejects.toMatchObject({
      status: 403,
      message: 'Administrator access required',
    })
    expect(createAuthenticatedClient).not.toHaveBeenCalled()
  })
})
