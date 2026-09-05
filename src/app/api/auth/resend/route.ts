import { accountErrorResponse, accountJson } from '@/server/accounts/http'
import { resendVerification } from '@/server/accounts/service'
import { assertSameOrigin } from '@/server/accounts/validation'

export async function POST(request: Request) {
  try {
    assertSameOrigin(request)
    return accountJson(await resendVerification(await request.json(), new URL(request.url).origin))
  } catch (error) {
    return accountErrorResponse(error)
  }
}
