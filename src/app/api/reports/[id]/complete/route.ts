import { NextResponse } from 'next/server'

import { requireReportAccess } from '@/server/reports/access'
import { reportJsonError } from '@/server/reports/http'
import { manuallyCompleteEvaluationReport } from '@/server/reports/service'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const account = await requireReportAccess()
    const { id } = await params
    return NextResponse.json({ report: await manuallyCompleteEvaluationReport(account, id) })
  } catch (error) {
    return reportJsonError(error)
  }
}
