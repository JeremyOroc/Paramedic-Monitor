import { accountErrorResponse, accountJson } from '@/server/accounts/http'
import { updateAccountPassword } from '@/server/accounts/service'
import { assertSameOrigin } from '@/server/accounts/validation'

export async function POST(request: Request) {
  try {
    assertSameOrigin(request)
    return accountJson(await updateAccountPassword(await request.json()))
  } catch (error) {
    return accountErrorResponse(error)
  }
}
