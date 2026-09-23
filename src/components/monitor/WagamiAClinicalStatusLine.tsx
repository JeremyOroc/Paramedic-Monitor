import { getWagamiAText } from '@/lib/wagamiALocalization'
import { cn } from '@/lib/utils'
import type { WagamiALocale } from '@/types/wagamiA'
import type { AlarmChannel, PatientMode } from '@/types/vitals'

type WagamiAClinicalStatusLineProps = {
  patientMode: PatientMode
  alarms: AlarmChannel[]
  locale?: WagamiALocale
  className?: string
}

const ALARM_ORDER: AlarmChannel[] = ['hr', 'spo2', 'bp']

export function WagamiAClinicalStatusLine({ patientMode, alarms, locale = 'fr', className }: WagamiAClinicalStatusLineProps) {
  const text = getWagamiAText(locale)
  const modeLabel = { adult: text.adult, pediatric: text.pediatric, neonate: text.neonate }[patientMode]
  const alarmLabels: Record<AlarmChannel, string> = {
    hr: text.alarmHr,
    spo2: text.alarmSpo2,
    bp: text.alarmBp,
  }
  const activeAlarmLabels = ALARM_ORDER
    .filter((channel) => alarms.includes(channel))
    .map((channel) => alarmLabels[channel])

  return (
    <div
      data-testid="wagami-a-clinical-status-line"
      role="status"
      className={cn('flex h-full min-w-0 items-center font-sans text-[clamp(10px,1cqw,15px)]', className)}
    >
      <span className="shrink-0 text-wagami-a-muted-text">{text.mode}{' '}</span>
      <span
        data-testid="wagami-a-current-mode"
        className="shrink-0 rounded border border-wagami-a-border bg-wagami-a-surface-raised px-1.5 py-0.5 font-semibold text-wagami-a-text"
      >
        {modeLabel}
      </span>
      {activeAlarmLabels.length > 0 ? (
        <>
          <span aria-hidden="true" className="shrink-0 whitespace-pre text-wagami-a-muted-text"> · </span>
          <span className="truncate font-semibold text-wagami-a-alarm">{text.alarm} · {activeAlarmLabels.join(' / ')}</span>
        </>
      ) : null}
    </div>
  )
}
