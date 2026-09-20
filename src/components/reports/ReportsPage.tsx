'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'

import { ConfirmationDialog } from '@/components/instructor/ConfirmationDialog'
import { EvaluationReportPanel, attemptTitle } from '@/components/instructor/EvaluationReportPanel'
import { InstructorLayout } from '@/components/instructor/InstructorLayout'
import type { EvaluationReport, EvaluationReportSummary, ReportStatus } from '@/server/reports/service'

type ReportListResponse = {
  items: EvaluationReportSummary[]
  total: number
  page: number
  pageSize: number
  error?: string
}

type ReportDetailResponse = { report?: EvaluationReport; error?: string }
type ReportMutationResponse = { report?: EvaluationReportSummary; error?: string }
type ReportDeleteResponse = { deleted?: number; error?: string }

const TORONTO_TIME_ZONE = 'America/Toronto'

function formatToronto(value: string): string {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return 'Unknown date'
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TORONTO_TIME_ZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date)
}

function reportName(report: Pick<EvaluationReportSummary, 'attempt_version' | 'attempt_label'>) {
  return `Attempt ${attemptTitle(report.attempt_version, report.attempt_label)}`
}

function statusClass(status: ReportStatus) {
  return status === 'complete'
    ? 'border-ecg-green/50 bg-ecg-green/10 text-ecg-green'
    : 'border-pending-amber/50 bg-pending-amber/10 text-pending-amber'
}

export function ReportsPage() {
  const [items, setItems] = useState<EvaluationReportSummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | ReportStatus>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [applied, setApplied] = useState({ query: '', status: 'all' as 'all' | ReportStatus, from: '', to: '' })
  const [selected, setSelected] = useState<EvaluationReport | null>(null)
  const [attemptLabel, setAttemptLabel] = useState('')
  const [studentNames, setStudentNames] = useState('')
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteMode, setDeleteMode] = useState(false)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(() => new Set())

  const loadList = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError('')
    const params = new URLSearchParams({
      page: String(page),
      status: applied.status,
      query: applied.query,
    })
    if (applied.from) params.set('from', applied.from)
    if (applied.to) params.set('to', applied.to)
    try {
      const response = await fetch(`/api/reports?${params}`, { signal })
      const result = await response.json() as ReportListResponse
      if (!response.ok) throw new Error(result.error ?? 'Unable to load reports')
      setItems(result.items)
      setTotal(result.total)
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return
      setError(caught instanceof Error ? caught.message : 'Unable to load reports')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [applied, page])

  // The first report fetch and later filter/page fetches synchronize this view
  // with the persistent server collection; the request callback owns updates.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const controller = new AbortController()
    void loadList(controller.signal)
    return () => controller.abort()
  }, [loadList])
  /* eslint-enable react-hooks/set-state-in-effect */

  const openReport = async (id: string) => {
    if (deleteMode) return
    setDetailLoading(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch(`/api/reports/${id}`)
      const result = await response.json() as ReportDetailResponse
      if (!response.ok || !result.report) throw new Error(result.error ?? 'Unable to load report')
      setSelected(result.report)
      setAttemptLabel(result.report.attempt_label)
      setStudentNames(result.report.student_names.join('\n'))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load report')
    } finally {
      setDetailLoading(false)
    }
  }

  const clearDeleteSelection = () => {
    setSelectedReportIds(new Set())
    setBulkDeleteOpen(false)
  }

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    clearDeleteSelection()
    setPage(1)
    setApplied({ query: query.trim(), status, from, to })
  }

  const changePage = (nextPage: number) => {
    clearDeleteSelection()
    setPage(nextPage)
  }

  const saveMetadata = async () => {
    if (!selected || deleteMode) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch(`/api/reports/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptLabel,
          studentNames: studentNames.split('\n'),
        }),
      })
      const result = await response.json() as ReportMutationResponse
      if (!response.ok || !result.report) throw new Error(result.error ?? 'Unable to save report')
      setSelected((current) => current ? { ...current, ...result.report } : current)
      setAttemptLabel(result.report.attempt_label)
      setStudentNames(result.report.student_names.join('\n'))
      setMessage('Report details saved.')
      await loadList()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save report')
    } finally {
      setBusy(false)
    }
  }

  const markComplete = async () => {
    if (!selected || deleteMode) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch(`/api/reports/${selected.id}/complete`, { method: 'POST' })
      const result = await response.json() as ReportMutationResponse
      if (!response.ok || !result.report) throw new Error(result.error ?? 'Unable to complete report')
      setSelected((current) => current ? { ...current, ...result.report } : current)
      setMessage('Report marked complete. Its recorded timeline was not changed.')
      await loadList()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to complete report')
    } finally {
      setBusy(false)
    }
  }

  const refreshAfterDeletion = async (deletedIds: ReadonlySet<string>) => {
    setSelected((current) => current && deletedIds.has(current.id) ? null : current)
    const nextTotal = Math.max(0, total - deletedIds.size)
    const nextPageCount = Math.max(1, Math.ceil(nextTotal / 25))
    setTotal(nextTotal)
    if (page > nextPageCount) {
      setPage(nextPageCount)
    } else {
      await loadList()
    }
  }

  const deleteReport = async () => {
    if (!selected || selected.deletion_blocked || deleteMode) return
    setDeleteOpen(false)
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`/api/reports/${selected.id}`, { method: 'DELETE' })
      if (!response.ok) {
        const result = await response.json() as { error?: string }
        throw new Error(result.error ?? 'Unable to delete report')
      }
      const deletedIds = new Set([selected.id])
      setMessage('Report permanently deleted.')
      await refreshAfterDeletion(deletedIds)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to delete report')
    } finally {
      setBusy(false)
    }
  }

  const deleteSelectedReports = async () => {
    const reportIds = [...selectedReportIds]
    if (reportIds.length === 0) return
    setBulkDeleteOpen(false)
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/reports/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportIds }),
      })
      const result = await response.json() as ReportDeleteResponse
      if (!response.ok || result.deleted !== reportIds.length) {
        throw new Error(result.error ?? 'Unable to delete selected reports')
      }
      const deletedIds = new Set(reportIds)
      setSelectedReportIds(new Set())
      setDeleteMode(false)
      setMessage(`${reportIds.length} reports permanently deleted.`)
      await refreshAfterDeletion(deletedIds)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to delete selected reports')
    } finally {
      setBusy(false)
    }
  }

  const toggleReportSelection = (reportId: string) => {
    setSelectedReportIds((current) => {
      const next = new Set(current)
      if (next.has(reportId)) next.delete(reportId)
      else next.add(reportId)
      return next
    })
  }

  const eligibleReports = items.filter((report) => !report.deletion_blocked)
  const allEligibleSelected = eligibleReports.length > 0
    && eligibleReports.every((report) => selectedReportIds.has(report.id))
  const selectedReports = useMemo(
    () => items.filter((report) => selectedReportIds.has(report.id)),
    [items, selectedReportIds],
  )
  const pageCount = Math.max(1, Math.ceil(total / 25))
  const deleteDescription = selected
    ? `${reportName(selected)} — ${selected.scenario_name}, ${formatToronto(selected.started_at)}. This permanently deletes the report and cannot be recovered.`
    : ''

  const toggleSelectAll = () => {
    setSelectedReportIds(allEligibleSelected
      ? new Set()
      : new Set(eligibleReports.map((report) => report.id)))
  }

  return (
    <InstructorLayout active="reports" title="Reports">
      <form onSubmit={applyFilters} className="grid gap-3 border border-neutral-800 bg-sidebar-bg p-4 lg:grid-cols-[minmax(14rem,1fr)_10rem_10rem_10rem_auto]">
        <label className="grid gap-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">Search</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} maxLength={100} placeholder="Attempt, scenario, or Student" className="border border-neutral-700 bg-black px-3 py-2 text-sm outline-none focus:border-cyan-bp" />
        </label>
        <label className="grid gap-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as 'all' | ReportStatus)} className="border border-neutral-700 bg-black px-3 py-2 text-sm outline-none focus:border-cyan-bp">
            <option value="all">All</option>
            <option value="complete">Complete</option>
            <option value="incomplete">Incomplete</option>
          </select>
        </label>
        <label className="grid gap-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">From (Toronto)</span>
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="border border-neutral-700 bg-black px-3 py-2 text-sm outline-none focus:border-cyan-bp" />
        </label>
        <label className="grid gap-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">To (Toronto)</span>
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="border border-neutral-700 bg-black px-3 py-2 text-sm outline-none focus:border-cyan-bp" />
        </label>
        <button type="submit" className="self-end border border-cyan-bp bg-cyan-bp px-4 py-2 font-mono text-xs font-black uppercase tracking-wider text-black">Apply</button>
      </form>

      {(error || message) && <p role={error ? 'alert' : 'status'} className={`mt-4 text-sm font-semibold ${error ? 'text-pending-amber' : 'text-ecg-green'}`}>{error || message}</p>}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <section aria-label="Report list" className="border border-neutral-800 bg-sidebar-bg">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 px-4 py-3">
            <div>
              <h2 className="font-mono text-xs font-black uppercase tracking-wider text-neutral-400">{total} records</h2>
              <span className="font-mono text-[10px] text-neutral-600">Newest first</span>
            </div>
            {deleteMode ? (
              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" onClick={toggleSelectAll} disabled={eligibleReports.length === 0 || busy} className="border border-neutral-700 px-2 py-1 font-mono text-[10px] font-bold uppercase text-neutral-300 disabled:opacity-30">
                  {allEligibleSelected ? 'Clear page selection' : 'Select all on page'}
                </button>
                <button type="button" onClick={() => setBulkDeleteOpen(true)} disabled={selectedReportIds.size === 0 || busy} className="border border-alarm-red px-2 py-1 font-mono text-[10px] font-bold uppercase text-alarm-red disabled:opacity-30">
                  Delete selected ({selectedReportIds.size})
                </button>
                <button type="button" onClick={() => { setDeleteMode(false); clearDeleteSelection() }} disabled={busy} className="border border-cyan-bp px-2 py-1 font-mono text-[10px] font-bold uppercase text-cyan-bp disabled:opacity-30">Cancel</button>
              </div>
            ) : (
              <button type="button" onClick={() => { setDeleteMode(true); setError(''); setMessage('') }} disabled={items.length === 0 || loading || busy} className="border border-alarm-red px-2 py-1 font-mono text-[10px] font-bold uppercase text-alarm-red disabled:opacity-30">Delete reports</button>
            )}
          </div>
          {loading ? <p className="p-4 text-sm text-neutral-500">Loading reports…</p> : items.length === 0 ? <p className="p-4 text-sm text-neutral-500">No reports match these filters.</p> : (
            <ol className="divide-y divide-neutral-800">
              {items.map((report) => (
                <li key={report.id}>
                  {deleteMode ? (
                    <label className={`grid grid-cols-[auto_minmax(0,1fr)] gap-3 px-4 py-4 ${report.deletion_blocked ? 'cursor-not-allowed bg-neutral-950 opacity-60' : 'cursor-pointer hover:bg-neutral-900'}`}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${reportName(report)} — ${report.scenario_name}`}
                        checked={selectedReportIds.has(report.id)}
                        disabled={report.deletion_blocked || busy}
                        onChange={() => toggleReportSelection(report.id)}
                        className="mt-1 size-4 accent-alarm-red"
                      />
                      <span className="min-w-0">
                        <span className="flex items-center justify-between gap-3">
                          <span className="font-mono text-sm font-black text-white">{reportName(report)}</span>
                          <span className={`border px-2 py-0.5 font-mono text-[9px] font-black uppercase tracking-wider ${statusClass(report.status)}`}>{report.status}</span>
                        </span>
                        <span className="mt-2 block truncate text-sm text-neutral-300">{report.scenario_name}</span>
                        <span className="mt-1 block font-mono text-[10px] text-neutral-600">{formatToronto(report.started_at)}</span>
                        {report.deletion_blocked ? <span className="mt-2 block font-mono text-[10px] font-bold uppercase text-pending-amber">Active Attempt — cannot delete</span> : null}
                      </span>
                    </label>
                  ) : (
                    <button type="button" onClick={() => void openReport(report.id)} aria-current={selected?.id === report.id ? 'true' : undefined} className="w-full px-4 py-4 text-left hover:bg-neutral-900 aria-[current=true]:bg-cyan-bp/10">
                      <span className="flex items-center justify-between gap-3">
                        <span className="font-mono text-sm font-black text-white">{reportName(report)}</span>
                        <span className={`border px-2 py-0.5 font-mono text-[9px] font-black uppercase tracking-wider ${statusClass(report.status)}`}>{report.status}</span>
                      </span>
                      <span className="mt-2 block truncate text-sm text-neutral-300">{report.scenario_name}</span>
                      <span className="mt-1 block font-mono text-[10px] text-neutral-600">{formatToronto(report.started_at)}</span>
                    </button>
                  )}
                </li>
              ))}
            </ol>
          )}
          <div className="grid grid-cols-2 gap-2 border-t border-neutral-800 p-3">
            <button type="button" onClick={() => changePage(Math.max(1, page - 1))} disabled={page <= 1 || loading || busy} className="border border-neutral-700 px-3 py-2 font-mono text-xs uppercase text-neutral-300 disabled:opacity-30">Previous</button>
            <button type="button" onClick={() => changePage(Math.min(pageCount, page + 1))} disabled={page >= pageCount || loading || busy} className="border border-neutral-700 px-3 py-2 font-mono text-xs uppercase text-neutral-300 disabled:opacity-30">Next</button>
            <p className="col-span-2 text-center font-mono text-[10px] text-neutral-600">Page {page} of {pageCount}</p>
          </div>
        </section>

        <section aria-label="Report detail" className="min-w-0">
          {deleteMode ? <p className="mb-3 border border-pending-amber/50 bg-pending-amber/10 px-4 py-2 font-mono text-xs font-bold uppercase text-pending-amber">Delete mode active — report details are temporarily unavailable.</p> : null}
          <fieldset disabled={deleteMode} className="min-w-0 border-0 p-0 disabled:opacity-60">
            {detailLoading ? <p className="border border-neutral-800 bg-sidebar-bg p-6 text-neutral-500">Loading report…</p> : !selected ? (
              <div className="border border-neutral-800 bg-sidebar-bg p-8 text-center text-sm text-neutral-500">Select a report to open its Evaluation record.</div>
            ) : (
              <div className="grid gap-5">
                <div className="border border-neutral-800 bg-sidebar-bg p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-2xl font-black">{reportName(selected)}</h2>
                        <span className={`border px-2 py-1 font-mono text-[10px] font-black uppercase tracking-wider ${statusClass(selected.status)}`}>{selected.status}</span>
                      </div>
                      <p className="mt-2 text-neutral-300">{selected.scenario_name}</p>
                      <p className="mt-1 font-mono text-xs text-neutral-600">Room {selected.source_room_code} · {formatToronto(selected.started_at)}</p>
                      <p className="mt-1 font-mono text-xs text-neutral-600">Defibrillator {selected.defibrillator_model === 'wagamiZ' ? 'Wagami Z' : selected.defibrillator_model === 'wagamiX' ? 'Wagami X' : selected.defibrillator_model === 'wagamiA' ? 'Wagami A' : 'not recorded'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selected.status === 'incomplete' ? <button type="button" onClick={() => void markComplete()} disabled={busy || deleteMode} className="border border-ecg-green px-3 py-2 font-mono text-xs font-black uppercase tracking-wider text-ecg-green disabled:opacity-40">Mark complete</button> : null}
                      <button type="button" onClick={() => setDeleteOpen(true)} disabled={busy || deleteMode || selected.deletion_blocked} className="border border-alarm-red px-3 py-2 font-mono text-xs font-black uppercase tracking-wider text-alarm-red disabled:opacity-40">Delete permanently</button>
                    </div>
                  </div>
                  {selected.deletion_blocked ? <p className="mt-3 font-mono text-xs font-bold uppercase text-pending-amber">Active Attempt — cannot delete</p> : null}
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <label className="grid content-start gap-2">
                      <span className="font-mono text-xs font-black uppercase tracking-wider text-neutral-500">Attempt name</span>
                      <input value={attemptLabel} onChange={(event) => setAttemptLabel(event.target.value)} maxLength={60} placeholder="Optional name" className="border border-neutral-700 bg-black px-3 py-2 text-sm outline-none focus:border-cyan-bp" />
                    </label>
                    <label className="grid gap-2">
                      <span className="font-mono text-xs font-black uppercase tracking-wider text-neutral-500">Student names</span>
                      <textarea value={studentNames} onChange={(event) => setStudentNames(event.target.value)} rows={4} placeholder="One name per line" className="resize-y border border-neutral-700 bg-black px-3 py-2 text-sm outline-none focus:border-cyan-bp" />
                    </label>
                  </div>
                  <button type="button" onClick={() => void saveMetadata()} disabled={busy || deleteMode} className="mt-4 border border-cyan-bp bg-cyan-bp px-4 py-2 font-mono text-xs font-black uppercase tracking-wider text-black disabled:opacity-40">Save details</button>
                </div>
                <EvaluationReportPanel
                  events={selected.events}
                  stateHistory={selected.state_history}
                  attempts={selected.participant_attempts}
                  participants={selected.participants}
                  attemptVersion={selected.attempt_version}
                  baselineAt={selected.started_at}
                  attemptLabels={[{ attempt_version: selected.attempt_version, label: selected.attempt_label }]}
                  copyTimeZone={TORONTO_TIME_ZONE}
                />
              </div>
            )}
          </fieldset>
        </section>
      </div>

      <ConfirmationDialog open={deleteOpen} title="Delete report permanently?" description={deleteDescription} confirmLabel="Delete permanently" onConfirm={() => void deleteReport()} onCancel={() => setDeleteOpen(false)} />
      <ConfirmationDialog
        open={bulkDeleteOpen}
        title={`Delete ${selectedReports.length} reports permanently?`}
        description={(
          <div className="grid gap-3">
            <p>This permanently deletes the selected Evaluation records and cannot be recovered.</p>
            <ul aria-label="Reports selected for deletion" className="max-h-56 space-y-2 overflow-y-auto border border-neutral-800 bg-black p-3">
              {selectedReports.map((report) => (
                <li key={report.id} className="border-b border-neutral-900 pb-2 last:border-0 last:pb-0">
                  <span className="block font-mono text-xs font-bold text-white">{reportName(report)}</span>
                  <span className="block text-xs text-neutral-300">{report.scenario_name}</span>
                  <span className="block font-mono text-[10px] text-neutral-500">{formatToronto(report.started_at)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        confirmLabel={`Delete ${selectedReports.length} reports`}
        onConfirm={() => void deleteSelectedReports()}
        onCancel={() => setBulkDeleteOpen(false)}
      />
    </InstructorLayout>
  )
}
