import { AccountAuthPage } from '@/components/accounts/AccountAuthPage'

interface CheckEmailPageProps {
  searchParams: Promise<{ username?: string }>
}

export default async function CheckEmailPage({ searchParams }: CheckEmailPageProps) {
  const { username } = await searchParams
  return <AccountAuthPage mode="resend" initialUsername={username ?? ''} />
}
