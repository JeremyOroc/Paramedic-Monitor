'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'

import { cn } from '@/lib/utils'

export const GENERAL_NOTES_MAX = 4000

export type GeneralNotesEditorHandle = {
  flush: () => Promise<boolean>
}

type GeneralNotesEditorProps = {
  value: string
  onSave: (value: string) => Promise<void>
  draftValue?: string
  onDraftChange?: (value: string) => void
  saveMode?: 'auto' | 'manual'
  disabled?: boolean
  disabledReason?: string
  showEditButton?: boolean
  initiallyEditing?: boolean
  className?: string
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export const GeneralNotesEditor = forwardRef<
  GeneralNotesEditorHandle,
  GeneralNotesEditorProps
>(function GeneralNotesEditor(
  {
    value = '',
    onSave,
    draftValue,
    onDraftChange,
    saveMode = 'auto',
    disabled = false,
    disabledReason,
    showEditButton = false,
    initiallyEditing = true,
    className,
  },
  ref,
) {
  const [localDraft, setLocalDraft] = useState(value)
  const [editing, setEditing] = useState(initiallyEditing && !disabled)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [error, setError] = useState('')
  const savedRef = useRef(value)
  const draftRef = useRef(value)
  const inFlightRef = useRef<Promise<boolean> | null>(null)

  const draft = draftValue ?? localDraft
  const dirty = draft !== value

  const updateDraft = useCallback((next: string) => {
    draftRef.current = next
    if (draftValue === undefined) setLocalDraft(next)
    onDraftChange?.(next)
  }, [draftValue, onDraftChange])

  useEffect(() => {
    const previousSaved = savedRef.current
    const wasClean = draftRef.current === previousSaved
    const confirmsLocalSave = value === savedRef.current
    savedRef.current = value
    if (wasClean) {
      draftRef.current = value
      if (draftValue === undefined) setLocalDraft(value)
      if (!confirmsLocalSave) setSaveState('idle')
      setError('')
    }
  }, [draftValue, value])

  useEffect(() => {
    draftRef.current = draft
  }, [draft])

  const saveNow = useCallback(async (): Promise<boolean> => {
    if (disabled) return false
    if (inFlightRef.current) return inFlightRef.current
    const request = (async () => {
      setSaveState('saving')
      setError('')
      try {
        if (saveMode === 'manual') {
          const next = draftRef.current
          if (next !== savedRef.current) {
            await onSave(next)
            savedRef.current = next
          }
          setSaveState(draftRef.current === next ? 'saved' : 'idle')
        } else {
          while (draftRef.current !== savedRef.current) {
            const next = draftRef.current
            await onSave(next)
            savedRef.current = next
          }
          setSaveState('saved')
        }
        return true
      } catch (caught) {
        setSaveState('error')
        setError(caught instanceof Error ? caught.message : 'Unable to save General Notes')
        return false
      } finally {
        inFlightRef.current = null
      }
    })()
    inFlightRef.current = request
    return request
  }, [disabled, onSave, saveMode])

  useImperativeHandle(ref, () => ({ flush: saveNow }), [saveNow])

  useEffect(() => {
    if (saveMode !== 'auto' || disabled || !editing || draft === savedRef.current) return
    const timer = window.setTimeout(() => void saveNow(), 700)
    return () => window.clearTimeout(timer)
  }, [disabled, draft, editing, saveMode, saveNow])

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (draftRef.current === savedRef.current) return
      event.preventDefault()
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [])

  const finishEditing = async () => {
    if (await saveNow()) setEditing(false)
  }

  const revert = () => {
    updateDraft(savedRef.current)
    setSaveState('idle')
    setError('')
  }

  const statusText = saveState === 'saving'
    ? 'Saving…'
    : saveState === 'saved'
      ? 'Saved'
      : saveState === 'error'
        ? 'Save failed'
        : saveMode === 'manual' && dirty
          ? 'Unsaved'
        : ''

  return (
    <section className={cn('grid gap-2', className)} aria-label="General Notes">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h3 className="font-mono text-[10px] font-black uppercase tracking-wider text-neutral-500">
            General Notes
          </h3>
          {statusText ? (
            <span
              role={saveState === 'error' ? 'alert' : 'status'}
              className={cn(
                'font-mono text-[10px]',
                saveState === 'error' ? 'text-alarm-red' : 'text-neutral-500',
              )}
            >
              {statusText}
            </span>
          ) : null}
        </div>
        {saveMode === 'manual' ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Revert General Notes"
              onClick={revert}
              disabled={disabled || saveState === 'saving' || !dirty}
              className="border border-neutral-700 px-3 py-1 font-mono text-[10px] font-black uppercase tracking-wider text-neutral-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Revert
            </button>
            <button
              type="button"
              aria-label="Save General Notes"
              onClick={() => void saveNow()}
              disabled={disabled || saveState === 'saving' || !dirty}
              className="border border-cyan-bp bg-cyan-bp px-3 py-1 font-mono text-[10px] font-black uppercase tracking-wider text-black disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saveState === 'saving' ? 'Saving…' : 'Save'}
            </button>
          </div>
        ) : showEditButton ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => editing ? void finishEditing() : setEditing(true)}
            className="border border-cyan-bp px-3 py-1 font-mono text-[10px] font-black uppercase tracking-wider text-cyan-bp disabled:opacity-40"
          >
            {editing ? 'Done' : 'Edit'}
          </button>
        ) : null}
      </div>
      {editing ? (
        <textarea
          aria-label="General Notes"
          value={draft}
          disabled={disabled}
          maxLength={GENERAL_NOTES_MAX}
          rows={5}
          onChange={(event) => {
            const next = event.target.value
            updateDraft(next)
            setSaveState('idle')
            setError('')
          }}
          onBlur={saveMode === 'auto' ? () => void saveNow() : undefined}
          placeholder="General notes for this Attempt"
          className="min-h-28 w-full resize-y border border-neutral-700 bg-black px-3 py-2 text-sm text-neutral-200 outline-none placeholder:text-neutral-600 focus:border-cyan-bp disabled:cursor-not-allowed disabled:opacity-50"
        />
      ) : (
        <div
          data-testid="general-notes-view"
          className="min-h-20 whitespace-pre-wrap break-words border border-neutral-800 bg-black px-3 py-2 text-sm text-neutral-300"
        >
          {draft || <span className="text-neutral-600">No General Notes.</span>}
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <span className="font-mono text-[9px] text-neutral-600">
          {draft.length}/{GENERAL_NOTES_MAX}
        </span>
        {disabledReason ? (
          <span className="text-right font-mono text-[9px] text-neutral-600">{disabledReason}</span>
        ) : null}
      </div>
      {error ? <p role="alert" className="font-mono text-[10px] text-alarm-red">{error}</p> : null}
    </section>
  )
})
