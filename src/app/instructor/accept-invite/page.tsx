import { redirect } from 'next/navigation'

import { AcceptInvitePage } from '@/components/accounts/AcceptInvitePage'
import { getInviteSetup } from '@/server/accounts/service'

export default async function InviteAcceptancePage() {
  const setup = await getInviteSetup()
  if (!setup) redirect('/instructor/login?error=invitation')
  return <AcceptInvitePage email={setup.email} initialUsername={setup.username} />
}
