'use client'

import type { ReactNode } from 'react'

import { ECGCanvas } from '@/components/monitor/ECGCanvas'
import { SecondaryChannel } from '@/components/monitor/SecondaryChannel'
import { cn } from '@/lib/utils'
import {
  getActiveAlarms,
  type PatientMode,
  type Rhythm,
  type Spo2Waveform,
  type Etco2Waveform,
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

type InertTouchButtonProps = {
  label: string
  icon: 'grid' | 'cuff' | 'marker' | 'print' | 'camera' | 'lead' | 'analyze'
  accent?: 'cyan' | 'purple'
}

function TouchIcon({ name }: { name: InertTouchButtonProps['icon'] }) {
  if (name === 'grid') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[42%] w-auto fill-current">
        <path d="M3 3h5v5H3V3Zm6.5 0h5v5h-5V3ZM16 3h5v5h-5V3ZM3 9.5h5v5H3v-5Zm6.5 0h5v5h-5v-5Zm6.5 0h5v5h-5v-5ZM3 16h5v5H3v-5Zm6.5 0h5v5h-5v-5Zm6.5 0h5v5h-5v-5Z" />
      </svg>
    )
  }

  const paths: Record<Exclude<InertTouchButtonProps['icon'], 'grid'>, string> = {
    cuff: 'M5 7h8v10H5V7Zm9 2h2.5a2.5 2.5 0 0 1 0 5H14v-2h2.5a.5.5 0 0 0 0-1H14V9Zm-7 0v6h4V9H7Z',
    marker: 'M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7Zm0 4.5A2.5 2.5 0 1 1 12 11a2.5 2.5 0 0 1 0-4.5Z',
    print: 'M6 3h12v5H6V3Zm-2 7h16v8h-3v3H7v-3H4v-8Zm5 6v3h6v-3H9Z',
    camera: 'M7 6.5 8.5 4h7L17 6.5h3v12H4v-12h3ZM12 9a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z',
    lead: 'M4 5h3v5H4V5Zm6 0h3v5h-3V5Zm7 0h3v5h-3V5ZM5.5 12v4h13v-4H20v6H4v-6h1.5Z',
    analyze: 'M11 3a8 8 0 1 0 5.2 14.1l3.4 3.4 1.4-1.4-3.4-3.4A8 8 0 0 0 11 3Zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm-1 3h2v3h3v2h-5V8Z',
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[46%] w-auto fill-current">
      <path d={paths[name]} />
    </svg>
  )
}

function InertTouchButton({ label, icon, accent }: InertTouchButtonProps) {
  return (
    <button
      type="button"
      onClick={() => {}}
      className={cn(
        'grid min-w-0 place-items-center border-r border-white/10 bg-wagami-z-control px-1 text-[clamp(7px,0.62vw,11px)] font-bold text-cyan-bp transition brightness-100 hover:brightness-125 active:brightness-150 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-cyan-bp',
        accent === 'cyan' && 'bg-cyan-bp text-black',
        accent === 'purple' && 'bg-wagami-z-action-purple text-white',
      )}
      aria-label={label}
    >
      <span className="flex h-full min-h-0 flex-col items-center justify-center gap-0.5">
        <TouchIcon name={icon} />
        <span className="truncate leading-none">{label}</span>
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
        'min-w-0 border-r border-white/10 bg-wagami-z-control px-2 text-[clamp(8px,0.72vw,13px)] font-bold text-white transition hover:brightness-125 active:brightness-150 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-cyan-bp',
        selected && 'bg-wagami-z-action-purple',
      )}
    >
      {children}
    </button>
  )
}

function SignalMutedIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="mx-auto h-1/2 w-auto fill-none stroke-current stroke-2">
      <path d="M5 9v6h4l5 4V5L9 9H5Zm11-2 5 10M21 7l-5 10" />
    </svg>
  )
}

type VitalValueProps = {
  label: string
  value: string
  unit?: string
  color: 'green' | 'purple' | 'yellow' | 'cyan'
  alarming?: boolean
  detail?: string
  compact?: boolean
}

function VitalValue({
  label,
  value,
  unit,
  color,
  alarming = false,
  detail,
  compact = false,
}: VitalValueProps) {
  return (
    <div
      className={cn(
        'grid min-h-0 grid-rows-[auto_1fr_auto] border-b border-white/15 px-[6%] py-[3%] font-mono',
        color === 'green' && 'text-ecg-green',
        color === 'purple' && 'text-purple-etco2',
        color === 'yellow' && 'text-yellow-spo2',
        color === 'cyan' && 'text-cyan-bp',
      )}
    >
      <div className="flex items-baseline justify-between text-[clamp(7px,0.58vw,10px)] font-bold">
        <span>{label}</span>
        {unit && <span className="text-white/60">{unit}</span>}
      </div>
      <div
        className={cn(
          'self-center text-right text-[clamp(22px,3.3vw,53px)] font-bold leading-none tracking-tight tabular-nums',
          alarming && 'vital-alarm-flash',
          compact && 'text-[clamp(17px,2.35vw,38px)]',
        )}
      >
        {value}
      </div>
      <div className="min-h-[1em] text-right text-[clamp(7px,0.56vw,10px)] text-white/70">
        {detail}
      </div>
    </div>
  )
}

function TraceRow({
  label,
  scale,
  color,
  children,
}: {
  label: string
  scale: string
  color: 'green' | 'purple' | 'yellow'
  children: ReactNode
}) {
  return (
    <div className="relative min-h-0 border-b border-white/15">
      <div
        className={cn(
          'pointer-events-none absolute left-2 top-1 z-10 flex gap-[10vw] font-mono text-[clamp(7px,0.58vw,10px)] font-bold',
          color === 'green' && 'text-ecg-green',
          color === 'purple' && 'text-purple-etco2',
          color === 'yellow' && 'text-yellow-spo2',
        )}
      >
        <span>{label}</span>
        <span>{scale}</span>
      </div>
      <div className="absolute inset-x-0 bottom-0 top-[18%]">{children}</div>
    </div>
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
  spo2Waveform,
  etco2Waveform,
  active,
  cprOverride = false,
}: WagamiZScreenProps) {
  const alarms = getActiveAlarms(
    { hr: heartRate, bp_sys: bpSys, bp_dia: bpDia, spo2 },
    active,
  )
  const bpActive = active.bp_sys || active.bp_dia
  const map = bpActive ? Math.round((bpSys + 2 * bpDia) / 3) : null

  return (
    <section
      data-testid="wagami-z-screen"
      aria-label="Écran de monitorage Wagami Z"
      className="grid h-full min-h-0 w-full grid-rows-[7%_8%_1fr_12%] overflow-hidden bg-wagami-z-screen text-white"
    >
      <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-[3%] border-b border-white/10 px-[2%] font-mono text-[clamp(7px,0.58vw,10px)] font-bold text-white/80">
        <span>{formatFrenchMonitorDate(date)}</span>
        <span>{time}</span>
        <span>{sessionTimer}</span>
        <span className="flex items-center gap-1 text-ecg-green" aria-label="Batterie et réseau prêts">
          <span className="text-white/70">⌁</span>
          <span className="inline-block h-2 w-4 rounded-sm border border-current p-px">
            <span className="block h-full w-3/4 bg-current" />
          </span>
        </span>
      </div>

      <nav aria-label="Modes du moniteur" className="grid min-h-0 grid-cols-[1.15fr_0.8fr_0.45fr_1fr_1.2fr]">
        <ModeButton selected>DEA</ModeButton>
        <ModeButton>MANUEL</ModeButton>
        <button
          type="button"
          onClick={() => {}}
          aria-label="Alarmes silencieuses"
          className="border-r border-white/10 bg-wagami-z-control text-white transition hover:brightness-125 active:brightness-150 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-cyan-bp"
        >
          <SignalMutedIcon />
        </button>
        <ModeButton>{PATIENT_MODE_LABELS[patientMode]}</ModeButton>
        <ModeButton>OPTIONS ···</ModeButton>
      </nav>

      <div className="grid min-h-0 grid-cols-[1fr_23%]">
        <div className="grid min-h-0 grid-rows-[1.3fr_0.76fr_0.94fr]">
          <TraceRow label="ÉLECTRODES" scale="1 cm/mV" color="green">
            <ECGCanvas
              rhythm={rhythm}
              hr={heartRate}
              connected={active.hr && rhythm !== 'off'}
              cprOverride={cprOverride}
            />
          </TraceRow>
          <TraceRow label="CO₂" scale="0–60 mmHg" color="purple">
            <SecondaryChannel
              channel="etco2"
              hr={heartRate}
              spo2={spo2}
              etco2={etco2}
              spo2Waveform={spo2Waveform}
              etco2Waveform={etco2Waveform}
              connected={active.etco2 && etco2Waveform !== 'off'}
              showLabels={false}
            />
          </TraceRow>
          <TraceRow label="SpO₂" scale="1x" color="yellow">
            <SecondaryChannel
              channel="spo2"
              hr={heartRate}
              spo2={spo2}
              etco2={etco2}
              spo2Waveform={spo2Waveform}
              etco2Waveform={etco2Waveform}
              connected={active.spo2 && spo2Waveform !== 'off'}
              showLabels={false}
            />
          </TraceRow>
        </div>

        <aside aria-label="Signes vitaux" className="grid min-h-0 grid-rows-4 border-l border-white/15">
          <VitalValue
            label="FC"
            value={active.hr ? String(heartRate) : '—'}
            unit="bpm"
            color="green"
            alarming={alarms.includes('hr')}
            detail={active.hr ? undefined : 'OFF'}
          />
          <VitalValue
            label="EtCO₂"
            value={active.etco2 ? String(etco2) : '—'}
            unit="mmHg"
            color="purple"
            detail={active.etco2 ? undefined : 'OFF'}
          />
          <VitalValue
            label="SpO₂"
            value={active.spo2 ? String(spo2) : '—'}
            unit="%"
            color="yellow"
            alarming={alarms.includes('spo2')}
            detail={active.spo2 ? undefined : 'OFF'}
          />
          <VitalValue
            label="PNI"
            value={bpActive ? `${bpSys}/${bpDia}` : '—'}
            unit="mmHg"
            color="cyan"
            alarming={alarms.includes('bp')}
            detail={bpActive ? `(${map})` : 'OFF'}
            compact
          />
        </aside>
      </div>

      <div className="grid min-h-0 grid-cols-[0.58fr_repeat(5,1fr)_0.95fr_1.15fr] border-t border-white/15">
        <InertTouchButton label="MENU" icon="grid" />
        <InertTouchButton label="PNI" icon="cuff" accent="cyan" />
        <InertTouchButton label="MARQUEUR" icon="marker" />
        <InertTouchButton label="IMPRIMER" icon="print" />
        <InertTouchButton label="CAPTURE" icon="camera" />
        <InertTouchButton label="12 LEAD" icon="lead" />
        <InertTouchButton label="ANALYSER" icon="analyze" accent="purple" />
        <button
          type="button"
          onClick={() => {}}
          aria-label={`Énergie ${joules} joules`}
          className="grid place-items-center bg-wagami-z-control px-1 font-mono text-[clamp(13px,1.55vw,26px)] font-bold text-white/55 transition hover:brightness-125 active:brightness-150 focus-visible:outline-2 focus-visible:outline-cyan-bp"
        >
          <span><span className="text-purple-etco2">ϟ</span> {joules} J</span>
        </button>
      </div>
    </section>
  )
}
