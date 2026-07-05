import { hostSessionAction } from '@/server/sessions/http'
import { startSession } from '@/server/sessions/service'

export const POST = hostSessionAction(startSession)
