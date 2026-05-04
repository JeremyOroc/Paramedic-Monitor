import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isValidSessionCode } from '@/lib/session'

export async function GET(request: NextRequest) {
  // TODO: implement — Phase 2
  const code = request.nextUrl.searchParams.get('code')?.toUpperCase()

  if (!code || !isValidSessionCode(code)) {
    return NextResponse.json({ error: 'Invalid session code' }, { status: 400 })
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('sessions')
    .select('id, code')
    .eq('code', code)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  return NextResponse.json({ session: data })
}
