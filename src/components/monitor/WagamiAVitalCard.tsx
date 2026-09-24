import { cn } from '@/lib/utils'

type WagamiAVitalCardProps = {
  channel: 'fc' | 'spo2' | 'pni' | 'etco2'
  label: string
  value: string
  unit: string
  alarming?: boolean
  actionLabel?: string
  onClick?: () => void
}

const CHANNEL_TONE = {
  fc: 'text-wagami-a-ecg',
  spo2: 'text-wagami-a-spo2',
  pni: 'text-wagami-a-pni',
  etco2: 'text-wagami-a-etco2',
} as const

export function WagamiAVitalCard({ channel, label, value, unit, alarming = false, actionLabel, onClick }: WagamiAVitalCardProps) {
  const usesInlineBpLayout = channel === 'pni' && value.includes('/')
  const toneClass = alarming ? 'text-wagami-a-alarm' : CHANNEL_TONE[channel]
  const card = (
    <>
      <div className="flex min-w-0 items-start justify-between gap-1 font-sans text-[clamp(11px,1.35cqw,20px)] font-semibold">
        <span className={toneClass}>{label}</span>
        <span className={cn('font-mono text-[clamp(9px,0.85cqw,13px)]', alarming ? toneClass : 'text-wagami-a-muted-text')}>{unit}</span>
      </div>
      <div data-value-layout={usesInlineBpLayout ? 'inline-bp' : 'single'} className={cn('mt-auto whitespace-nowrap font-mono font-bold leading-none tabular-nums', usesInlineBpLayout ? 'text-[clamp(22px,3.05cqw,52px)]' : 'text-[clamp(26px,3.5cqw,62px)]', toneClass)}>
        {value}
      </div>
    </>
  )
  const classes = cn(
    'flex h-full min-h-0 flex-col gap-1 rounded-[7px] border border-wagami-a-border bg-wagami-a-surface px-[clamp(7px,1.1cqw,17px)] py-[clamp(7px,1cqw,15px)] text-left',
    alarming && 'wagami-a-vital-alarm-pulse',
    onClick && 'cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-wagami-a-pni',
  )

  return onClick ? (
    <button type="button" aria-label={actionLabel} data-testid={`wagami-a-vital-${channel}`} data-alarming={alarming ? 'true' : 'false'} onClick={onClick} className={classes}>{card}</button>
  ) : (
    <div data-testid={`wagami-a-vital-${channel}`} data-alarming={alarming ? 'true' : 'false'} className={classes}>{card}</div>
  )
}
