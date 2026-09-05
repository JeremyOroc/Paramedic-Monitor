import { accountErrorResponse, accountJson } from '@/server/accounts/http'
import { registerAccount } from '@/server/accounts/service'
import { assertSameOrigin } from '@/server/accounts/validation'

export async function POST(request: Request) {
  try {
    assertSameOrigin(request)
    return accountJson(await registerAccount(await request.json(), new URL(request.url).origin))
  } catch (error) {
    return accountErrorResponse(error)
  }
}
