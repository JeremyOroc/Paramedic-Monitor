import { hostSessionAction } from '@/server/sessions/http'
import { endSession } from '@/server/sessions/service'

export const POST = hostSessionAction(endSession)
