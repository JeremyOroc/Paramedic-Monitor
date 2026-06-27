import { NextRequest, NextResponse } from 'next/server'
import { isValidSessionCode } from '@/lib/session'
import { getSessionStatus, joinSession } from '@/server/sessions/service'
import { jsonError } from '@/server/sessions/http'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')?.toUpperCase()

  if (!code || !isValidSessionCode(code)) {
    return NextResponse.json({ error: 'Invalid session code' }, { status: 400 })
  }

  try {
    const { session } = await getSessionStatus(code)
    return NextResponse.json({ session })
  } catch (error) {
    return jsonError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      code?: string
      nickname?: string
      participantToken?: string
    }
    const result = await joinSession(
      body.code ?? '',
      body.nickname ?? '',
      body.participantToken,
    )
    return NextResponse.json(result)
  } catch (error) {
    return jsonError(error)
  }
}
