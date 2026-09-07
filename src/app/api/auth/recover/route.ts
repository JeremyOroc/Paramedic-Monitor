import { accountErrorResponse, accountJson } from '@/server/accounts/http'
import { requestPasswordRecovery } from '@/server/accounts/service'
import { assertSameOrigin } from '@/server/accounts/validation'

export async function POST(request: Request) {
  try {
    assertSameOrigin(request)
    return accountJson(await requestPasswordRecovery(await request.json(), new URL(request.url).origin))
  } catch (error) {
    return accountErrorResponse(error)
  }
}
