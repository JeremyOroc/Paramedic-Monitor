import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateSessionCode } from '@/lib/session'

export async function POST() {
  // TODO: implement — Phase 2
  const supabase = createClient()
  const code = generateSessionCode()

  const { error } = await supabase
    .from('sessions')
    .insert({ code })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ code })
}
