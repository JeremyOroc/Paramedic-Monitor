import { createServiceClient } from '@/lib/supabase/server'
import { normalizeScenarioSnapshot } from '@/lib/scenarioSnapshot'
import type { Database } from '@/lib/supabase/types'
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
  throw new ScenarioLibraryError(error?.message ?? fallback, 500)
}

function toSummary(row: ScenarioRow): SavedScenarioSummary {
  return {
    id: row.id,
    folder_id: row.folder_id,
    scenario_number: row.scenario_number,
    title: row.title,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function toSavedScenario(row: ScenarioRow): SavedScenario {
  const snapshot = normalizeScenarioSnapshot(row.snapshot)
  if (!snapshot) {
    throw new ScenarioLibraryError(`Scenario ${row.id} contains an invalid snapshot`, 500)
  }
  return { ...toSummary(row), snapshot }
}

async function requireFolder(folderId: string): Promise<FolderRow> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('scenario_folders')
    .select('id, name, is_general, created_at, updated_at')
    .eq('id', folderId)
    .maybeSingle()

  if (error) databaseError(error, 'Unable to load scenario folder')
  if (!data) throw new ScenarioLibraryError('Scenario folder not found', 404)
  return data
}

export async function listScenarioFolders(): Promise<ScenarioFolder[]> {
  const supabase = createServiceClient()
  const [foldersResult, scenariosResult] = await Promise.all([
    supabase
      .from('scenario_folders')
      .select('id, name, is_general, created_at, updated_at')
      .order('is_general', { ascending: false })
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

  return (foldersResult.data ?? [])
    .map((folder) => ({
      ...folder,
      scenario_count: counts.get(folder.id) ?? 0,
    }))
    .sort((left, right) => {
      if (left.is_general) return -1
      if (right.is_general) return 1
      return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
    })
}

export async function createScenarioFolder(name: string): Promise<ScenarioFolder> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('scenario_folders')
    .insert({ name: normalizeFolderName(name) })
    .select('id, name, is_general, created_at, updated_at')
    .single()

  if (error || !data) databaseError(error, 'Unable to create scenario folder')
  return { ...data, scenario_count: 0 }
}

export async function renameScenarioFolder(id: string, name: string): Promise<ScenarioFolder> {
  const current = await requireFolder(id)
  if (current.is_general) {
    throw new ScenarioLibraryError('General folder cannot be renamed', 409)
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('scenario_folders')
    .update({ name: normalizeFolderName(name) })
    .eq('id', id)
    .select('id, name, is_general, created_at, updated_at')
    .single()

  if (error || !data) databaseError(error, 'Unable to rename scenario folder')
  return { ...data, scenario_count: 0 }
}

export async function deleteScenarioFolder(id: string): Promise<string> {
  const current = await requireFolder(id)
  if (current.is_general) {
    throw new ScenarioLibraryError('General folder cannot be deleted', 409)
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase.rpc('delete_scenario_folder', {
    folder_to_delete: id,
  })
  if (error || !data) databaseError(error, 'Unable to delete scenario folder')
  return data
}

export async function listSavedScenarios(folderId: string): Promise<SavedScenarioSummary[]> {
  await requireFolder(folderId)
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('saved_scenarios')
    .select('id, folder_id, scenario_number, title, snapshot, created_at, updated_at')
    .eq('folder_id', folderId)
    .order('updated_at', { ascending: false })
    .order('scenario_number', { ascending: true })

  if (error) databaseError(error, 'Unable to list saved scenarios')
  return (data ?? []).map(toSummary)
}

export async function getSavedScenario(id: string): Promise<SavedScenario> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('saved_scenarios')
    .select('id, folder_id, scenario_number, title, snapshot, created_at, updated_at')
    .eq('id', id)
    .maybeSingle()

  if (error) databaseError(error, 'Unable to load saved scenario')
  if (!data) throw new ScenarioLibraryError('Saved scenario not found', 404)
  return toSavedScenario(data)
}

export async function createSavedScenario(
  folderId: string,
  title: string,
  snapshot: ScenarioSnapshotV1,
): Promise<SavedScenario> {
  await requireFolder(folderId)
  const supabase = createServiceClient()
  const { data, error } = await supabase.rpc('create_saved_scenario', {
    folder_id: folderId,
    requested_title: title,
    scenario_snapshot: snapshot,
  })

  if (error || !data) databaseError(error, 'Unable to save scenario')
  return toSavedScenario(data)
}

type SavedScenarioChanges = {
  folderId?: string
  title?: string
  snapshot?: ScenarioSnapshotV1
}

export async function updateSavedScenario(
  id: string,
  changes: SavedScenarioChanges,
): Promise<SavedScenario> {
  const current = await getSavedScenario(id)
  if (changes.folderId !== undefined) await requireFolder(changes.folderId)

  const update: Database['public']['Tables']['saved_scenarios']['Update'] = {}
  if (changes.folderId !== undefined) update.folder_id = changes.folderId
  if (changes.snapshot !== undefined) update.snapshot = changes.snapshot
  if (changes.title !== undefined) {
    update.title = changes.title.trim() || `Scenario ${current.scenario_number}`
  }
  if (Object.keys(update).length === 0) {
    throw new ScenarioLibraryError('No scenario changes supplied', 400)
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('saved_scenarios')
    .update(update)
    .eq('id', id)
    .select('id, folder_id, scenario_number, title, snapshot, created_at, updated_at')
    .single()

  if (error || !data) databaseError(error, 'Unable to update saved scenario')
  return toSavedScenario(data)
}

export async function deleteSavedScenario(id: string): Promise<void> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('saved_scenarios')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error) databaseError(error, 'Unable to delete saved scenario')
  if (!data) throw new ScenarioLibraryError('Saved scenario not found', 404)
}
