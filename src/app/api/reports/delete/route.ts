import { NextResponse } from 'next/server'

import { requireReportAccess } from '@/server/reports/access'
import { reportJsonError } from '@/server/reports/http'
import { deleteEvaluationReports } from '@/server/reports/service'

export async function POST(request: Request) {
  try {
    const account = await requireReportAccess()
    const body: unknown = await request.json().catch(() => ({}))
    const deleted = await deleteEvaluationReports(account, body)
    return NextResponse.json({ deleted })
  } catch (error) {
    return reportJsonError(error)
  }
}
