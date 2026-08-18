'use client'

import {
  CALLER_INFO_DISPLAY_FIELDS,
  hasCallerInfo,
  type CallerInfo,
  type CallerInfoField,
} from '@/types/callerInfo'
import { DispatchRouteMap } from '@/components/monitor/DispatchRouteMap'
import { cn } from '@/lib/utils'
import type { DispatchRoute } from '@/types/dispatchRoute'

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
  /** Assignment dashboard response timer, counting up from dispatch start. */
  responseFormatted?: string
  /** Full-page dispatch mode renders as a separate iPad-style surface. */
  fullScreen?: boolean
  /** A/B switch: classic tablet or icon-led assignment dashboard. */
  variant?: CallerInfoVariant
  /** Full-page in-monitor caller info uses this tablet button to return to the Zoll. */
  onBack?: () => void
  /** Dispatch page: tap to leave the tablet and open the monitor. */
  onEnterMonitor?: () => void
  /** Whether the "Go to Monitor" action is currently allowed (gate satisfied). */
  canEnterMonitor?: boolean
  route?: DispatchRoute
  alertFlash?: boolean
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
}>> = {
  callNumber: {
    label: 'Call #',
  },
  priority: {
    label: 'Priority',
  },
  mpdsCode: {
    label: 'MPDS Code',
  },
  address: {
    label: 'Address',
  },
  problem: {
    label: 'Nature of Call',
  },
  time: {
    label: 'Call Received',
  },
  information: {
    label: 'Caller Info',
  },
  update: {
    label: 'Updates',
  },
  extra1: {
    label: 'Notes',
  },
  extra2: {
    label: 'Hazards / Alerts',
  },
  extra3: {
    label: 'Additional Info',
  },
}

export function CallerInfoModal({
  open,
  info,
  onCallerEvent,
  buttonState,
  showCountdown = false,
  countdownFormatted = '00:00',
  responseFormatted = '00:00',
  fullScreen = false,
  variant = 'assignment',
  onBack,
  onEnterMonitor,
  canEnterMonitor = false,
  route,
  alertFlash = false,
}: CallerInfoModalProps) {
  if (!open) return null

  const hasInfo = hasCallerInfo(info)
  const displayFields = CALLER_INFO_DISPLAY_FIELDS.filter(({ field, labelField }) => {
    if (!labelField) return true
    return info[field].trim() !== '' || info[labelField].trim() !== ''
  })

  // The full-screen assignment view *is* the dispatch surface, so it runs edge
  // to edge rather than sitting as a 4:3 tablet on a beige wall. The classic
  // variant keeps the tablet-on-a-wall framing.
  const assignmentFullBleed = fullScreen && variant === 'assignment'

  return (
    <section
      aria-label="Caller info"
      className={cn(
        'absolute z-30 font-sans',
        fullScreen ? 'fixed inset-0 z-50' : 'left-[56px] top-[56px] bottom-0 right-0',
      )}
    >
      {fullScreen && onBack && (
        <button
          type="button"
          aria-label="Back to monitor"
          onClick={onBack}
          className="absolute left-5 top-5 z-50 rounded-md border border-dispatch-line bg-dispatch-paper px-4 py-2 text-sm font-black uppercase text-dispatch-ink shadow-lg enabled:active:translate-y-px"
        >
          Back
        </button>
      )}
      <div
        className={cn(
          'flex h-full w-full items-center justify-center overflow-hidden',
          !fullScreen && 'bg-black/80 p-4',
          fullScreen && (assignmentFullBleed ? 'bg-dispatch-bezel' : 'bg-dispatch-wall p-5'),
        )}
      >
        <div
          data-testid="dispatch-tablet-frame"
          className={cn(
            'relative flex overflow-hidden border-dispatch-bezel bg-dispatch-bezel shadow-2xl',
            // Rounded corners would let the wall show through at the edges.
            assignmentFullBleed ? 'border-0' : 'rounded-[22px] border-[7px]',
            variant === 'assignment'
              ? fullScreen
                ? 'dispatch-tablet-frame-assignment'
                : 'h-[94%] w-[92%] min-w-[390px] max-w-[740px]'
              : fullScreen
                ? 'dispatch-tablet-frame-classic'
                : 'h-[92%] w-[84%] min-w-[360px] max-w-[680px]',
          )}
        >
          {/* Tablet speaker slot — only meaningful when it reads as a device. */}
          {!assignmentFullBleed && (
            <div className="absolute left-1/2 top-2 z-10 h-1.5 w-12 -translate-x-1/2 rounded-full bg-neutral-800" />
          )}
          {variant === 'classic' ? (
            <ClassicCallerInfoContent
              info={info}
              hasInfo={hasInfo}
              displayFields={displayFields}
              showCountdown={showCountdown}
              countdownFormatted={countdownFormatted}
              responseFormatted={responseFormatted}
              buttonState={buttonState}
              onCallerEvent={onCallerEvent}
              onEnterMonitor={onEnterMonitor}
              canEnterMonitor={canEnterMonitor}
              route={route}
            />
          ) : (
            <AssignmentCallerInfoContent
              info={info}
              hasInfo={hasInfo}
              displayFields={displayFields}
              showCountdown={showCountdown}
              countdownFormatted={countdownFormatted}
              responseFormatted={responseFormatted}
              buttonState={buttonState}
              onCallerEvent={onCallerEvent}
              onEnterMonitor={onEnterMonitor}
              canEnterMonitor={canEnterMonitor}
              route={route}
            />
          )}
          {alertFlash && (
            <div
              aria-hidden="true"
              data-testid="caller-info-alert-flash"
              className="pointer-events-none absolute inset-0 z-40 bg-cyan-bp/20 caller-info-alert-flash"
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
  responseFormatted: string
  buttonState: Record<CallerEventKey, { disabled: boolean }>
  onCallerEvent: (key: CallerEventKey) => void
  onEnterMonitor?: () => void
  canEnterMonitor?: boolean
  route?: DispatchRoute
}

function ClassicCallerInfoContent({
  info,
  hasInfo,
  displayFields,
  showCountdown,
  countdownFormatted,
  buttonState,
  onCallerEvent,
  onEnterMonitor,
  canEnterMonitor = false,
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
        {onEnterMonitor && (
          <EnterMonitorButton
            onEnterMonitor={onEnterMonitor}
            canEnterMonitor={canEnterMonitor}
            className="mt-4"
          />
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
  responseFormatted,
  buttonState,
  onCallerEvent,
  onEnterMonitor,
  canEnterMonitor = false,
  route,
}: CallerInfoContentProps) {
  const priority = info.priority.trim() || 'Priority Pending'
  const assignmentDisplayFields = displayFields.filter(({ field }) => field !== 'priority')
  const location = info.address.trim() || '-'
  const receivedTime = info.time.trim() || '--:--'

  return (
    <div
      data-testid="assignment-dashboard"
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[14px] border border-neutral-800 bg-dispatch-panel text-white"
    >
      <header className="grid shrink-0 grid-cols-[1fr_auto_auto] items-center border-b border-neutral-700 bg-black/30 text-xs font-black uppercase">
        <div className="flex items-center gap-2 border-r border-neutral-700 px-4 py-2 text-dispatch-green">
          <span className="grid h-5 w-5 place-items-center">
            <AssignmentSignalIcon />
          </span>
          <span>Connected</span>
        </div>
        <div className="border-r border-neutral-700 px-4 py-2 text-neutral-300">
          <span className="font-mono normal-case tabular-nums">{receivedTime}</span>
        </div>
        <div className="px-4 py-2 text-neutral-300">
          Unit <span className="text-dispatch-blue">421</span>
        </div>
      </header>
      <div className="grid shrink-0 grid-cols-[1fr_minmax(190px,0.78fr)] border-b border-neutral-700">
        <div className="flex items-center px-4 py-3" data-testid="assignment-title">
          <h2 className="text-xl font-black uppercase leading-none tracking-normal">
            New Assignment
          </h2>
        </div>
        <div aria-label="Response timer" className="border-l border-neutral-700 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white">
            Response Timer
          </p>
          <p className="font-mono text-2xl font-black tabular-nums text-white">
            {responseFormatted}
          </p>
        </div>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[1.08fr_minmax(210px,0.92fr)] overflow-hidden">
        <div className="min-h-0 overflow-hidden border-r border-neutral-700 px-4 py-3">
          <div className="mb-3 grid grid-cols-[1fr_auto] gap-4 border-b border-neutral-700 pb-3">
            <div>
              <p className="text-lg font-black text-white">
                Call Assignment
              </p>
            </div>
            <div className="border-l border-neutral-600 pl-4">
              <p className="text-lg font-black uppercase leading-tight text-white">
                {priority}
              </p>
              <p className="text-xs font-bold text-white">Lights & Sirens</p>
            </div>
          </div>
          {hasInfo ? (
            <ul className="grid gap-1">
              {assignmentDisplayFields.map(({ field, label, labelField }) => {
                const meta = ASSIGNMENT_FIELD_META[field]
                const resolvedLabel =
                  labelField && info[labelField].trim() !== ''
                    ? info[labelField]
                    : meta?.label ?? label
                return (
                  <li
                    key={field}
                    data-testid={`assignment-info-${field}`}
                    className="grid min-h-[34px] grid-cols-[1fr] border-b border-neutral-800 pb-1 last:border-b-0"
                  >
                    <span className="min-w-0">
                      <span
                        className="block text-[10px] font-black uppercase tracking-[0.12em] text-dispatch-blue"
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
        <div className="min-h-0 px-4 py-3">
          <p className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-dispatch-blue">
            Location
          </p>
          <div className="h-[58%] min-h-[140px]">
            {route ? (
              <DispatchRouteMap route={route} />
            ) : (
              <div className="flex h-full min-h-0 flex-col justify-between rounded-md border border-neutral-700 bg-dispatch-panel-soft p-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black/30 text-dispatch-red">
                    <AssignmentIcon name="location" />
                  </span>
                  <div>
                    <p className="text-sm font-black text-neutral-100">{location}</p>
                    <p className="mt-1 text-xs font-bold text-neutral-400">Awaiting route</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 border-t border-neutral-700 pt-3">
                  <div>
                    <p className="text-[10px] font-black uppercase text-dispatch-blue">
                      Distance
                    </p>
                    <p className="text-sm font-black text-white">-- km</p>
                  </div>
                  <div className="border-l border-neutral-700 pl-4">
                    <p className="text-[10px] font-black uppercase text-dispatch-blue">ETA</p>
                    <p aria-label="ETA" className="font-mono text-sm font-black text-white">
                      {showCountdown ? countdownFormatted : '00:00'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="mt-3 rounded-md border border-neutral-700 bg-black/25 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-dispatch-blue">
              Unit Status
            </p>
            <p className="mt-2 text-xs font-bold text-neutral-300">Current Status:</p>
            <p className="text-lg font-black uppercase text-dispatch-green">Available</p>
          </div>
          {onEnterMonitor && (
            <EnterMonitorButton
              onEnterMonitor={onEnterMonitor}
              canEnterMonitor={canEnterMonitor}
              className="mt-3"
            />
          )}
        </div>
      </div>
      <CallerEventButtons
        variant="assignment"
        buttonState={buttonState}
        onCallerEvent={onCallerEvent}
      />
    </div>
  )
}

function EnterMonitorButton({
  onEnterMonitor,
  canEnterMonitor,
  className,
}: {
  onEnterMonitor: () => void
  canEnterMonitor: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      aria-label="Go to monitor"
      disabled={!canEnterMonitor}
      onClick={onEnterMonitor}
      className={cn(
        'w-full rounded-md border border-dispatch-blue bg-dispatch-blue px-4 py-3 text-sm font-black uppercase tracking-wide text-black shadow-sm enabled:hover:brightness-110 enabled:active:translate-y-px',
        'disabled:cursor-not-allowed disabled:border-neutral-600 disabled:bg-neutral-700 disabled:text-neutral-300 disabled:opacity-85 disabled:saturate-0',
        className,
      )}
    >
      Go to Monitor
    </button>
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
            'min-h-[42px] rounded-md px-1.5 py-2 text-[11px] font-black uppercase leading-tight tracking-normal shadow-sm enabled:active:translate-y-px disabled:cursor-not-allowed',
            variant === 'classic'
              ? 'border border-dispatch-ink bg-dispatch-paper text-dispatch-ink enabled:hover:bg-dispatch-field'
              : assignmentClassName,
            'disabled:border-neutral-600 disabled:bg-neutral-700 disabled:text-neutral-300 disabled:opacity-85 disabled:saturate-0',
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

function AssignmentSignalIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none">
      <path d="M5 12a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 12a4 4 0 0 1 8 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M11 12a1 1 0 0 1 2 0" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M12 13v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
