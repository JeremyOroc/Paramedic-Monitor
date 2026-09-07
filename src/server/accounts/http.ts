import { NextResponse } from 'next/server'

import { AccountInputError } from '@/server/accounts/validation'

export class AccountServiceError extends Error {
  constructor(
    readonly code:
      | 'disabled'
      | 'invalid_invitation'
      | 'invalid_credentials'
      | 'retry'
      | 'unverified'
      | 'username_taken',
    message: string,
    readonly status = 400,
  ) {
    super(message)
    this.name = 'AccountServiceError'
  }
}

export function accountJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init)
  response.headers.set('Cache-Control', 'no-store')
  return response
}

export function accountErrorResponse(error: unknown) {
  if (error instanceof AccountInputError) {
    return accountJson(
      { error: error.message, field: error.field ?? null, code: 'invalid_input' },
      { status: 400 },
    )
  }
  if (error instanceof AccountServiceError) {
    return accountJson({ error: error.message, code: error.code }, { status: error.status })
  }
  console.error('[accounts] unhandled request failure')
  return accountJson(
    { error: 'The account service is temporarily unavailable.', code: 'retry' },
    { status: 503 },
  )
}
