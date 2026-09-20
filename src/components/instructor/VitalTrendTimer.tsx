'use client'

import { useCountdown } from '@/hooks/useCountdown'
import { cn } from '@/lib/utils'
import { useMonitorStore } from '@/store/monitorStore'

export function VitalTrendTimer() {
  const durationSeconds = useMonitorStore(
    (state) => state.vitalTrendDraft.durationSeconds,
  )
  const activeTrend = useMonitorStore((state) => state.activeVitalTrend)
  const setMinutes = useMonitorStore((state) => state.setVitalTrendMinutes)
  const setSeconds = useMonitorStore((state) => state.setVitalTrendSeconds)
  const countdown = useCountdown(
    activeTrend?.status === 'running' ? activeTrend.endsAt : null,
  )
  const minutes = Math.floor(durationSeconds / 60)
  const seconds = durationSeconds % 60
  const running = activeTrend?.status === 'running'
  const complete = activeTrend?.status === 'complete'
  const cancelled = activeTrend?.status === 'cancelled'
  const cancelledSeconds = cancelled
    ? Math.max(
        0,
        Math.ceil(
          (activeTrend.endsAt - (activeTrend.completedAt ?? activeTrend.startsAt)) / 1000,
        ),
      )
    : 0
  const displayedDurationSeconds = running
    ? countdown.secondsLeft
    : complete
      ? 0
      : cancelled
        ? cancelledSeconds
        : durationSeconds
  const displayedMinutes = Math.floor(displayedDurationSeconds / 60)
  const displayedSeconds = displayedDurationSeconds % 60
  const showTerminalOrLiveValues = running || complete || cancelled
  const status =
    running
      ? `Running ${countdown.formatted}`
      : complete
        ? 'Complete'
        : cancelled
          ? 'Cancelled'
          : 'Ready'
  const valueClass = cn(
    running && 'text-pending-amber',
    complete && 'text-ecg-green',
    cancelled && 'text-alarm-red',
    !activeTrend && 'text-white',
  )

  return (
    <div
      className="flex min-w-0 flex-1 items-center gap-2"
      data-testid="vital-trend-timer"
    >
      <span className="w-14 shrink-0 text-xs text-neutral-300 xl:[@media(min-height:800px)]:w-16 xl:[@media(min-height:800px)]:text-sm">
        Timer
      </span>
      <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-1.5">
        <label>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={showTerminalOrLiveValues ? displayedMinutes : minutes === 0 ? '' : minutes}
            placeholder="MIN"
            aria-label="Trend minutes"
            readOnly={running}
            onChange={(event) => {
              if (!running) setMinutes(Number(event.target.value))
            }}
            className={cn(
              'h-7 w-16 border border-neutral-700 bg-black px-1 text-center font-mono text-sm outline-none',
              'focus:border-cyan-bp [appearance:textfield] placeholder:text-neutral-600',
              'read-only:cursor-default',
              '[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
              valueClass,
            )}
          />
        </label>
        <label>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={59}
            value={showTerminalOrLiveValues ? displayedSeconds : seconds === 0 ? '' : seconds}
            placeholder="SEC"
            aria-label="Trend seconds"
            readOnly={running}
            onChange={(event) => {
              if (!running) setSeconds(Number(event.target.value))
            }}
            className={cn(
              'h-7 w-16 border border-neutral-700 bg-black px-1 text-center font-mono text-sm outline-none',
              'focus:border-cyan-bp [appearance:textfield] placeholder:text-neutral-600',
              'read-only:cursor-default',
              '[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
              valueClass,
            )}
          />
        </label>
        <output
          aria-label="Trend status"
          aria-live="polite"
          className="sr-only"
        >
          {status}
        </output>
      </div>
    </div>
  )
}
