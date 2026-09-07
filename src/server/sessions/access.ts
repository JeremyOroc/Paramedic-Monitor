import { getCurrentAccount, type ActiveAccount } from '@/server/accounts/service'
import { SessionError } from '@/server/sessions/service'

/** Live Account boundary shared by every Instructor Room route. */
export async function requireRoomAccount(): Promise<ActiveAccount> {
  const account = await getCurrentAccount()
  if (!account) {
    throw new SessionError('Sign in to access this room', 401)
  }
  return account
}
