import { AccountAuthPage } from '@/components/accounts/AccountAuthPage'

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams
  return <AccountAuthPage
    mode="login"
    verificationError={error === 'verification' || error === 'invitation'}
  />
}
