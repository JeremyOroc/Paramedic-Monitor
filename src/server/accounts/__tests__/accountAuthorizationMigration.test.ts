import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  resolve(
    process.cwd(),
    'supabase/migrations/20260904200300_phase_1_account_authorization.sql',
  ),
  'utf8',
)

const policyTests = readFileSync(
  resolve(process.cwd(), 'supabase/tests/account_authorization_rls.test.sql'),
  'utf8',
)

describe('account authorization migration', () => {
  it('keys profiles to Auth identities and enforces normalized username uniqueness', () => {
    expect(migration).toContain(
      'user_id             uuid        primary key references auth.users(id) on delete cascade',
    )
    expect(migration).toContain(
      'normalized_username text        generated always as (lower(username)) stored',
    )
    expect(migration).toContain('account_profiles_normalized_username_key')
    expect(migration).toContain("check (role in ('instructor', 'administrator'))")
    expect(migration).toContain("check (status in ('enabled', 'disabled'))")
  })

  it('reserves the initial Administrator names without deriving authority from them', () => {
    expect(migration).toContain("values ('Zoid'), ('Branden'), ('Jeremy')")
    expect(migration).toContain("if new.role <> 'administrator'")
    expect(migration).toContain('reserved.normalized_username = lower(new.username)')
    expect(migration).toContain('account_profiles_reserved_username_check')
    expect(migration).not.toMatch(/set\s+new\.role\s*=\s*'administrator'/i)
  })

  it('keeps profile mutation privileged and exposes only enabled self-read access', () => {
    expect(migration).toContain('alter table public.account_profiles enable row level security')
    expect(migration).toMatch(
      /revoke all on table public\.account_profiles from public, anon, authenticated/i,
    )
    expect(migration).toContain('grant select on table public.account_profiles to authenticated')
    expect(migration).toContain(
      'grant select, insert, update, delete on table public.account_profiles to service_role',
    )
    expect(migration).toContain(
      'grant select on table public.reserved_account_usernames to service_role',
    )
    expect(migration).toMatch(
      /to authenticated\s+using \(\s+\(select auth\.uid\(\)\) = user_id\s+and status = 'enabled'/i,
    )
  })

  it('uses private invoker helpers backed by live profile role and status', () => {
    expect(migration).toContain('private.current_account_is_enabled()')
    expect(migration).toContain('private.current_account_is_administrator()')
    expect(migration.match(/security invoker/g)?.length).toBeGreaterThanOrEqual(3)
    expect(migration).toContain("profile.role = 'administrator'")
    expect(migration).toContain("profile.status = 'enabled'")
    expect(migration).toMatch(/revoke all on function[\s\S]+from public, anon/i)
  })

  it('carries executable allow and deny policy coverage', () => {
    expect(policyTests).toContain("set local role authenticated")
    expect(policyTests).toContain("set local role anon")
    expect(policyTests).toContain('a disabled Account cannot read even its own profile')
    expect(policyTests).toContain('an authenticated Account cannot promote itself')
    expect(policyTests).toContain('usernames are unique without regard to case')
    expect(policyTests).toContain('a reserved username cannot be claimed by an Instructor')
    expect(policyTests).toContain('rollback;')
  })
})
