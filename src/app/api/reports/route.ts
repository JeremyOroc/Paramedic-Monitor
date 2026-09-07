import { NextResponse } from 'next/server'

import { requireReportAccess } from '@/server/reports/access'
import { reportJsonError } from '@/server/reports/http'
import { listEvaluationReports } from '@/server/reports/service'

export async function GET(request: Request) {
  try {
    const account = await requireReportAccess()
    const params = new URL(request.url).searchParams
    const rawPage = Number.parseInt(params.get('page') ?? '1', 10)
    const status = params.get('status') ?? 'all'
    if (status !== 'all' && status !== 'complete' && status !== 'incomplete') {
      return NextResponse.json({ error: 'Invalid report status' }, { status: 400 })
    }
    return NextResponse.json(await listEvaluationReports(account, {
      status,
      query: params.get('query') ?? '',
      from: params.get('from') ?? undefined,
      to: params.get('to') ?? undefined,
      page: rawPage,
    }))
  } catch (error) {
    return reportJsonError(error)
  }
}
