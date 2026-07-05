import { hostSessionAction } from '@/server/sessions/http'
import { startNewAttempt } from '@/server/sessions/service'

export const POST = hostSessionAction(startNewAttempt)
