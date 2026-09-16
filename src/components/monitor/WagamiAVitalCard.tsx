import { cn } from '@/lib/utils'

type WagamiAVitalCardProps = {
  channel: 'fc' | 'spo2' | 'pni' | 'etco2'
  label: string
  value: string
  unit: string
}

const CHANNEL_TONE = {
  fc: 'text-wagami-a-ecg',
  spo2: 'text-wagami-a-spo2',
  pni: 'text-wagami-a-pni',
  etco2: 'text-wagami-a-etco2',
} as const

export function WagamiAVitalCard({ channel, label, value, unit }: WagamiAVitalCardProps) {
  const card = (
    <>
      <div className="flex min-w-0 items-start justify-between gap-1 font-sans text-[clamp(11px,1.35cqw,20px)] font-semibold">
        <span className={CHANNEL_TONE[channel]}>{label}</span>
        <span className="font-mono text-[clamp(9px,0.85cqw,13px)] text-wagami-a-muted-text">{unit}</span>
      </div>
      <div className={cn('mt-auto whitespace-nowrap font-mono font-bold leading-none tabular-nums', channel === 'pni' ? 'text-[clamp(19px,2.4cqw,44px)]' : 'text-[clamp(26px,3.5cqw,62px)]', CHANNEL_TONE[channel])}>
        {value}
      </div>
      {channel === 'pni' && <span className="font-sans text-[clamp(9px,0.9cqw,13px)] text-wagami-a-muted-text">Dernière mesure</span>}
    </>
  )
  const classes = 'flex h-full min-h-0 flex-col gap-1 rounded-[7px] border border-wagami-a-border bg-wagami-a-surface px-[clamp(7px,1.1cqw,17px)] py-[clamp(7px,1cqw,15px)] text-left'

  return <div data-testid={`wagami-a-vital-${channel}`} className={classes}>{card}</div>
}
