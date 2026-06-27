import { NextResponse } from 'next/server'
import { createSession } from '@/server/sessions/service'
import { jsonError } from '@/server/sessions/http'

export async function POST(request: Request) {
  try {
    const result = await createSession(new URL(request.url).origin)
    return NextResponse.json(result)
  } catch (error) {
    return jsonError(error)
  }
}
