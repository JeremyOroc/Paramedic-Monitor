import { redirect } from 'next/navigation'

import { AccountAuthPage } from '@/components/accounts/AccountAuthPage'
import { getCurrentAccount } from '@/server/accounts/service'

export default async function ResetPasswordPage() {
  if (!await getCurrentAccount()) redirect('/instructor/login')
  return <AccountAuthPage mode="reset" />
}
