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
