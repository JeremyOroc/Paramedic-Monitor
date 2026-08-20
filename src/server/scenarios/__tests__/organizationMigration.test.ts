import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  resolve(
    process.cwd(),
    'supabase/migrations/20260820192736_scenario_library_organization.sql',
  ),
  'utf8',
)

const constraintQualificationMigration = readFileSync(
  resolve(
    process.cwd(),
    'supabase/migrations/20260820194954_qualify_scenario_order_constraint.sql',
  ),
  'utf8',
)

describe('scenario library organization migration', () => {
  it('retires General protection without deleting existing folder data', () => {
    expect(migration).toContain('drop trigger if exists scenario_folders_protect_general')
    expect(migration).toContain('drop column if exists is_general')
    expect(migration).not.toMatch(/delete\s+from\s+public\.scenario_folders/i)
  })

  it('cascades folder deletion and preserves the prior visual order during backfill', () => {
    expect(migration).toContain('on delete cascade')
    expect(migration).toMatch(/partition by folder_id\s+order by updated_at desc, scenario_number asc/i)
    expect(migration).toContain('saved_scenarios_folder_position_key')
    expect(migration).toContain('saved_scenarios_folder_position_idx')
  })

  it('restricts invoker-security write functions to the service role', () => {
    expect(migration.match(/security invoker/g)?.length).toBeGreaterThanOrEqual(5)
    expect(migration).toContain('create_saved_scenario_with_auto_folder')
    expect(migration).toContain('move_saved_scenario')
    expect(migration).toContain('reorder_saved_scenarios')
    expect(migration).toMatch(/revoke execute[\s\S]+from public, anon, authenticated/i)
    expect(migration).toMatch(/grant execute[\s\S]+to service_role/i)
  })

  it('schema-qualifies the deferred position constraint with an empty search path', () => {
    expect(constraintQualificationMigration).toContain("set search_path = ''")
    expect(constraintQualificationMigration).toContain(
      'set constraints public.saved_scenarios_folder_position_key deferred',
    )
    expect(constraintQualificationMigration).toMatch(
      /revoke execute[\s\S]+from public, anon, authenticated/i,
    )
    expect(constraintQualificationMigration).toMatch(/grant execute[\s\S]+to service_role/i)
  })
})
