import { getCurrentAccount, type ActiveAccount } from '@/server/accounts/service'
import { ScenarioLibraryError } from '@/server/scenarios/service'

/** Single live Account boundary shared by every scenario-library route. */
export async function requireScenarioLibraryAccess(request: Request): Promise<ActiveAccount> {
  void request
  const account = await getCurrentAccount()
  if (!account) {
    throw new ScenarioLibraryError('Sign in to access scenarios', 401)
  }
  return account
}
