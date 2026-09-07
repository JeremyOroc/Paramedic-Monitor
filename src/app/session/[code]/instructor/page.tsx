import { redirect } from 'next/navigation'

import { SessionInstructorClient } from '@/components/session/SessionInstructorClient'
import { getCurrentAccount } from '@/server/accounts/service'

type SessionInstructorPageProps = {
  params: Promise<{ code: string }>
}

export default async function SessionInstructorPage({ params }: SessionInstructorPageProps) {
  const { code } = await params
  if (!await getCurrentAccount()) {
    redirect(`/instructor/login?next=${encodeURIComponent(`/session/${code}/instructor`)}`)
  }
  return <SessionInstructorClient code={code.toUpperCase()} />
}
