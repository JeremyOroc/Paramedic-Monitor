import {
  chmodSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'

import { afterEach, describe, expect, it } from 'vitest'

const root = process.cwd()
const scriptPath = (name: string) => resolve(root, 'scripts/operations', name)
const readScript = (name: string) => readFileSync(scriptPath(name), 'utf8')

function runScript(name: string, environment: Record<string, string>) {
  return spawnSync('bash', [scriptPath(name)], {
    cwd: root,
    env: { ...process.env, ...environment },
    encoding: 'utf8',
  })
}

const productionRef = 'abcdefghijklmnopqrst'
const rehearsalRef = 'uvwxyzabcdefghijklmn'
const temporaryDirectories: string[] = []

function createExecutable(path: string, contents: string) {
  writeFileSync(path, contents, { encoding: 'utf8', mode: 0o755 })
  chmodSync(path, 0o755)
}

describe('Phase 7 operations scripts', () => {
  afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('validates a backup dry run without printing database credentials', () => {
    const databaseUrl = `postgresql://postgres.${productionRef}:secret@pooler.example/postgres`
    const result = runScript('backup-supabase.sh', {
      SUPABASE_DB_URL: databaseUrl,
      PRODUCTION_PROJECT_REF: productionRef,
      BACKUP_PROJECT_SLUG: 'paramedic-monitor',
      BACKUP_AGE_RECIPIENT: 'age1testrecipient',
      BACKUP_RCLONE_REMOTE: 'college-vault:paramedic-monitor',
      BACKUP_DRY_RUN: 'true',
    })

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('export roles/schema/data')
    expect(result.stdout).not.toContain(databaseUrl)
    expect(result.stderr).toBe('')
  })

  it('fails closed when required backup configuration is absent', () => {
    const result = runScript('backup-supabase.sh', {})

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Missing required environment variable: SUPABASE_DB_URL')
  })

  it('uses the official three-part dump and encrypts before any upload', () => {
    const script = readScript('backup-supabase.sh')
    const encryption = script.indexOf('age --encrypt')
    const upload = script.indexOf('rclone copyto')

    expect(script).toContain('--role-only')
    expect(script).toContain('schema.sql')
    expect(script).toContain('--data-only')
    expect(script).toContain('COPY "auth"\\.\"users\"')
    expect(script).toContain('COPY "public"\\.\"account_profiles\"')
    expect(script).toContain('SHA256SUMS')
    expect(encryption).toBeGreaterThan(0)
    expect(upload).toBeGreaterThan(encryption)
    expect(script).toContain('prune_remote "$daily_remote" 30')
    expect(script).toContain('prune_remote "$monthly_remote" 12')
    expect(script).toContain('unexpected filename')
  })

  it('executes the verified export-to-encrypted-upload sequence with synthetic tools', () => {
    const fixture = mkdtempSync(resolve(tmpdir(), 'paramedic-monitor-backup-test-'))
    temporaryDirectories.push(fixture)
    const bin = resolve(fixture, 'bin')
    const operationTemp = resolve(fixture, 'tmp')
    const log = resolve(fixture, 'operations.log')
    mkdirSync(bin)
    mkdirSync(operationTemp)

    createExecutable(resolve(bin, 'supabase'), `#!/usr/bin/env bash
set -euo pipefail
printf 'supabase %s\\n' "$*" >> "$OPS_TEST_LOG"
output=''
mode='schema'
while [ "$#" -gt 0 ]; do
  case "$1" in
    --file) output="$2"; shift 2 ;;
    --role-only) mode='roles'; shift ;;
    --data-only) mode='data'; shift ;;
    *) shift ;;
  esac
done
case "$mode" in
  roles) printf 'CREATE ROLE synthetic;\\n' > "$output" ;;
  schema) printf 'CREATE TABLE IF NOT EXISTS "public"."account_profiles" ();\\n' > "$output" ;;
  data) printf 'COPY "auth"."users" (id) FROM stdin;\\nCOPY "public"."account_profiles" (user_id) FROM stdin;\\n' > "$output" ;;
esac
`)
    createExecutable(resolve(bin, 'psql'), `#!/usr/bin/env bash
set -euo pipefail
printf 'psql\\n' >> "$OPS_TEST_LOG"
if printf '%s' "$*" | grep -q 'select count'; then printf '1\\n'; fi
`)
    createExecutable(resolve(bin, 'age'), `#!/usr/bin/env bash
set -euo pipefail
printf 'age\\n' >> "$OPS_TEST_LOG"
output=''
input=''
while [ "$#" -gt 0 ]; do
  case "$1" in
    --output) output="$2"; shift 2 ;;
    --recipient|--identity) shift 2 ;;
    --encrypt|--decrypt) shift ;;
    *) input="$1"; shift ;;
  esac
done
cp "$input" "$output"
`)
    createExecutable(resolve(bin, 'rclone'), `#!/usr/bin/env bash
set -euo pipefail
printf 'rclone %s\\n' "$*" >> "$OPS_TEST_LOG"
if [ "\${1:-}" = 'copyto' ]; then
  case "$2" in *.age) ;; *) exit 9 ;; esac
fi
`)

    const databaseUrl = `postgresql://postgres.${productionRef}:secret@pooler.example/postgres`
    const result = runScript('backup-supabase.sh', {
      PATH: `${bin}:${process.env.PATH ?? ''}`,
      TMPDIR: operationTemp,
      OPS_TEST_LOG: log,
      SUPABASE_DB_URL: databaseUrl,
      PRODUCTION_PROJECT_REF: productionRef,
      BACKUP_PROJECT_SLUG: 'paramedic-monitor',
      BACKUP_AGE_RECIPIENT: 'age1testrecipient',
      BACKUP_RCLONE_REMOTE: 'college-vault:paramedic-monitor',
      BACKUP_CREATED_AT: '2026-09-07T200000Z',
    })

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('Backup completed')
    expect(result.stdout).not.toContain(databaseUrl)
    const operations = readFileSync(log, 'utf8')
    expect(operations.match(/^supabase /gm)).toHaveLength(3)
    expect(operations.match(/^psql$/gm)).toHaveLength(5)
    expect(operations.indexOf('age')).toBeLessThan(operations.indexOf('rclone copyto'))
    expect(operations).toContain('daily/paramedic-monitor-2026-09-07T200000Z.tar.gz.age')
    expect(operations).toContain('monthly/paramedic-monitor-2026-09.tar.gz.age')
  })

  it('refuses a restore rehearsal aimed at production', () => {
    const result = runScript('restore-rehearsal.sh', {
      RESTORE_SOURCE_FILE: '/protected/backup.age',
      RESTORE_AGE_IDENTITY_FILE: '/protected/identity.txt',
      RESTORE_TARGET_DB_URL: `postgresql://postgres.${productionRef}:secret@pooler.example/postgres`,
      RESTORE_TARGET_PROJECT_REF: productionRef,
      PRODUCTION_PROJECT_REF: productionRef,
      RESTORE_CONFIRMATION: 'RESTORE_NON_PRODUCTION',
      RESTORE_DRY_RUN: 'true',
    })

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Refusing to restore into the production project')
  })

  it('accepts only an explicit non-production restore dry run', () => {
    const result = runScript('restore-rehearsal.sh', {
      RESTORE_SOURCE_FILE: '/protected/backup.age',
      RESTORE_AGE_IDENTITY_FILE: '/protected/identity.txt',
      RESTORE_TARGET_DB_URL: `postgresql://postgres.${rehearsalRef}:secret@pooler.example/postgres`,
      RESTORE_TARGET_PROJECT_REF: rehearsalRef,
      PRODUCTION_PROJECT_REF: productionRef,
      RESTORE_CONFIRMATION: 'RESTORE_NON_PRODUCTION',
      RESTORE_DRY_RUN: 'true',
    })

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('confirmed non-production project')
    expect(result.stdout).not.toContain('secret')
    expect(readScript('restore-rehearsal.sh')).toContain('archive contains unexpected or missing paths')
  })

  it('requires at least two recipients for operational alerts', () => {
    const oneRecipient = runScript('notify-operations.sh', {
      OPS_ALERT_SMTP_URL: 'smtps://smtp.example.test:465',
      OPS_ALERT_SMTP_USERNAME: 'ops-user',
      OPS_ALERT_SMTP_PASSWORD: 'secret',
      OPS_ALERT_FROM: 'ops@example.test',
      OPS_ALERT_TO: 'first@example.test',
      OPS_EVENT_CODE: 'backup_failed',
      OPS_ALERT_DRY_RUN: 'true',
    })
    expect(oneRecipient.status).toBe(1)
    expect(oneRecipient.stderr).toContain('at least two developer recipients')

    const twoRecipients = runScript('notify-operations.sh', {
      OPS_ALERT_SMTP_URL: 'smtps://smtp.example.test:465',
      OPS_ALERT_SMTP_USERNAME: 'ops-user',
      OPS_ALERT_SMTP_PASSWORD: 'secret',
      OPS_ALERT_FROM: 'ops@example.test',
      OPS_ALERT_TO: 'first@example.test,second@example.test',
      OPS_EVENT_CODE: 'backup_failed',
      OPS_ALERT_DRY_RUN: 'true',
    })
    expect(twoRecipients.status).toBe(0)
    expect(twoRecipients.stdout).toContain('2 developer recipients')
    expect(twoRecipients.stdout).not.toContain('first@example.test')
  })

  it('keeps production smoke checks HTTPS-only by default', () => {
    const unsafe = runScript('production-smoke.sh', {
      PRODUCTION_BASE_URL: 'http://monitor.example.test',
      SMOKE_DRY_RUN: 'true',
    })
    expect(unsafe.status).toBe(1)
    expect(unsafe.stderr).toContain('must use HTTPS')

    const safe = runScript('production-smoke.sh', {
      PRODUCTION_BASE_URL: 'https://monitor.example.test',
      SMOKE_DRY_RUN: 'true',
    })
    expect(safe.status).toBe(0)
  })
})
