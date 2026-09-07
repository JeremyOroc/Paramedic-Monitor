import { NextResponse } from 'next/server'

import { ReportError } from '@/server/reports/service'

export function reportJsonError(error: unknown) {
  if (error instanceof ReportError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  return NextResponse.json({ error: 'Unexpected report error' }, { status: 500 })
}
