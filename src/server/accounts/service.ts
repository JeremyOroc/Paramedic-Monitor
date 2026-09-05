import type { User } from '@supabase/supabase-js'

import {
  createAuthenticatedClient,
  createServiceClient,
} from '@/lib/supabase/server'
import { AccountServiceError } from '@/server/accounts/http'
import {
  AccountInputError,
  parseEmail,
  parsePassword,
  parseRegistrationCode,
  parseUsername,
  registrationCodeMatches,
} from '@/server/accounts/validation'

type Profile = {
  user_id: string
  username: string
  role: 'instructor' | 'administrator'
  status: 'enabled' | 'disabled'
}

export type ActiveAccount = Profile & { email: string }

const USERNAME_TAKEN = 'That username already exists. Please use another username.'
const EMAIL_UNAVAILABLE =
  'Unable to create an account with that email. Try signing in or resetting your password.'

async function removeOrQuarantineAuthIdentity(
  service: ReturnType<typeof createServiceClient>,
  userId: string,
  profileCode: string,
) {
  const { error: deleteError } = await service.auth.admin.deleteUser(userId)
  if (!deleteError) return true
  const { error: banError } = await service.auth.admin.updateUserById(userId, {
    ban_duration: '876000h',
  })
  console.error('[accounts] profile provisioning cleanup failed', {
    profileCode,
    deleteFailed: true,
    quarantineFailed: Boolean(banError),
  })
  return false
}

async function getProfile(normalizedUsername: string) {
  const service = createServiceClient()
  const { data, error } = await service
    .from('account_profiles')
    .select('user_id, username, role, status')
    .eq('normalized_username', normalizedUsername)
    .maybeSingle()
  if (error) throw error
  return data as Profile | null
}

async function getAuthUser(userId: string) {
  const service = createServiceClient()
  const { data, error } = await service.auth.admin.getUserById(userId)
  if (error) throw error
  return data.user
}

export async function registerAccount(input: unknown, origin: string) {
  const values = typeof input === 'object' && input !== null ? input as Record<string, unknown> : {}
  const { username, normalizedUsername } = parseUsername(values.username)
  const email = parseEmail(values.email)
  const password = parsePassword(values.password)
  const registrationCode = parseRegistrationCode(values.registrationCode)

  if (!registrationCodeMatches(registrationCode, process.env.INSTRUCTOR_REGISTRATION_CODE)) {
    throw new AccountServiceError(
      'registration_code',
      'The instructor registration code is incorrect.',
      403,
    )
  }

  const service = createServiceClient()
  const [profileResult, reservedResult] = await Promise.all([
    service.from('account_profiles').select('user_id').eq('normalized_username', normalizedUsername).maybeSingle(),
    service.from('reserved_account_usernames').select('username').eq('normalized_username', normalizedUsername).maybeSingle(),
  ])
  if (profileResult.error || reservedResult.error) {
    throw new AccountServiceError('retry', 'Account creation is temporarily unavailable.', 503)
  }
  const profile = profileResult.data
  const reserved = reservedResult.data
  if (profile || reserved) {
    throw new AccountServiceError('username_taken', USERNAME_TAKEN, 409)
  }

  const auth = await createAuthenticatedClient()
  const redirect = new URL('/auth/callback', origin)
  redirect.searchParams.set('next', '/instructor')
  const { data, error } = await auth.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: redirect.toString() },
  })
  if (error?.code === 'weak_password') {
    throw new AccountInputError(error.message, 'password')
  }
  if (error || !data.user || data.user.identities?.length === 0) {
    throw new AccountServiceError('email_unavailable', EMAIL_UNAVAILABLE, 409)
  }

  if (data.session || data.user.email_confirmed_at) {
    await auth.auth.signOut({ scope: 'local' })
    await removeOrQuarantineAuthIdentity(service, data.user.id, 'email_confirmation_disabled')
    throw new AccountServiceError(
      'retry',
      'Email verification is not configured. Contact an administrator.',
      503,
    )
  }

  const { error: profileError } = await service.from('account_profiles').insert({
    user_id: data.user.id,
    username,
    role: 'instructor',
    status: 'enabled',
  })
  if (!profileError) return { username }

  const deleted = await removeOrQuarantineAuthIdentity(
    service,
    data.user.id,
    profileError.code,
  )
  if (!deleted) {
    throw new AccountServiceError('retry', 'Account creation failed. Please try again.', 503)
  }

  if (profileError.code === '23505' || profileError.code === '23514') {
    throw new AccountServiceError('username_taken', USERNAME_TAKEN, 409)
  }
  throw new AccountServiceError('retry', 'Account creation failed. Please try again.', 503)
}

export async function signInAccount(input: unknown) {
  const values = typeof input === 'object' && input !== null ? input as Record<string, unknown> : {}
  const { normalizedUsername } = parseUsername(values.username)
  const password = parsePassword(values.password)
  const profile = await getProfile(normalizedUsername)
  if (!profile) {
    throw new AccountServiceError('invalid_credentials', 'Invalid username or password.', 401)
  }
  if (profile.status === 'disabled') {
    throw new AccountServiceError('disabled', 'This account has been disabled. Contact support.', 403)
  }
  const user = await getAuthUser(profile.user_id)
  if (!user.email_confirmed_at || !user.email) {
    throw new AccountServiceError('unverified', 'Verify your email to continue.', 403)
  }
  const auth = await createAuthenticatedClient()
  const { data, error } = await auth.auth.signInWithPassword({ email: user.email, password })
  if (error || data.user.id !== profile.user_id) {
    if (data.session) await auth.auth.signOut({ scope: 'local' })
    throw new AccountServiceError('invalid_credentials', 'Invalid username or password.', 401)
  }
  return { username: profile.username, role: profile.role }
}

export async function resendVerification(input: unknown, origin: string) {
  const values = typeof input === 'object' && input !== null ? input as Record<string, unknown> : {}
  const { normalizedUsername } = parseUsername(values.username)
  const profile = await getProfile(normalizedUsername)
  if (profile) {
    try {
      const user = await getAuthUser(profile.user_id)
      if (user.email && !user.email_confirmed_at) {
        const redirect = new URL('/auth/callback', origin)
        redirect.searchParams.set('next', '/instructor')
        const auth = await createAuthenticatedClient()
        const { error } = await auth.auth.resend({
          type: 'signup',
          email: user.email,
          options: { emailRedirectTo: redirect.toString() },
        })
        if (error) console.error('[accounts] verification resend provider failure')
      }
    } catch {
      console.error('[accounts] verification resend lookup failure')
    }
  }
  return { message: 'If that username has a pending account, a new verification email has been sent.' }
}

export async function requestPasswordRecovery(input: unknown, origin: string) {
  const values = typeof input === 'object' && input !== null ? input as Record<string, unknown> : {}
  const email = parseEmail(values.email)
  const redirect = new URL('/auth/callback', origin)
  redirect.searchParams.set('next', '/instructor/reset-password')
  const auth = await createAuthenticatedClient()
  const { error } = await auth.auth.resetPasswordForEmail(email, { redirectTo: redirect.toString() })
  if (error) console.error('[accounts] password recovery provider failure')
  return { message: 'If an account uses that email, a recovery link has been sent.' }
}

export async function getCurrentAccount(): Promise<ActiveAccount | null> {
  const auth = await createAuthenticatedClient()
  const { data, error } = await auth.auth.getUser()
  if (error || !data.user) return null
  const service = createServiceClient()
  const { data: profile, error: profileError } = await service
    .from('account_profiles')
    .select('user_id, username, role, status')
    .eq('user_id', data.user.id)
    .maybeSingle()
  if (profileError) throw profileError
  if (!profile || profile.status !== 'enabled' || !data.user.email_confirmed_at || !data.user.email) {
    return null
  }
  return { ...(profile as Profile), email: data.user.email }
}

export async function updateAccountPassword(input: unknown) {
  const account = await getCurrentAccount()
  if (!account) throw new AccountServiceError('disabled', 'Sign in again to continue.', 401)
  const values = typeof input === 'object' && input !== null ? input as Record<string, unknown> : {}
  const password = parsePassword(values.password)
  const auth = await createAuthenticatedClient()
  const { error } = await auth.auth.updateUser({ password })
  if (error?.code === 'weak_password') {
    throw new AccountInputError(error.message, 'password')
  }
  if (error) {
    throw new AccountServiceError('retry', 'Unable to update the password. Please try again.', 400)
  }
  return { message: 'Password updated.' }
}

export async function signOutAccount() {
  const auth = await createAuthenticatedClient()
  const { error } = await auth.auth.signOut({ scope: 'local' })
  if (error) {
    throw new AccountServiceError('retry', 'Unable to sign out. Please try again.', 503)
  }
}

export async function profileForAuthUser(user: User) {
  if (!user.email_confirmed_at || !user.email) return null
  const service = createServiceClient()
  const { data, error } = await service
    .from('account_profiles')
    .select('user_id, username, role, status')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error || !data || data.status !== 'enabled') return null
  return data as Profile
}
