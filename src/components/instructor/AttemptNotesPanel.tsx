'use client'

import type { Ref } from 'react'
import { useState } from 'react'

import {
  GeneralNotesEditor,
  type GeneralNotesEditorHandle,
} from './GeneralNotesEditor'

export const REPORT_NOTE_MAX = 1000

type AttemptNotesPanelProps = {
  generalNotes: string
  onSaveGeneralNotes: (value: string) => Promise<void>
  onSendReportNote: (value: string) => Promise<void>
  generalNotesRef?: Ref<GeneralNotesEditorHandle>
  disabledReason: string | null
}

export function AttemptNotesPanel({
  generalNotes,
  onSaveGeneralNotes,
  onSendReportNote,
  generalNotesRef,
  disabledReason,
}: AttemptNotesPanelProps) {
  const [reportNote, setReportNote] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const disabled = disabledReason !== null

  const send = async () => {
    const body = reportNote.trim()
    if (!body || disabled || sending) return
    setSending(true)
    setError('')
    try {
      await onSendReportNote(body)
      setReportNote('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to send Report Note')
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="mt-1 grid gap-3 border-t border-neutral-800 pt-3" data-testid="attempt-notes-panel">
      <GeneralNotesEditor
        ref={generalNotesRef}
        value={generalNotes}
        onSave={onSaveGeneralNotes}
        disabled={disabled}
        disabledReason={disabledReason ?? undefined}
      />
      <div className="grid gap-2">
        <label className="font-mono text-[10px] font-black uppercase tracking-wider text-neutral-500" htmlFor="report-note-composer">
          Report Note
        </label>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
          <textarea
            id="report-note-composer"
            aria-label="Report Note"
            value={reportNote}
            disabled={disabled || sending}
            maxLength={REPORT_NOTE_MAX}
            rows={2}
            onChange={(event) => {
              setReportNote(event.target.value)
              setError('')
            }}
            placeholder="Add a timestamped note to the report"
            className="min-h-16 resize-y border border-neutral-700 bg-black px-3 py-2 text-sm text-neutral-200 outline-none placeholder:text-neutral-600 focus:border-cyan-bp disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button
            type="button"
            aria-label="Send Report Note"
            onClick={() => void send()}
            disabled={disabled || sending || reportNote.trim().length === 0}
            className="min-h-16 border border-cyan-bp bg-cyan-bp px-4 font-mono text-xs font-black uppercase tracking-wider text-black disabled:cursor-not-allowed disabled:opacity-40"
          >
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
        <div className="flex items-start justify-between gap-3">
          <span className="font-mono text-[9px] text-neutral-600">{reportNote.length}/{REPORT_NOTE_MAX}</span>
          {disabledReason ? <span className="text-right font-mono text-[9px] text-neutral-600">{disabledReason}</span> : null}
        </div>
        {error ? <p role="alert" className="font-mono text-[10px] text-alarm-red">{error}</p> : null}
      </div>
    </section>
  )
}
