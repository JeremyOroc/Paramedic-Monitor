import { redirect } from 'next/navigation'

import { AccountPanel } from '@/components/accounts/AccountPanel'
import { getCurrentAccount } from '@/server/accounts/service'

export default async function AccountPage() {
  const account = await getCurrentAccount()
  if (!account) redirect('/instructor/login')
  return <AccountPanel email={account.email} role={account.role} username={account.username} />
}
