import { randomUUID } from 'node:crypto'

import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'

import type { Database } from '@/lib/supabase/types'

const runIntegration = process.env.RUN_SUPABASE_INTEGRATION === 'true'
const describeIntegration = runIntegration ? describe : describe.skip

describeIntegration('local Supabase account integration', () => {
  it('invites, authenticates, and enforces live disabled-profile RLS', async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const service = createClient<Database>(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const suffix = randomUUID().slice(0, 8)
    const username = `Medic-${suffix}`
    const email = `${suffix}@integration.local`
    const password = 'integration-password'
    const browser = createClient<Database>(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: invitation, error: invitationError } = await service.auth.admin
      .inviteUserByEmail(email)
    expect(invitationError).toBeNull()
    expect(invitation.user).not.toBeNull()
    const userId = invitation.user!.id

    const { error: profileError } = await service.from('account_profiles').insert({
      user_id: userId,
      username,
      role: 'instructor',
      status: 'enabled',
    })
    expect(profileError).toBeNull()

    const { error: setupError } = await service.auth.admin.updateUserById(userId, {
      email_confirm: true,
      password,
    })
    expect(setupError).toBeNull()
    const { error: signInError } = await browser.auth.signInWithPassword({ email, password })
    expect(signInError).toBeNull()

    const { data: enabledProfile, error: enabledError } = await browser
      .from('account_profiles')
      .select('username, status')
      .maybeSingle()
    expect(enabledError).toBeNull()
    expect(enabledProfile).toEqual({ username, status: 'enabled' })

    const { error: disableError } = await service
      .from('account_profiles')
      .update({ status: 'disabled' })
      .eq('user_id', userId)
    expect(disableError).toBeNull()
    const { data: disabledProfile, error: disabledError } = await browser
      .from('account_profiles')
      .select('username, status')
      .maybeSingle()
    expect(disabledError).toBeNull()
    expect(disabledProfile).toBeNull()
    const { error: cleanupError } = await service.auth.admin.deleteUser(userId)
    expect(cleanupError).toBeNull()
  })
})
