import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('invite-only Auth configuration', () => {
  it('disables local public signup and sends default invitations through the app handoff', () => {
    const config = readFileSync('supabase/config.toml', 'utf8')
    const authSection = config.match(/\[auth\]\n([\s\S]*?)\n\[auth\.rate_limit\]/)?.[1]
    const emailSection = config.match(/\[auth\.email\]\n([\s\S]*?)\n\[auth\.sms\]/)?.[1]

    expect(authSection).toContain('site_url = "http://127.0.0.1:3000/auth/invite"')
    expect(authSection).toContain('enable_signup = false')
    expect(emailSection).toContain('enable_signup = false')
  })

  it('has no shared account-registration secret in the deployment template', () => {
    const environmentTemplate = readFileSync('.env.example', 'utf8')
    expect(environmentTemplate).not.toContain('INSTRUCTOR_REGISTRATION_CODE')
  })
})
