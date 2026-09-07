import { redirect } from 'next/navigation'

import { ReportsPage } from '@/components/reports/ReportsPage'
import { getCurrentAccount } from '@/server/accounts/service'

export default async function InstructorReportsPage() {
  if (!await getCurrentAccount()) redirect('/instructor/login')
  return <ReportsPage />
}
