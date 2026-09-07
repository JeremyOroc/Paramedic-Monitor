import { beforeEach, describe, expect, it, vi } from 'vitest'

const account = vi.hoisted(() => ({ user_id: 'user-1' }))
const reports = vi.hoisted(() => ({
  listEvaluationReports: vi.fn(),
  getEvaluationReport: vi.fn(),
  updateEvaluationReport: vi.fn(),
  manuallyCompleteEvaluationReport: vi.fn(),
  deleteEvaluationReport: vi.fn(),
}))

vi.mock('@/server/reports/access', () => ({ requireReportAccess: vi.fn().mockResolvedValue(account) }))
vi.mock('@/server/reports/service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/server/reports/service')>()),
  ...reports,
}))

import { DELETE, GET as getDetail, PATCH } from '../[id]/route'
import { POST as complete } from '../[id]/complete/route'
import { GET as getList } from '../route'

const context = { params: Promise.resolve({ id: '51000000-0000-4000-8000-000000000001' }) }

describe('persistent report routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('passes paging, search, status, and date filters to the owner service', async () => {
    reports.listEvaluationReports.mockResolvedValue({ items: [], total: 0, page: 2, pageSize: 25 })
    const response = await getList(new Request('http://localhost/api/reports?page=2&status=incomplete&query=cardiac&from=2026-09-01&to=2026-09-07'))

    expect(response.status).toBe(200)
    expect(reports.listEvaluationReports).toHaveBeenCalledWith(account, {
      page: 2,
      status: 'incomplete',
      query: 'cardiac',
      from: '2026-09-01',
      to: '2026-09-07',
    })
  })

  it('rejects unknown list statuses', async () => {
    const response = await getList(new Request('http://localhost/api/reports?status=deleted'))
    expect(response.status).toBe(400)
    expect(reports.listEvaluationReports).not.toHaveBeenCalled()
  })

  it('routes detail, metadata, completion, and permanent deletion', async () => {
    reports.getEvaluationReport.mockResolvedValue({ id: 'report-1' })
    reports.updateEvaluationReport.mockResolvedValue({ id: 'report-1', attempt_label: 'Morning' })
    reports.manuallyCompleteEvaluationReport.mockResolvedValue({ id: 'report-1', status: 'complete' })
    reports.deleteEvaluationReport.mockResolvedValue(undefined)

    expect((await getDetail(new Request('http://localhost/api/reports/report-1'), context)).status).toBe(200)
    expect((await PATCH(new Request('http://localhost/api/reports/report-1', {
      method: 'PATCH',
      body: JSON.stringify({ attemptLabel: 'Morning', studentNames: ['Alice'] }),
    }), context)).status).toBe(200)
    expect((await complete(new Request('http://localhost/api/reports/report-1/complete', { method: 'POST' }), context)).status).toBe(200)
    expect((await DELETE(new Request('http://localhost/api/reports/report-1', { method: 'DELETE' }), context)).status).toBe(204)

    expect(reports.getEvaluationReport).toHaveBeenCalledWith(account, await context.params.then((value) => value.id))
    expect(reports.updateEvaluationReport).toHaveBeenCalledWith(account, expect.any(String), {
      attemptLabel: 'Morning',
      studentNames: ['Alice'],
    })
    expect(reports.manuallyCompleteEvaluationReport).toHaveBeenCalledWith(account, expect.any(String))
    expect(reports.deleteEvaluationReport).toHaveBeenCalledWith(account, expect.any(String))
  })
})
