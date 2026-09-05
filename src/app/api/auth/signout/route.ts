import { accountErrorResponse, accountJson } from '@/server/accounts/http'
import { signOutAccount } from '@/server/accounts/service'
import { assertSameOrigin } from '@/server/accounts/validation'

export async function POST(request: Request) {
  try {
    assertSameOrigin(request)
    await signOutAccount()
    return accountJson({ ok: true })
  } catch (error) {
    return accountErrorResponse(error)
  }
}
