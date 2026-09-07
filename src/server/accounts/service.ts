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
  parseUsername,
} from '@/server/accounts/validation'

type Profile = {
  user_id: string
  username: string
  role: 'instructor' | 'administrator'
  status: 'enabled' | 'disabled'
}

export type ActiveAccount = Profile & { email: string }
export type InviteSetup = {
  email: string
  username: string | null
  role: Profile['role'] | null
}

const USERNAME_TAKEN = 'That username already exists. Please use another username.'

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

async function getProfileForUser(userId: string) {
  const service = createServiceClient()
  const { data, error } = await service
    .from('account_profiles')
    .select('user_id, username, role, status')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data as Profile | null
}

function isVerifiedInvite(user: User | null): user is User & { email: string; invited_at: string } {
  return Boolean(user?.email && user.email_confirmed_at && user.invited_at)
}

async function getVerifiedInvitedUser() {
  const auth = await createAuthenticatedClient()
  const { data, error } = await auth.auth.getUser()
  if (error || !isVerifiedInvite(data.user)) {
    throw new AccountServiceError(
      'invalid_invitation',
      'This invitation is invalid or has expired. Ask a Product operator for a new invitation.',
      401,
    )
  }
  return { auth, user: data.user }
}

export async function getInviteSetup(): Promise<InviteSetup | null> {
  try {
    const { user } = await getVerifiedInvitedUser()
    const profile = await getProfileForUser(user.id)
    if (profile?.status === 'disabled') return null
    return {
      email: user.email,
      username: profile?.username ?? null,
      role: profile?.role ?? null,
    }
  } catch {
    return null
  }
}

export async function acceptAccountInvitation(input: unknown) {
  const values = typeof input === 'object' && input !== null ? input as Record<string, unknown> : {}
  const password = parsePassword(values.password)
  const { auth, user } = await getVerifiedInvitedUser()
  const existingProfile = await getProfileForUser(user.id)

  if (existingProfile?.status === 'disabled') {
    throw new AccountServiceError('disabled', 'This account has been disabled. Contact support.', 403)
  }

  let username = existingProfile?.username
  if (!existingProfile) {
    const parsed = parseUsername(values.username)
    username = parsed.username
    const service = createServiceClient()
    const [profileResult, reservedResult] = await Promise.all([
      service.from('account_profiles').select('user_id').eq('normalized_username', parsed.normalizedUsername).maybeSingle(),
      service.from('reserved_account_usernames').select('username').eq('normalized_username', parsed.normalizedUsername).maybeSingle(),
    ])
    if (profileResult.error || reservedResult.error) {
      throw new AccountServiceError('retry', 'Invitation setup is temporarily unavailable.', 503)
    }
    if (profileResult.data || reservedResult.data) {
      throw new AccountServiceError('username_taken', USERNAME_TAKEN, 409)
    }
  }

  const { error: passwordError } = await auth.auth.updateUser({ password })
  if (passwordError?.code === 'weak_password') {
    throw new AccountInputError(passwordError.message, 'password')
  }
  if (passwordError) {
    throw new AccountServiceError('retry', 'Unable to set the password. Please try again.', 503)
  }

  if (existingProfile) {
    return { username: existingProfile.username, role: existingProfile.role }
  }

  const service = createServiceClient()
  const { error: profileError } = await service.from('account_profiles').insert({
    user_id: user.id,
    username: username!,
    role: 'instructor',
    status: 'enabled',
  })
  if (!profileError) return { username: username!, role: 'instructor' as const }
  if (profileError.code === '23505' || profileError.code === '23514') {
    throw new AccountServiceError('username_taken', USERNAME_TAKEN, 409)
  }
  throw new AccountServiceError('retry', 'Unable to finish invitation setup. Please try again.', 503)
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
    throw new AccountServiceError('unverified', 'Accept your invitation to continue.', 403)
  }
  const auth = await createAuthenticatedClient()
  const { data, error } = await auth.auth.signInWithPassword({ email: user.email, password })
  if (error || data.user.id !== profile.user_id) {
    if (data.session) await auth.auth.signOut({ scope: 'local' })
    throw new AccountServiceError('invalid_credentials', 'Invalid username or password.', 401)
  }
  return { username: profile.username, role: profile.role }
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
