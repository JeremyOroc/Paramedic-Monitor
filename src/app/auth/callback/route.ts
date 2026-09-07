import type { EmailOtpType } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

import { createAuthenticatedClient } from '@/lib/supabase/server'
import { profileForAuthUser } from '@/server/accounts/service'
import { safeInstructorPath } from '@/server/accounts/validation'

const OTP_TYPES = new Set<EmailOtpType>([
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
])

export async function GET(request: Request) {
  const url = new URL(request.url)
  const next = safeInstructorPath(url.searchParams.get('next'))
  const auth = await createAuthenticatedClient()
  const code = url.searchParams.get('code')
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type')

  let failed = true
  if (code) {
    const { error } = await auth.auth.exchangeCodeForSession(code)
    failed = Boolean(error)
  } else if (tokenHash && type && OTP_TYPES.has(type as EmailOtpType)) {
    const { error } = await auth.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    })
    failed = Boolean(error)
  }

  if (!failed) {
    const { data } = await auth.auth.getUser()
    const inviteAcceptance = new URL('/instructor/accept-invite', url.origin)
    const isInviteAcceptance = type === 'invite'
      || (next === '/instructor/accept-invite' && Boolean(data.user?.invited_at))
    if (data.user?.email_confirmed_at && data.user.invited_at && isInviteAcceptance) {
      const response = NextResponse.redirect(inviteAcceptance)
      response.headers.set('Cache-Control', 'no-store')
      return response
    }
    if (data.user && await profileForAuthUser(data.user)) {
      const response = NextResponse.redirect(new URL(next, url.origin))
      response.headers.set('Cache-Control', 'no-store')
      return response
    }
    await auth.auth.signOut({ scope: 'local' })
  }

  const login = new URL('/instructor/login', url.origin)
  login.searchParams.set('error', 'verification')
  const response = NextResponse.redirect(login)
  response.headers.set('Cache-Control', 'no-store')
  return response
}
