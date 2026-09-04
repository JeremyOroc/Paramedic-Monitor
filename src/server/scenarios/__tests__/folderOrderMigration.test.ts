import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  resolve(
    process.cwd(),
    'supabase/migrations/20260903222810_instructor_spectator_and_folder_order.sql',
  ),
  'utf8',
)

describe('folder order and Spectator projection migration', () => {
  it('backfills and atomically reorders positive unique folder positions', () => {
    expect(migration).toContain('add column if not exists position integer')
    expect(migration).toContain('order by lower(name), name, created_at, id')
    expect(migration).toContain('scenario_folders_position_positive_check')
    expect(migration).toContain('scenario_folders_position_key')
    expect(migration).toContain('reorder_scenario_folders')
    expect(migration).toContain('set constraints public.scenario_folders_position_key deferred')
  })

  it('keeps latest projections service-only and clears them on a new attempt', () => {
    expect(migration).toContain('create table if not exists public.trainee_monitor_projections')
    expect(migration).toContain('alter table public.trainee_monitor_projections enable row level security')
    expect(migration).toContain('revoke all on public.trainee_monitor_projections from anon, authenticated')
    expect(migration).toContain('sessions_clear_monitor_projection')
    expect(migration).toContain('pg_catalog.octet_length(projection::text) <= 262144')
  })
})
