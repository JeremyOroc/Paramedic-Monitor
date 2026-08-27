'use client'

import type { ReactNode } from 'react'

import { ECGCanvas } from '@/components/monitor/ECGCanvas'
import { SecondaryChannel } from '@/components/monitor/SecondaryChannel'
import { cn } from '@/lib/utils'
import {
  getActiveAlarms,
  type Etco2Waveform,
  type PatientMode,
  type Rhythm,
  type Spo2Waveform,
  type VitalActiveState,
} from '@/types/vitals'

type WagamiZScreenProps = {
  date: string
  time: string
  sessionTimer: string
  patientMode: PatientMode
  rhythm: Rhythm
  heartRate: number
  spo2: number
  etco2: number
  bpSys: number
  bpDia: number
  joules: number
  shockCount?: number
  spo2Waveform: Spo2Waveform
  etco2Waveform: Etco2Waveform
  active: VitalActiveState
  cprOverride?: boolean
}

const PATIENT_MODE_LABELS: Record<PatientMode, string> = {
  adult: 'ADULTE',
  pediatric: 'PÉDIATRIQUE',
  neonate: 'NÉONATAL',
}

function formatFrenchMonitorDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value
}

type TouchIconName = 'grid' | 'cuff' | 'marker' | 'print' | 'camera' | 'lead' | 'analyze'

function TouchIcon({ name }: { name: TouchIconName }) {
  if (name === 'grid') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[48%] w-auto fill-current">
        <path d="M3 3h5v5H3V3Zm6.5 0h5v5h-5V3ZM16 3h5v5h-5V3ZM3 9.5h5v5H3v-5Zm6.5 0h5v5h-5v-5Zm6.5 0h5v5h-5v-5ZM3 16h5v5H3v-5Zm6.5 0h5v5h-5v-5Zm6.5 0h5v5h-5v-5Z" />
      </svg>
    )
  }

  const paths: Record<Exclude<TouchIconName, 'grid'>, string> = {
    cuff: 'M4 8.5 9 5l5.5 8-5 3.5L4 8.5Zm10.5.5H18a2 2 0 0 1 2 2v5h-2v-5h-3.5V9ZM6.7 8.8l3.2 4.7 1.8-1.2-3.2-4.7-1.8 1.2Z',
    marker: 'M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7Zm0 4.5A2.5 2.5 0 1 1 12 11a2.5 2.5 0 0 1 0-4.5Z',
    print: 'M6 3h12v5H6V3Zm-2 7h16v8h-3v3H7v-3H4v-8Zm5 6v3h6v-3H9Z',
    camera: 'M7 6.5 8.5 4h7L17 6.5h3v12H4v-12h3ZM12 9a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z',
    lead: 'M3 7h4v5H3V7Zm7 0h4v5h-4V7Zm7 0h4v5h-4V7ZM5 14v4h14v-4h2v6H3v-6h2Z',
    analyze: 'M11 3a8 8 0 1 0 5.2 14.1l3.4 3.4 1.4-1.4-3.4-3.4A8 8 0 0 0 11 3Zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm-1 3h2v3h3v2h-5V8Z',
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[45%] w-auto fill-current">
      <path d={paths[name]} />
    </svg>
  )
}

function InertTouchButton({
  label,
  icon,
  accent,
  showLabel = true,
}: {
  label: string
  icon: TouchIconName
  accent?: 'cyan' | 'purple'
  showLabel?: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => {}}
      className={cn(
        'grid min-h-11 min-w-11 place-items-center border-r border-cyan-200/20 bg-wagami-z-control px-1 text-[clamp(7px,1.2cqw,12px)] font-bold text-cyan-bp transition hover:brightness-125 active:brightness-150 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-cyan-bp',
        accent === 'cyan' && 'bg-cyan-bp text-black',
        accent === 'purple' && 'bg-wagami-z-action-purple text-white',
      )}
      aria-label={label}
    >
      <span className="flex h-full min-h-0 flex-col items-center justify-center gap-[4%]">
        <TouchIcon name={icon} />
        {showLabel ? <span className="truncate leading-none">{label}</span> : null}
      </span>
    </button>
  )
}

function ModeButton({ children, selected = false }: { children: string; selected?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => {}}
      className={cn(
        'min-h-11 min-w-11 border-r border-cyan-200/20 bg-wagami-z-control px-2 text-[clamp(10px,1.8cqw,17px)] font-bold text-white transition hover:brightness-125 active:brightness-150 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-cyan-bp',
        selected && 'bg-wagami-z-action-purple',
      )}
    >
      {children}
    </button>
  )
}

function SignalMutedIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn('fill-none stroke-current stroke-2', className)}>
      <path d="M5 9v6h4l5 4V5L9 9H5Zm11-2 5 10M21 7l-5 10" />
    </svg>
  )
}

function AlarmOffIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[1.15em] w-[1.15em] fill-none stroke-current stroke-[1.8] opacity-55">
      <path d="M7 9a5 5 0 0 1 8.8-3.2M17 9v4l2 3H8m2 2a2 2 0 0 0 4 0M4 4l16 16" />
    </svg>
  )
}

function WifiIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[1.5em] w-[1.5em] fill-none stroke-current stroke-2">
      <path d="M4 9a12 12 0 0 1 16 0M7 12a8 8 0 0 1 10 0m-7 3a3 3 0 0 1 4 0" />
      <circle cx="12" cy="18" r="1" className="fill-current stroke-none" />
    </svg>
  )
}

function BatteryIcon() {
  return (
    <span className="relative inline-block h-[1.2em] w-[2.2em] rounded-[0.16em] border border-current p-[0.12em]">
      <span className="block h-full w-[82%] bg-current" />
      <span className="absolute -right-[0.28em] top-[29%] h-[42%] w-[0.18em] rounded-r bg-current" />
    </span>
  )
}

function VitalValue({
  label,
  value,
  unit,
  color,
  alarming = false,
  compact = false,
  valueClassName,
  footer,
  children,
}: {
  label: string
  value: string
  unit?: string
  color: 'green' | 'purple' | 'yellow' | 'cyan'
  alarming?: boolean
  compact?: boolean
  valueClassName?: string
  footer?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className={cn(
      'relative grid min-h-0 grid-rows-[auto_1fr_auto] border-b border-white/25 px-[6%] py-[3%] font-mono',
      color === 'green' && 'text-ecg-green',
      color === 'purple' && 'text-purple-etco2',
      color === 'yellow' && 'text-yellow-spo2',
      color === 'cyan' && 'text-cyan-bp',
    )}>
      <div className="flex items-center justify-between text-[clamp(8px,1.45cqw,12px)] font-bold">
        <span>{label}</span>
        <span className="flex items-center gap-[0.3em]">
          {unit ? <span className="text-white/70">{unit}</span> : null}
          <AlarmOffIcon />
        </span>
      </div>
      <div className={cn(
        'self-center text-right text-[clamp(24px,5.8cqw,56px)] font-bold leading-none tracking-[-0.06em] tabular-nums',
        compact && 'text-[clamp(18px,4.2cqw,39px)] tracking-[-0.05em]',
        alarming && 'vital-alarm-flash',
        valueClassName,
      )}>
        {value}
      </div>
      <div className="min-h-[1em] text-right text-[clamp(7px,1cqw,10px)] text-white/75">{footer}</div>
      {children}
    </div>
  )
}

function TraceRow({
  label,
  scale,
  color,
  guides = false,
  children,
}: {
  label: string
  scale: string
  color: 'green' | 'purple' | 'yellow'
  guides?: boolean
  children: ReactNode
}) {
  return (
    <div className="relative min-h-0 overflow-hidden border-b border-white/25">
      <div className={cn(
        'pointer-events-none absolute left-[2.2%] top-[4%] z-10 flex items-baseline gap-[10cqw] font-mono text-[clamp(8px,1.35cqw,14px)] font-bold',
        color === 'green' && 'text-ecg-green',
        color === 'purple' && 'text-purple-etco2',
        color === 'yellow' && 'text-yellow-spo2',
      )}>
        <span>{label}</span>
        <span>{scale}</span>
      </div>
      {guides ? (
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-[5%] top-[18%] z-0 font-mono text-[clamp(6px,0.6cqw,9px)] text-white/55">
          <span className="absolute left-[1.3%] top-0">60</span>
          <span className="absolute left-[1.3%] top-1/2 -translate-y-1/2">30</span>
          <span className="absolute bottom-0 left-[1.3%]">0</span>
          <span className="absolute left-[5.5%] right-0 top-[6%] border-t border-dotted border-white/35" />
          <span className="absolute left-[5.5%] right-0 top-1/2 border-t border-dotted border-white/35" />
          <span className="absolute bottom-[6%] left-[5.5%] right-0 border-t border-dotted border-white/35" />
        </div>
      ) : null}
      <div className={cn('absolute inset-x-0 bottom-0 top-[18%] z-[1]', guides && 'left-[5.5%]')}>{children}</div>
    </div>
  )
}

function PerfusionIndex({ waveform }: { waveform: Exclude<Spo2Waveform, 'off'> }) {
  const weak = waveform === 'weak'
  return (
    <div aria-label="Indice de perfusion" className="absolute bottom-[9%] right-[5%] flex items-end gap-[0.35em] font-mono text-[clamp(8px,1.2cqw,12px)] font-bold text-yellow-spo2">
      <span className="mb-[0.1em] text-white/60">PI</span>
      <span>{weak ? '0.5' : '3.3'}</span>
      <span className="relative h-[2.7em] w-[0.55em] border border-yellow-spo2/70 p-px">
        <span className={cn('absolute inset-x-px bottom-px bg-yellow-spo2', weak ? 'h-1/4' : 'h-3/4')} />
      </span>
    </div>
  )
}

function EnergyIcon() {
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true" className="h-[48%] w-auto fill-current text-purple-etco2">
      <path d="m16 1-9 15h6l-2 11 10-17h-6l1-9Z" />
    </svg>
  )
}

export function WagamiZScreen({
  date,
  time,
  sessionTimer,
  patientMode,
  rhythm,
  heartRate,
  spo2,
  etco2,
  bpSys,
  bpDia,
  joules,
  shockCount = 0,
  spo2Waveform,
  etco2Waveform,
  active,
  cprOverride = false,
}: WagamiZScreenProps) {
  const alarms = getActiveAlarms({ hr: heartRate, bp_sys: bpSys, bp_dia: bpDia, spo2 }, active)
  const bpActive = active.bp_sys || active.bp_dia
  const map = bpActive ? Math.round((bpSys + 2 * bpDia) / 3) : null
  const piWaveform = active.spo2 && spo2Waveform !== 'off' ? spo2Waveform : null

  return (
    <section data-testid="wagami-z-screen" aria-label="Écran de monitorage Wagami Z" className="grid h-full min-h-0 w-full grid-rows-[5.6%_9.7%_1fr_11.8%] overflow-hidden bg-wagami-z-screen text-white [container-type:size]">
      <div className="grid grid-cols-[1.3fr_0.9fr_0.8fr_0.45fr_1fr] items-center gap-[2%] border-b border-white/15 px-[2.4%] font-mono text-[clamp(8px,1.2cqw,12px)] font-bold text-white/90">
        <span>{formatFrenchMonitorDate(date)}</span>
        <span>{time}</span>
        <span>{sessionTimer}</span>
        <span aria-label="Nombre de chocs" className="flex items-center justify-center gap-[0.25em]"><EnergyIcon />{String(shockCount).padStart(2, '0')}</span>
        <span className="flex items-center justify-end gap-[0.8em] text-white" aria-label="Batterie et réseau prêts"><WifiIcon /><BatteryIcon /></span>
      </div>

      <nav aria-label="Modes du moniteur" className="grid min-h-0 grid-cols-[27%_18%_12.5%_16%_26.5%] border-b border-cyan-200/20">
        <ModeButton selected>DEA</ModeButton>
        <ModeButton>MANUEL</ModeButton>
        <button type="button" onClick={() => {}} aria-label="Alarmes silencieuses" className="grid min-h-11 min-w-11 place-items-center border-r border-cyan-200/20 bg-wagami-z-control text-white transition hover:brightness-125 active:brightness-150 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-cyan-bp"><SignalMutedIcon className="h-[56%] w-auto" /></button>
        <ModeButton>{PATIENT_MODE_LABELS[patientMode]}</ModeButton>
        <button type="button" onClick={() => {}} aria-label="Options" className="grid min-h-11 min-w-11 place-items-end border-r border-cyan-200/20 bg-wagami-z-control px-[8%] text-white transition hover:brightness-125 active:brightness-150 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-cyan-bp">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[48%] w-auto fill-current"><circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" /></svg>
        </button>
      </nav>

      <div className="grid min-h-0 grid-cols-[80.5%_19.5%]">
        <div className="grid min-h-0 grid-rows-[32%_24%_21%_23%]">
          <TraceRow label="ECG" scale="1 cm/mV" color="green"><ECGCanvas rhythm={rhythm} hr={heartRate} connected={active.hr && rhythm !== 'off'} cprOverride={cprOverride} /></TraceRow>
          <TraceRow label="EtCO₂" scale="mmHg" color="purple" guides><SecondaryChannel channel="etco2" hr={heartRate} spo2={spo2} etco2={etco2} spo2Waveform={spo2Waveform} etco2Waveform={etco2Waveform} connected={active.etco2 && etco2Waveform !== 'off'} showLabels={false} /></TraceRow>
          <TraceRow label="SpO₂" scale="%" color="yellow"><SecondaryChannel channel="spo2" hr={heartRate} spo2={spo2} etco2={etco2} spo2Waveform={spo2Waveform} etco2Waveform={etco2Waveform} connected={active.spo2 && spo2Waveform !== 'off'} showLabels={false} /></TraceRow>
          <div data-testid="wagami-z-empty-pni-lane" className="min-h-0 border-b border-white/25" />
        </div>

        <aside aria-label="Signes vitaux" className="grid min-h-0 grid-rows-[32%_24%_21%_23%] border-l border-white/25">
          <VitalValue label="FC" value={active.hr ? String(heartRate) : '—'} unit="bpm" color="green" alarming={alarms.includes('hr')} footer={active.hr ? null : 'OFF'} />
          <VitalValue label="EtCO₂" value={active.etco2 ? String(etco2) : '—'} unit="mmHg" color="purple" footer={active.etco2 ? 'BR   ---' : 'OFF'} />
          <VitalValue label="SpO₂" value={active.spo2 ? String(spo2) : '—'} unit="%" color="yellow" alarming={alarms.includes('spo2')} footer={active.spo2 ? null : 'OFF'} valueClassName="pr-[31%]">{piWaveform ? <PerfusionIndex waveform={piWaveform} /> : null}</VitalValue>
          <VitalValue label="PNI" value={bpActive ? `${bpSys}/${bpDia}` : '—'} unit="mmHg" color="cyan" alarming={alarms.includes('bp')} footer={bpActive ? `(${map})` : 'OFF'} compact />
        </aside>
      </div>

      <div className="grid min-h-0 grid-cols-[9.5%_9.8%_12.2%_12.2%_12%_12%_11.9%_20.4%] border-t border-white/25">
        <InertTouchButton label="MENU" icon="grid" showLabel={false} />
        <InertTouchButton label="PNI" icon="cuff" accent="cyan" />
        <InertTouchButton label="MARQUEUR" icon="marker" />
        <InertTouchButton label="IMPRIMER" icon="print" />
        <InertTouchButton label="CAPTURE" icon="camera" />
        <InertTouchButton label="12 LEAD" icon="lead" />
        <InertTouchButton label="ANALYSER" icon="analyze" accent="purple" />
        <button type="button" onClick={() => {}} aria-label={`Énergie ${joules} joules`} className="grid min-h-11 min-w-11 grid-cols-[32%_1fr] place-items-center bg-wagami-z-control px-[4%] font-mono text-[clamp(15px,3.3cqw,29px)] font-bold text-white/65 transition hover:brightness-125 active:brightness-150 focus-visible:outline-2 focus-visible:outline-cyan-bp"><EnergyIcon /><span className="whitespace-nowrap">{joules} J</span></button>
      </div>
    </section>
  )
}
