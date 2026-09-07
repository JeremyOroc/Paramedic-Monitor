import { redirect } from 'next/navigation'

import AdminPage from '@/components/instructor/AdminPage'
import { getCurrentAccount } from '@/server/accounts/service'

export default async function InstructorPage() {
  if (!await getCurrentAccount()) redirect('/instructor/login')
  return <AdminPage />
}
