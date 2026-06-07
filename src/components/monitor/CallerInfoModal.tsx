'use client'

import {
  CALLER_INFO_DISPLAY_FIELDS,
  hasCallerInfo,
  type CallerInfo,
  type CallerInfoField,
} from '@/types/callerInfo'
import { cn } from '@/lib/utils'

export type CallerEventKey = 'acknowledge' | 'arrival' | 'transport'
export type CallerInfoVariant = 'classic' | 'assignment'

type CallerInfoModalProps = {
  open: boolean
  info: CallerInfo
  onCallerEvent: (key: CallerEventKey) => void
  /** Per-button disabled state, computed by the parent from the dispatch gate. */
  buttonState: Record<CallerEventKey, { disabled: boolean }>
  /** Show the dispatch ETA countdown (locked phase only). */
  showCountdown?: boolean
  countdownFormatted?: string
  /** Locked dispatch mode uses this as a touchscreen that fills the monitor display. */
  fullScreen?: boolean
  /** A/B switch: classic tablet or icon-led assignment dashboard. */
  variant?: CallerInfoVariant
}

const CALLER_EVENT_BUTTONS: {
  key: CallerEventKey
  label: string
  assignmentClassName: string
}[] = [
  {
    key: 'acknowledge',
    label: 'Acknowledge',
    assignmentClassName: 'border-dispatch-green bg-dispatch-green text-black',
  },
  {
    key: 'arrival',
    label: 'Arrival',
    assignmentClassName: 'border-dispatch-yellow bg-dispatch-yellow text-black',
  },
  {
    key: 'transport',
    label: 'Transport',
    assignmentClassName: 'border-neutral-600 bg-dispatch-panel-soft text-white',
  },
]

type AssignmentIconName =
  | 'bell'
  | 'location'
  | 'medical'
  | 'clock'
  | 'caller'
  | 'patient'
  | 'note'
  | 'alert'

const ASSIGNMENT_FIELD_META: Partial<Record<CallerInfoField, {
  label: string
  icon: AssignmentIconName
  colorClassName: string
}>> = {
  interventionPriorityCode: {
    label: 'Priority',
    icon: 'bell',
    colorClassName: 'text-dispatch-red',
  },
  address: {
    label: 'Address',
    icon: 'location',
    colorClassName: 'text-dispatch-blue',
  },
  problem: {
    label: 'Nature of Call',
    icon: 'medical',
    colorClassName: 'text-dispatch-yellow',
  },
  time: {
    label: 'Call Received',
    icon: 'clock',
    colorClassName: 'text-dispatch-green',
  },
  information: {
    label: 'Caller Info',
    icon: 'caller',
    colorClassName: 'text-dispatch-purple',
  },
  update: {
    label: 'Updates',
    icon: 'patient',
    colorClassName: 'text-dispatch-blue',
  },
  extra1: {
    label: 'Notes',
    icon: 'note',
    colorClassName: 'text-dispatch-yellow',
  },
  extra2: {
    label: 'Hazards / Alerts',
    icon: 'alert',
    colorClassName: 'text-dispatch-red',
  },
  extra3: {
    label: 'Additional Info',
    icon: 'note',
    colorClassName: 'text-dispatch-orange',
  },
}

export function CallerInfoModal({
  open,
  info,
  onCallerEvent,
  buttonState,
  showCountdown = false,
  countdownFormatted = '00:00',
  fullScreen = false,
  variant = 'assignment',
}: CallerInfoModalProps) {
  if (!open) return null

  const hasInfo = hasCallerInfo(info)
  const displayFields = CALLER_INFO_DISPLAY_FIELDS.filter(({ field, labelField }) => {
    if (!labelField) return true
    return info[field].trim() !== '' || info[labelField].trim() !== ''
  })

  return (
    <section
      aria-label="Caller info"
      className={cn(
        'absolute z-30 font-sans',
        fullScreen ? 'inset-0' : 'left-[56px] top-[56px] bottom-0 right-0',
      )}
    >
      <div
        className={cn(
          'flex h-full w-full items-center justify-center overflow-hidden',
          fullScreen ? 'bg-dispatch-wall p-5' : 'bg-black/80 p-4',
        )}
      >
        <div
          data-testid="dispatch-tablet-frame"
          className={cn(
            'relative flex overflow-hidden rounded-[22px] border-[7px] border-dispatch-bezel bg-dispatch-bezel shadow-2xl',
            variant === 'assignment'
              ? fullScreen
                ? 'h-[92%] w-[94%] max-w-[780px]'
                : 'h-[94%] w-[92%] min-w-[390px] max-w-[740px]'
              : fullScreen
                ? 'h-[90%] w-[88%] max-w-[720px]'
                : 'h-[92%] w-[84%] min-w-[360px] max-w-[680px]',
          )}
        >
          <div className="absolute left-1/2 top-2 z-10 h-1.5 w-12 -translate-x-1/2 rounded-full bg-neutral-800" />
          {variant === 'classic' ? (
            <ClassicCallerInfoContent
              info={info}
              hasInfo={hasInfo}
              displayFields={displayFields}
              showCountdown={showCountdown}
              countdownFormatted={countdownFormatted}
              buttonState={buttonState}
              onCallerEvent={onCallerEvent}
            />
          ) : (
            <AssignmentCallerInfoContent
              info={info}
              hasInfo={hasInfo}
              displayFields={displayFields}
              showCountdown={showCountdown}
              countdownFormatted={countdownFormatted}
              buttonState={buttonState}
              onCallerEvent={onCallerEvent}
            />
          )}
        </div>
      </div>
    </section>
  )
}

type DisplayField = (typeof CALLER_INFO_DISPLAY_FIELDS)[number]

type CallerInfoContentProps = {
  info: CallerInfo
  hasInfo: boolean
  displayFields: DisplayField[]
  showCountdown: boolean
  countdownFormatted: string
  buttonState: Record<CallerEventKey, { disabled: boolean }>
  onCallerEvent: (key: CallerEventKey) => void
}

function ClassicCallerInfoContent({
  info,
  hasInfo,
  displayFields,
  showCountdown,
  countdownFormatted,
  buttonState,
  onCallerEvent,
}: CallerInfoContentProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[14px] border border-neutral-900 bg-dispatch-paper text-dispatch-ink">
      <header className="border-b border-dispatch-line px-5 pb-3 pt-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-dispatch-muted">
              Dispatch Tablet
            </p>
            <h2 className="mt-1 text-2xl font-black leading-none tracking-normal">
              Caller Info
            </h2>
          </div>
        </div>
        {showCountdown && (
          <div
            aria-label="Dispatch countdown"
            className="mt-3 flex items-center justify-between rounded-md border border-dispatch-line bg-dispatch-field px-3 py-2"
          >
            <span className="text-[11px] font-black uppercase tracking-[0.16em] text-dispatch-muted">
              ETA
            </span>
            <span className="font-mono text-2xl font-black tabular-nums text-dispatch-ink">
              {countdownFormatted}
            </span>
          </div>
        )}
      </header>
      <div className="min-h-0 flex-1 overflow-hidden px-5 py-4">
        {hasInfo ? (
          <ul className="grid gap-2">
            {displayFields.map(({ field, label, labelField }) => (
              <li
                key={field}
                className="grid grid-cols-[minmax(110px,0.82fr)_minmax(0,1.18fr)] overflow-hidden rounded-md border border-dispatch-line bg-dispatch-field"
              >
                <span className="border-r border-dispatch-line px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-dispatch-muted">
                  {labelField && info[labelField].trim() !== '' ? info[labelField] : label}
                </span>
                <span className="flex min-w-0 items-center px-3 py-2 text-sm font-bold leading-tight text-dispatch-ink">
                  {info[field] || '-'}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm font-bold text-dispatch-muted">
            Aucune information d&apos;appel.
          </p>
        )}
      </div>
      <CallerEventButtons
        variant="classic"
        buttonState={buttonState}
        onCallerEvent={onCallerEvent}
      />
    </div>
  )
}

function AssignmentCallerInfoContent({
  info,
  hasInfo,
  displayFields,
  showCountdown,
  countdownFormatted,
  buttonState,
  onCallerEvent,
}: CallerInfoContentProps) {
  return (
    <div
      data-testid="assignment-dashboard"
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[14px] border border-neutral-800 bg-dispatch-panel text-white"
    >
      <header className="shrink-0 border-b border-neutral-700 px-4 pb-2 pt-3">
        <div className="grid grid-cols-[1fr_auto] items-start gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-dispatch-panel-soft text-dispatch-orange">
              <AssignmentIcon name="bell" />
            </span>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-dispatch-green">
                Connected
              </p>
              <h2 className="mt-0.5 text-lg font-black uppercase leading-none tracking-normal">
                New Assignment
              </h2>
            </div>
          </div>
          {showCountdown && (
            <div
              aria-label="Dispatch countdown"
              className="rounded-md border border-neutral-700 bg-black/30 px-2.5 py-1.5 text-right"
            >
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-neutral-400">
                Response Timer
              </p>
              <p className="font-mono text-xl font-black tabular-nums text-dispatch-red">
                {countdownFormatted}
              </p>
            </div>
          )}
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-hidden px-4 py-2">
        {hasInfo ? (
          <ul className="grid gap-1">
            {displayFields.map(({ field, label, labelField }) => {
              const meta = ASSIGNMENT_FIELD_META[field]
              const resolvedLabel =
                labelField && info[labelField].trim() !== ''
                  ? info[labelField]
                  : meta?.label ?? label
              return (
                <li
                  key={field}
                  data-testid={`assignment-info-${field}`}
                  className="grid min-h-[34px] grid-cols-[32px_1fr] gap-2 border-b border-neutral-800 pb-1 last:border-b-0"
                >
                  <span
                    className={cn(
                      'mt-0.5 grid h-6 w-6 place-items-center',
                      meta?.colorClassName ?? 'text-dispatch-blue',
                    )}
                    aria-hidden="true"
                  >
                    <AssignmentIcon name={meta?.icon ?? 'note'} />
                  </span>
                  <span className="min-w-0">
                    <span
                      className={cn(
                        'block text-[10px] font-black uppercase tracking-[0.12em]',
                        meta?.colorClassName ?? 'text-dispatch-blue',
                      )}
                    >
                      {resolvedLabel}
                    </span>
                    <span className="block overflow-hidden break-words text-xs font-bold leading-tight text-neutral-100">
                      {info[field] || '-'}
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-sm font-bold text-neutral-400">
            Aucune information d&apos;appel.
          </p>
        )}
      </div>
      <CallerEventButtons
        variant="assignment"
        buttonState={buttonState}
        onCallerEvent={onCallerEvent}
      />
    </div>
  )
}

function CallerEventButtons({
  variant,
  buttonState,
  onCallerEvent,
}: {
  variant: CallerInfoVariant
  buttonState: Record<CallerEventKey, { disabled: boolean }>
  onCallerEvent: (key: CallerEventKey) => void
}) {
  return (
    <div
      className={cn(
        'grid shrink-0 grid-cols-3 gap-2 px-3 py-2',
        variant === 'classic'
          ? 'border-t border-dispatch-line bg-dispatch-surface'
          : 'border-t border-neutral-700 bg-dispatch-panel',
      )}
    >
      {CALLER_EVENT_BUTTONS.map(({ key, label, assignmentClassName }) => (
        <button
          key={key}
          type="button"
          aria-label={label}
          disabled={buttonState[key].disabled}
          onClick={() => onCallerEvent(key)}
          className={cn(
            'min-h-[42px] rounded-md px-1.5 py-2 text-[11px] font-black uppercase leading-tight tracking-normal shadow-sm enabled:active:translate-y-px disabled:cursor-not-allowed disabled:opacity-75 disabled:saturate-50',
            variant === 'classic'
              ? 'border border-dispatch-ink bg-dispatch-paper text-dispatch-ink enabled:hover:bg-dispatch-field'
              : assignmentClassName,
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function AssignmentIcon({ name }: { name: AssignmentIconName }) {
  switch (name) {
    case 'bell':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none">
          <path d="M8 10a4 4 0 1 1 8 0c0 4 2 5 2 7H6c0-2 2-3 2-7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M10 20h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    case 'location':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none">
          <path d="M12 21s7-6.1 7-12a7 7 0 0 0-14 0c0 5.9 7 12 7 12Z" fill="currentColor" />
          <circle cx="12" cy="9" r="2.4" fill="black" opacity="0.55" />
        </svg>
      )
    case 'medical':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none">
          <rect x="5" y="6" width="14" height="15" rx="2" stroke="currentColor" strokeWidth="2" />
          <path d="M9 6V4h6v2M12 10v7M8.5 13.5h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    case 'clock':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none">
          <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2" />
          <path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'caller':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none">
          <circle cx="9" cy="8" r="3" fill="currentColor" />
          <circle cx="16" cy="9" r="2.5" fill="currentColor" opacity="0.72" />
          <path d="M3.5 19c.8-3.3 3-5 6.5-5s5.7 1.7 6.5 5" fill="currentColor" />
          <path d="M14.5 18.5c.8-2.2 2.4-3.4 4.8-3.4 1.1 0 2 .2 2.7.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.72" />
        </svg>
      )
    case 'patient':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none">
          <circle cx="12" cy="7.5" r="3.2" fill="currentColor" />
          <path d="M4.5 20c1-4.1 3.5-6.2 7.5-6.2S18.5 15.9 19.5 20" fill="currentColor" />
        </svg>
      )
    case 'note':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none">
          <rect x="6" y="4" width="12" height="17" rx="2" stroke="currentColor" strokeWidth="2" />
          <path d="M9 9h6M9 13h6M9 17h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    case 'alert':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none">
          <path d="M12 4 21 20H3L12 4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M12 9v5M12 17.5h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
  }
}
