import { createAuthenticatedClient } from '@/lib/supabase/server'
import { normalizeScenarioSnapshot } from '@/lib/scenarioSnapshot'
import type { Database } from '@/lib/supabase/types'
import type { ActiveAccount } from '@/server/accounts/service'
import type {
  SavedScenario,
  SavedScenarioSummary,
  ScenarioFolder,
  ScenarioSnapshotV1,
} from '@/types/savedScenario'

type FolderRow = Database['public']['Tables']['scenario_folders']['Row']
type ScenarioRow = Database['public']['Tables']['saved_scenarios']['Row']

export class ScenarioLibraryError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'ScenarioLibraryError'
  }
}

function normalizeFolderName(name: string): string {
  const normalized = name.trim()
  if (!normalized) throw new ScenarioLibraryError('Folder name is required', 400)
  return normalized
}

function databaseError(error: { code?: string; message: string } | null, fallback: string): never {
  if (error?.code === '23505') {
    throw new ScenarioLibraryError('A folder with that name already exists', 409)
  }
  if (error?.message.includes('Scenario folder not found')) {
    throw new ScenarioLibraryError('Scenario folder not found', 404)
  }
  if (error?.message.includes('Saved scenario not found')) {
    throw new ScenarioLibraryError('Saved scenario not found', 404)
  }
  if (error?.message.includes('Select a folder before saving')) {
    throw new ScenarioLibraryError('Select a Personal folder before saving', 409)
  }
  if (error?.message.includes('Scenario order must contain')) {
    throw new ScenarioLibraryError(
      'Scenario order must contain every scenario in the folder exactly once',
      409,
    )
  }
  if (error?.message.includes('Folder order must contain')) {
    throw new ScenarioLibraryError(
      'Folder order must contain every folder exactly once',
      409,
    )
  }
  if (error?.code === '42501' || error?.message.includes('row-level security')) {
    throw new ScenarioLibraryError('Scenario library access denied', 403)
  }
  throw new ScenarioLibraryError(error?.message ?? fallback, 500)
}

function canEditFolder(folder: FolderRow, account: ActiveAccount): boolean {
  return folder.library_kind === 'personal' || account.role === 'administrator'
}

function toFolder(
  row: FolderRow,
  account: ActiveAccount,
  scenarioCount: number,
): ScenarioFolder {
  return {
    id: row.id,
    name: row.name,
    library_kind: row.library_kind,
    can_edit: canEditFolder(row, account),
    position: row.position,
    scenario_count: scenarioCount,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function toSummary(
  row: ScenarioRow,
  folder: FolderRow,
  account: ActiveAccount,
): SavedScenarioSummary {
  return {
    id: row.id,
    folder_id: row.folder_id,
    scenario_number: row.scenario_number,
    title: row.title,
    library_kind: folder.library_kind,
    can_edit: canEditFolder(folder, account),
    position: row.position,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function toSavedScenario(
  row: ScenarioRow,
  folder: FolderRow,
  account: ActiveAccount,
): SavedScenario {
  const snapshot = normalizeScenarioSnapshot(row.snapshot)
  if (!snapshot) {
    throw new ScenarioLibraryError(`Scenario ${row.id} contains an invalid snapshot`, 500)
  }
  return { ...toSummary(row, folder, account), snapshot }
}

async function requireFolder(folderId: string): Promise<FolderRow> {
  const supabase = await createAuthenticatedClient()
  const { data, error } = await supabase
    .from('scenario_folders')
    .select('id, name, library_kind, owner_user_id, position, created_at, updated_at')
    .eq('id', folderId)
    .maybeSingle()

  if (error) databaseError(error, 'Unable to load scenario folder')
  if (!data) throw new ScenarioLibraryError('Scenario folder not found', 404)
  return data
}

export async function listScenarioFolders(account: ActiveAccount): Promise<ScenarioFolder[]> {
  const supabase = await createAuthenticatedClient()
  const [foldersResult, scenariosResult] = await Promise.all([
    supabase
      .from('scenario_folders')
      .select('id, name, library_kind, owner_user_id, position, created_at, updated_at')
      .order('library_kind', { ascending: true })
      .order('position', { ascending: true })
      .order('name', { ascending: true }),
    supabase.from('saved_scenarios').select('folder_id'),
  ])

  if (foldersResult.error) {
    databaseError(foldersResult.error, 'Unable to list scenario folders')
  }
  if (scenariosResult.error) {
    databaseError(scenariosResult.error, 'Unable to count saved scenarios')
  }

  const counts = new Map<string, number>()
  for (const scenario of scenariosResult.data ?? []) {
    counts.set(scenario.folder_id, (counts.get(scenario.folder_id) ?? 0) + 1)
  }

  return (foldersResult.data ?? []).map((folder) =>
    toFolder(folder, account, counts.get(folder.id) ?? 0))
}

export async function createScenarioFolder(
  account: ActiveAccount,
  name: string,
  libraryKind: 'personal' | 'template',
): Promise<ScenarioFolder> {
  if (libraryKind === 'template' && account.role !== 'administrator') {
    throw new ScenarioLibraryError('Administrator access required', 403)
  }
  const supabase = await createAuthenticatedClient()
  const { data, error } = await supabase
    .from('scenario_folders')
    .insert({
      name: normalizeFolderName(name),
      library_kind: libraryKind,
      owner_user_id: libraryKind === 'personal' ? account.user_id : null,
    })
    .select('id, name, library_kind, owner_user_id, position, created_at, updated_at')
    .single()

  if (error || !data) databaseError(error, 'Unable to create scenario folder')
  return toFolder(data, account, 0)
}

export async function renameScenarioFolder(
  account: ActiveAccount,
  id: string,
  name: string,
): Promise<ScenarioFolder> {
  const folder = await requireFolder(id)
  if (!canEditFolder(folder, account)) {
    throw new ScenarioLibraryError('Administrator access required', 403)
  }

  const supabase = await createAuthenticatedClient()
  const { data, error } = await supabase
    .from('scenario_folders')
    .update({ name: normalizeFolderName(name) })
    .eq('id', id)
    .select('id, name, library_kind, owner_user_id, position, created_at, updated_at')
    .single()

  if (error || !data) databaseError(error, 'Unable to rename scenario folder')
  return toFolder(data, account, 0)
}

export async function deleteScenarioFolder(id: string): Promise<void> {
  const supabase = await createAuthenticatedClient()
  const { data, error } = await supabase
    .from('scenario_folders')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error) databaseError(error, 'Unable to delete scenario folder')
  if (!data) throw new ScenarioLibraryError('Scenario folder not found', 404)
}

export async function reorderScenarioFolders(
  account: ActiveAccount,
  libraryKind: 'personal' | 'template',
  orderedFolderIds: string[],
): Promise<ScenarioFolder[]> {
  if (libraryKind === 'template' && account.role !== 'administrator') {
    throw new ScenarioLibraryError('Administrator access required', 403)
  }
  const supabase = await createAuthenticatedClient()
  const { data, error } = await supabase.rpc('reorder_scenario_folders', {
    library_scope: libraryKind,
    ordered_folder_ids: orderedFolderIds,
  })

  if (error) databaseError(error, 'Unable to reorder scenario folders')

  const countsResult = await supabase.from('saved_scenarios').select('folder_id')
  if (countsResult.error) {
    databaseError(countsResult.error, 'Unable to count saved scenarios')
  }
  const counts = new Map<string, number>()
  for (const scenario of countsResult.data ?? []) {
    counts.set(scenario.folder_id, (counts.get(scenario.folder_id) ?? 0) + 1)
  }

  return (data ?? []).map((folder) =>
    toFolder(folder, account, counts.get(folder.id) ?? 0))
}

export async function listSavedScenarios(
  account: ActiveAccount,
  folderId: string,
): Promise<SavedScenarioSummary[]> {
  const folder = await requireFolder(folderId)
  const supabase = await createAuthenticatedClient()
  const { data, error } = await supabase
    .from('saved_scenarios')
    .select('id, folder_id, scenario_number, title, snapshot, position, created_at, updated_at')
    .eq('folder_id', folderId)
    .order('position', { ascending: true })
    .order('scenario_number', { ascending: true })

  if (error) databaseError(error, 'Unable to list saved scenarios')
  return (data ?? []).map((row) => toSummary(row, folder, account))
}

export async function getSavedScenario(
  account: ActiveAccount,
  id: string,
): Promise<SavedScenario> {
  const supabase = await createAuthenticatedClient()
  const { data, error } = await supabase
    .from('saved_scenarios')
    .select('id, folder_id, scenario_number, title, snapshot, position, created_at, updated_at')
    .eq('id', id)
    .maybeSingle()

  if (error) databaseError(error, 'Unable to load saved scenario')
  if (!data) throw new ScenarioLibraryError('Saved scenario not found', 404)
  const folder = await requireFolder(data.folder_id)
  return toSavedScenario(data, folder, account)
}

export async function createSavedScenario(
  account: ActiveAccount,
  folderId: string | null,
  title: string,
  snapshot: ScenarioSnapshotV1,
): Promise<SavedScenario> {
  const supabase = await createAuthenticatedClient()
  const { data, error } = folderId === null
    ? await supabase.rpc('create_saved_scenario_with_auto_folder', {
        requested_title: title,
        scenario_snapshot: snapshot,
      })
    : await supabase.rpc('create_saved_scenario', {
        folder_id: folderId,
        requested_title: title,
        scenario_snapshot: snapshot,
      })

  if (error || !data) databaseError(error, 'Unable to save scenario')
  const folder = await requireFolder(data.folder_id)
  return toSavedScenario(data, folder, account)
}

type SavedScenarioChanges = {
  folderId?: string
  title?: string
  snapshot?: ScenarioSnapshotV1
}

export async function updateSavedScenario(
  account: ActiveAccount,
  id: string,
  changes: SavedScenarioChanges,
): Promise<SavedScenario> {
  let current = await getSavedScenario(account, id)

  if (changes.folderId !== undefined && changes.folderId !== current.folder_id) {
    const supabase = await createAuthenticatedClient()
    const { data, error } = await supabase.rpc('move_saved_scenario', {
      scenario_to_move: id,
      target_folder: changes.folderId,
    })
    if (error || !data) databaseError(error, 'Unable to move saved scenario')
    const folder = await requireFolder(data.folder_id)
    current = toSavedScenario(data, folder, account)
  }

  const update: Database['public']['Tables']['saved_scenarios']['Update'] = {}
  if (changes.snapshot !== undefined) update.snapshot = changes.snapshot
  if (changes.title !== undefined) {
    update.title = changes.title.trim() || `Scenario ${current.scenario_number}`
  }
  if (Object.keys(update).length === 0 && changes.folderId === undefined) {
    throw new ScenarioLibraryError('No scenario changes supplied', 400)
  }
  if (Object.keys(update).length === 0) return current

  const supabase = await createAuthenticatedClient()
  const { data, error } = await supabase
    .from('saved_scenarios')
    .update(update)
    .eq('id', id)
    .select('id, folder_id, scenario_number, title, snapshot, position, created_at, updated_at')
    .single()

  if (error || !data) databaseError(error, 'Unable to update saved scenario')
  const folder = await requireFolder(data.folder_id)
  return toSavedScenario(data, folder, account)
}

export async function reorderSavedScenarios(
  account: ActiveAccount,
  folderId: string,
  orderedScenarioIds: string[],
): Promise<SavedScenarioSummary[]> {
  const folder = await requireFolder(folderId)
  if (!canEditFolder(folder, account)) {
    throw new ScenarioLibraryError('Administrator access required', 403)
  }
  const supabase = await createAuthenticatedClient()
  const { data, error } = await supabase.rpc('reorder_saved_scenarios', {
    folder_to_reorder: folderId,
    ordered_scenario_ids: orderedScenarioIds,
  })

  if (error) databaseError(error, 'Unable to reorder saved scenarios')
  return (data ?? []).map((row) => toSummary(row, folder, account))
}

export async function deleteSavedScenario(id: string): Promise<void> {
  const supabase = await createAuthenticatedClient()
  const { data, error } = await supabase
    .from('saved_scenarios')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error) databaseError(error, 'Unable to delete saved scenario')
  if (!data) throw new ScenarioLibraryError('Saved scenario not found', 404)
}
