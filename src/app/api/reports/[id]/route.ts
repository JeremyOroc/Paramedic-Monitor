import { NextResponse } from 'next/server'

import { requireReportAccess } from '@/server/reports/access'
import { reportJsonError } from '@/server/reports/http'
import {
  deleteEvaluationReport,
  getEvaluationReport,
  updateEvaluationReport,
} from '@/server/reports/service'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const account = await requireReportAccess()
    const { id } = await params
    return NextResponse.json({ report: await getEvaluationReport(account, id) })
  } catch (error) {
    return reportJsonError(error)
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const account = await requireReportAccess()
    const { id } = await params
    const body: unknown = await request.json().catch(() => ({}))
    return NextResponse.json({ report: await updateEvaluationReport(account, id, body) })
  } catch (error) {
    return reportJsonError(error)
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const account = await requireReportAccess()
    const { id } = await params
    await deleteEvaluationReport(account, id)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return reportJsonError(error)
  }
}
