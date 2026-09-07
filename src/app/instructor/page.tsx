import { redirect } from 'next/navigation'

import { getCurrentAccount } from '@/server/accounts/service'

export default async function InstructorPage() {
  if (!await getCurrentAccount()) redirect('/instructor/login')
  redirect('/instructor/account')
}
