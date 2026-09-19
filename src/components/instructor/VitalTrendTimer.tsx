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
  const status =
    activeTrend?.status === 'running'
      ? `Running ${countdown.formatted}`
      : activeTrend?.status === 'complete'
        ? 'Complete 00:00'
        : activeTrend?.status === 'cancelled'
          ? 'Cancelled'
          : 'Ready'

  return (
    <div
      className="flex min-w-0 flex-1 items-center gap-2"
      data-testid="vital-trend-timer"
    >
      <span className="w-14 shrink-0 text-xs text-neutral-300 xl:[@media(min-height:800px)]:w-16 xl:[@media(min-height:800px)]:text-sm">
        Timer
      </span>
      <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-1.5">
        <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={minutes === 0 ? '' : minutes}
            placeholder="0"
            aria-label="Trend minutes"
            onChange={(event) => setMinutes(Number(event.target.value))}
            className={cn(
              'h-7 w-12 border border-neutral-700 bg-black px-1 text-right font-mono text-sm text-white outline-none',
              'focus:border-cyan-bp [appearance:textfield] placeholder:text-neutral-700',
              '[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
            )}
          />
          min
        </label>
        <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={59}
            value={seconds === 0 ? '' : seconds}
            placeholder="0"
            aria-label="Trend seconds"
            onChange={(event) => setSeconds(Number(event.target.value))}
            className={cn(
              'h-7 w-12 border border-neutral-700 bg-black px-1 text-right font-mono text-sm text-white outline-none',
              'focus:border-cyan-bp [appearance:textfield] placeholder:text-neutral-700',
              '[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
            )}
          />
          sec
        </label>
        <output
          aria-label="Trend status"
          className={cn(
            'min-w-[6.75rem] shrink-0 font-mono text-[10px] font-bold uppercase tracking-wider',
            activeTrend?.status === 'running' && 'text-pending-amber',
            activeTrend?.status === 'complete' && 'text-ecg-green',
            activeTrend?.status === 'cancelled' && 'text-alarm-red',
            !activeTrend && 'text-neutral-600',
          )}
        >
          {status}
        </output>
      </div>
    </div>
  )
}
