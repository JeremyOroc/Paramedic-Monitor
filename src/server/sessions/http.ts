import { NextResponse } from 'next/server'
import { SessionError } from './service'

export function jsonError(error: unknown) {
  if (error instanceof SessionError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  const message = error instanceof Error ? error.message : 'Unexpected session error'
  return NextResponse.json({ error: message }, { status: 500 })
}

export function hostTokenFromRequest(request: Request): string {
  return request.headers.get('x-session-host-token') ?? ''
}

export function participantTokenFromRequest(request: Request): string {
  return request.headers.get('x-session-participant-token') ?? ''
}

type SessionRouteContext = {
  params: Promise<{ code: string }>
}

/**
 * Builds the POST handler for a host-token session action (start, end, new
 * attempt): reads the room code and host token, runs the action, and returns
 * `{ session }` or the mapped session error.
 */
export function hostSessionAction<T>(
  action: (code: string, hostToken: string) => Promise<T>,
) {
  return async function POST(request: Request, { params }: SessionRouteContext) {
    try {
      const { code } = await params
      const session = await action(code, hostTokenFromRequest(request))
      return NextResponse.json({ session })
    } catch (error) {
      return jsonError(error)
    }
  }
}
