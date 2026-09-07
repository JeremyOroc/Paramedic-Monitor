import { accountErrorResponse, accountJson } from '@/server/accounts/http'
import { acceptAccountInvitation } from '@/server/accounts/service'
import { assertSameOrigin } from '@/server/accounts/validation'

export async function POST(request: Request) {
  try {
    assertSameOrigin(request)
    return accountJson(await acceptAccountInvitation(await request.json()))
  } catch (error) {
    return accountErrorResponse(error)
  }
}
