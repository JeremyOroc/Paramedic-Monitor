import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const operationsPath = (name: string) => resolve(process.cwd(), 'docs/operations', name)
const readOperationsDoc = (name: string) => readFileSync(operationsPath(name), 'utf8')

describe('Phase 7 production runbooks', () => {
  it('documents every external launch gate without embedding its value', () => {
    const index = readOperationsDoc('README.md')

    expect(index).toContain('two developer failure-alert recipients')
    expect(index).toContain("college's named privacy contact")
    expect(index).toContain('approved encrypted off-site backup destination')
    expect(index).toContain('custom Auth SMTP provider')
    expect(index).toContain('Missing values block classroom launch')
  })

  it('covers whole-project backup, encryption, retention, and quarterly recovery evidence', () => {
    const runbook = readOperationsDoc('backup-and-restore.md')

    expect(runbook).toContain('auth.users')
    expect(runbook).toContain('public.account_profiles')
    expect(runbook).toMatch(/30[\s\S]+daily[\s\S]+12[\s\S]+monthly/i)
    expect(runbook).toContain('Quarterly restore rehearsal')
    expect(runbook).toContain('Never use production')
    expect(runbook).toMatch(/Storage[\s\S]+objects are not included/)
  })

  it('requires custom SMTP controls and both invitation and recovery tests', () => {
    const runbook = readOperationsDoc('custom-smtp.md')

    expect(runbook).toContain('SPF, DKIM, and DMARC')
    expect(runbook).toContain('Disable link tracking')
    expect(runbook).toContain('public signup disabled')
    expect(runbook).toContain('Forgot password?')
    expect(runbook).toMatch(/operational[\s\S]+separate[\s\S]+channel/i)
  })

  it('records maintenance, rollback, and data-preserving forward-fix boundaries', () => {
    const runbook = readOperationsDoc('deployment-and-maintenance.md')

    expect(runbook).toContain('MAINTENANCE_MODE=true')
    expect(runbook).toContain('/api/health')
    expect(runbook).toContain('do not restore an older snapshot over production')
    expect(runbook).toContain('reviewed forward fix')
  })

  it('assigns incident notification decisions and safe Account offboarding', () => {
    const runbook = readOperationsDoc('incident-and-account-operations.md')

    expect(runbook).toContain('college privacy contact owns notification decisions')
    expect(runbook).toContain('Disablement is the reversible first action')
    expect(runbook).toContain('Disable it first')
    expect(runbook).toContain('Auth UUID')
    expect(runbook).toContain('product_correction')
  })

  it('contains the complete acceptance and Free-tier post-break gates', () => {
    const checklist = readOperationsDoc('release-acceptance.md')

    expect(checklist).toContain('duplicate case-insensitive username')
    expect(checklist).toContain('Two synthetic Accounts cannot read or mutate')
    expect(checklist).toContain('takeover invalidates the old')
    expect(checklist).toContain('Maintenance mode redirects pages')
    expect(checklist).toContain('desktop Chrome/Edge')
    expect(checklist).toContain('supported iPad Safari')
    expect(checklist).toContain('after any break of five or more days')
  })
})
