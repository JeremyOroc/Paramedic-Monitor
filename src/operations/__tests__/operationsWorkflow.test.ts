import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const workflow = readFileSync(
  resolve(process.cwd(), '.github/workflows/supabase-backup.yml'),
  'utf8',
)

describe('encrypted Supabase backup workflow', () => {
  it('runs nightly and supports a deliberate manual run', () => {
    expect(workflow).toContain("cron: '17 7 * * *'")
    expect(workflow).toContain('workflow_dispatch:')
    expect(workflow).toContain('cancel-in-progress: false')
  })

  it('pins the Supabase CLI and keeps backup configuration in repository secrets', () => {
    expect(workflow).toContain('supabase@2.109.1')
    expect(workflow).toContain('secrets.PRODUCTION_SUPABASE_DB_URL')
    expect(workflow).toContain('secrets.BACKUP_AGE_RECIPIENT')
    expect(workflow).toContain('secrets.BACKUP_RCLONE_CONFIG_B64')
    expect(workflow).not.toContain('postgresql://')
  })

  it('runs encrypted backup rotation and a sanitized failure notification', () => {
    expect(workflow).toContain('scripts/operations/backup-supabase.sh')
    expect(workflow).toContain('if: failure()')
    expect(workflow).toContain('scripts/operations/notify-operations.sh')
    expect(workflow).toContain('OPS_EVENT_CODE: backup_failed')
  })
})
