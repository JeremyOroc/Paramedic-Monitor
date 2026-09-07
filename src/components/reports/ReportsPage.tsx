'use client'

import Link from 'next/link'
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'

import { ConfirmationDialog } from '@/components/instructor/ConfirmationDialog'
import { EvaluationReportPanel, attemptTitle } from '@/components/instructor/EvaluationReportPanel'
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

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPage(1)
    setApplied({ query: query.trim(), status, from, to })
  }

  const saveMetadata = async () => {
    if (!selected) return
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
    if (!selected) return
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

  const deleteReport = async () => {
    if (!selected) return
    setDeleteOpen(false)
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`/api/reports/${selected.id}`, { method: 'DELETE' })
      if (!response.ok) {
        const result = await response.json() as { error?: string }
        throw new Error(result.error ?? 'Unable to delete report')
      }
      setSelected(null)
      setMessage('Report permanently deleted.')
      await loadList()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to delete report')
    } finally {
      setBusy(false)
    }
  }

  const pageCount = Math.max(1, Math.ceil(total / 25))
  const deleteDescription = useMemo(() => selected
    ? `${reportName(selected)} — ${selected.scenario_name}, ${formatToronto(selected.started_at)}. This permanently deletes the report and cannot be recovered.`
    : '', [selected])

  return (
    <main className="min-h-screen bg-monitor-bg px-5 py-8 text-white">
      <div className="mx-auto w-full max-w-7xl">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-800 pb-6">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-cyan-bp">Instructor console</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Reports</h1>
            <p className="mt-2 text-sm text-neutral-400">Persistent Evaluation records for your Account.</p>
          </div>
          <nav aria-label="Instructor" className="flex gap-2">
            <Link href="/admin" className="border border-cyan-bp px-4 py-2 font-mono text-xs font-black uppercase tracking-wider text-cyan-bp hover:bg-cyan-bp/10">Console</Link>
            <Link href="/instructor/account" className="border border-neutral-700 px-4 py-2 font-mono text-xs font-black uppercase tracking-wider text-neutral-300 hover:border-cyan-bp hover:text-cyan-bp">Account</Link>
          </nav>
        </header>

        <form onSubmit={applyFilters} className="mt-6 grid gap-3 border border-neutral-800 bg-sidebar-bg p-4 lg:grid-cols-[minmax(14rem,1fr)_10rem_10rem_10rem_auto]">
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
            <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
              <h2 className="font-mono text-xs font-black uppercase tracking-wider text-neutral-400">{total} records</h2>
              <span className="font-mono text-[10px] text-neutral-600">Newest first</span>
            </div>
            {loading ? <p className="p-4 text-sm text-neutral-500">Loading reports…</p> : items.length === 0 ? <p className="p-4 text-sm text-neutral-500">No reports match these filters.</p> : (
              <ol className="divide-y divide-neutral-800">
                {items.map((report) => (
                  <li key={report.id}>
                    <button type="button" onClick={() => void openReport(report.id)} aria-current={selected?.id === report.id ? 'true' : undefined} className="w-full px-4 py-4 text-left hover:bg-neutral-900 aria-[current=true]:bg-cyan-bp/10">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-sm font-black text-white">{reportName(report)}</span>
                        <span className={`border px-2 py-0.5 font-mono text-[9px] font-black uppercase tracking-wider ${statusClass(report.status)}`}>{report.status}</span>
                      </div>
                      <p className="mt-2 truncate text-sm text-neutral-300">{report.scenario_name}</p>
                      <p className="mt-1 font-mono text-[10px] text-neutral-600">{formatToronto(report.started_at)}</p>
                    </button>
                  </li>
                ))}
              </ol>
            )}
            <div className="grid grid-cols-2 gap-2 border-t border-neutral-800 p-3">
              <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1 || loading} className="border border-neutral-700 px-3 py-2 font-mono text-xs uppercase text-neutral-300 disabled:opacity-30">Previous</button>
              <button type="button" onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={page >= pageCount || loading} className="border border-neutral-700 px-3 py-2 font-mono text-xs uppercase text-neutral-300 disabled:opacity-30">Next</button>
              <p className="col-span-2 text-center font-mono text-[10px] text-neutral-600">Page {page} of {pageCount}</p>
            </div>
          </section>

          <section aria-label="Report detail" className="min-w-0">
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
                      <p className="mt-1 font-mono text-xs text-neutral-600">Defibrillator {selected.defibrillator_model === 'wagamiZ' ? 'Wagami Z' : selected.defibrillator_model === 'wagamiX' ? 'Wagami X' : 'not recorded'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selected.status === 'incomplete' && <button type="button" onClick={() => void markComplete()} disabled={busy} className="border border-ecg-green px-3 py-2 font-mono text-xs font-black uppercase tracking-wider text-ecg-green disabled:opacity-40">Mark complete</button>}
                      <button type="button" onClick={() => setDeleteOpen(true)} disabled={busy} className="border border-alarm-red px-3 py-2 font-mono text-xs font-black uppercase tracking-wider text-alarm-red disabled:opacity-40">Delete permanently</button>
                    </div>
                  </div>
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
                  <button type="button" onClick={() => void saveMetadata()} disabled={busy} className="mt-4 border border-cyan-bp bg-cyan-bp px-4 py-2 font-mono text-xs font-black uppercase tracking-wider text-black disabled:opacity-40">Save details</button>
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
          </section>
        </div>
      </div>
      <ConfirmationDialog open={deleteOpen} title="Delete report permanently?" description={deleteDescription} confirmLabel="Delete permanently" onConfirm={() => void deleteReport()} onCancel={() => setDeleteOpen(false)} />
    </main>
  )
}
