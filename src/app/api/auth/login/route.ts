import { accountErrorResponse, accountJson } from '@/server/accounts/http'
import { signInAccount } from '@/server/accounts/service'
import { assertSameOrigin } from '@/server/accounts/validation'

export async function POST(request: Request) {
  try {
    assertSameOrigin(request)
    return accountJson(await signInAccount(await request.json()))
  } catch (error) {
    return accountErrorResponse(error)
  }
}
