import { getCurrentAccount, type ActiveAccount } from '@/server/accounts/service'
import { ReportError } from '@/server/reports/service'

export async function requireReportAccess(): Promise<ActiveAccount> {
  const account = await getCurrentAccount()
  if (!account) throw new ReportError('Sign in to access reports', 401)
  return account
}
