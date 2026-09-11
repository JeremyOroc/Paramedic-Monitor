import { redirect } from 'next/navigation'

import AdminPage from '@/components/instructor/AdminPage'
import { getCurrentAccount } from '@/server/accounts/service'
import { getLiveRoomForAccount } from '@/server/sessions/service'

export default async function InstructorPage() {
  const account = await getCurrentAccount()
  if (!account) redirect('/instructor/login')
  const initialExistingRoom = await getLiveRoomForAccount(account)
  return <AdminPage initialExistingRoom={initialExistingRoom} />
}
