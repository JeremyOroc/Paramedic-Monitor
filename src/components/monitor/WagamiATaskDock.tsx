import { cn } from '@/lib/utils'
import { getWagamiAText } from '@/lib/wagamiALocalization'
import type { WagamiALocale } from '@/types/wagamiA'

export type WagamiATask = 'twelveLead' | 'etco2' | 'medications' | 'callInfo' | 'vitalLog' | 'configure'

type WagamiATaskDockProps = {
  onTask?: (task: WagamiATask) => void
  selectedAction?: string | null
  locale?: WagamiALocale
}

function TaskIcon({ task }: { task: WagamiATask }) {
  const common = 'h-[clamp(19px,2.5cqw,37px)] w-[clamp(19px,2.5cqw,37px)] fill-none stroke-current stroke-[1.8] [stroke-linecap:round] [stroke-linejoin:round]'
  if (task === 'twelveLead') return <svg viewBox="0 0 24 24" aria-hidden="true" className={common}><path d="M2 12h5l2-5 3 10 2-5h8" /><path d="M3 4h18M3 20h18" /></svg>
  if (task === 'etco2') return <svg viewBox="0 0 24 24" aria-hidden="true" className={common}><path d="M12 3v9m0 0c-2-3-3-4-5-4-2 0-4 2-4 6 0 4 2 7 5 7 2 0 4-2 4-5m0-4c2-3 3-4 5-4 2 0 4 2 4 6 0 4-2 7-5 7-2 0-4-2-4-5" /></svg>
  if (task === 'medications') return <svg viewBox="0 0 24 24" aria-hidden="true" className={common}><path d="m4 19 10-10m-7 7 2 2m2-6 2 2m3-9 3 3-4 4-3-3zM3 20l2-2m13-14 2-2m-2 6 2 2" /></svg>
  if (task === 'callInfo') return <svg viewBox="0 0 24 24" aria-hidden="true" className={common}><path d="M5 3h10l4 4v14H5zM15 3v4h4M8 11h8M8 15h6" /><path d="M9 7h1" /></svg>
  if (task === 'vitalLog') return <svg viewBox="0 0 24 24" aria-hidden="true" className={common}><path d="M5 3h14v18H5zM8 8h8M8 12h8M8 16h5" /><path d="M15 15v3m-1.5-1.5h3" /></svg>
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={common}><path d="M10 2h4l.5 2.4 2 .8 2-1.3 2.8 2.8-1.3 2 .8 2L23 10v4l-2.4.5-.8 2 1.3 2-2.8 2.8-2-1.3-2 .8L14 23h-4l-.5-2.4-2-.8-2 1.3-2.8-2.8 1.3-2-.8-2L1 14v-4l2.4-.5.8-2-1.3-2 2.8-2.8 2 1.3 2-.8z" /><circle cx="12" cy="12" r="3" /></svg>
}

export function WagamiATaskDock({ onTask, selectedAction, locale = 'fr' }: WagamiATaskDockProps) {
  const text = getWagamiAText(locale)
  const tasks: ReadonlyArray<{ key: WagamiATask; label: string }> = [
    { key: 'twelveLead', label: text.taskTwelveLead },
    { key: 'etco2', label: text.taskEtco2 },
    { key: 'medications', label: text.taskMedications },
    { key: 'callInfo', label: text.taskCallInfo },
    { key: 'vitalLog', label: text.taskVitalLog },
    { key: 'configure', label: text.taskConfigure },
  ]
  return (
    <nav aria-label="Wagami A task dock" className="grid min-h-0 grid-cols-2 grid-rows-3 gap-[clamp(3px,0.6cqw,9px)]">
      {tasks.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          data-task={key}
          data-navigation-selected={selectedAction === key ? 'true' : 'false'}
          disabled={!onTask}
          onClick={() => onTask?.(key)}
          className={cn(
            'grid min-h-[44px] min-w-0 place-content-center justify-items-center gap-[clamp(3px,0.55cqw,8px)] rounded-[6px] border border-wagami-a-border bg-wagami-a-surface-raised px-1.5 py-1 text-wagami-a-pni',
            'enabled:hover:bg-wagami-a-surface enabled:active:brightness-125 focus-visible:outline-2 focus-visible:outline-wagami-a-pni disabled:cursor-not-allowed',
            selectedAction === key && 'ring-2 ring-inset ring-wagami-a-pni bg-wagami-a-surface',
          )}
        >
          <TaskIcon task={key} />
          <span className="max-w-full text-center font-sans text-[clamp(9px,1.05cqw,15px)] font-semibold leading-tight text-wagami-a-text">{label}</span>
        </button>
      ))}
    </nav>
  )
}
