'use client'

import { useEffect, useRef, useState } from 'react'

import { WagamiZScreen } from '@/components/monitor/WagamiZScreen'
import { useWagamiZViewport, type WagamiZViewportState } from '@/hooks/useWagamiZViewport'
import { cn } from '@/lib/utils'
import type {
  Etco2Waveform,
  PatientMode,
  Rhythm,
  Spo2Waveform,
  VitalActiveState,
} from '@/types/vitals'

export type WagamiZPowerState = 'off' | 'booting' | 'on'

export type WagamiZDeviceProps = {
  initialPowerState?: Exclude<WagamiZPowerState, 'booting'>
  /** Controlled power state used by the read-only spectator renderer. */
  powerStateOverride?: WagamiZPowerState
  /** Reports every committed power transition for trainee projection. */
  onPowerStateChange?: (state: WagamiZPowerState) => void
  embedded?: boolean
  forceSupportedViewport?: boolean
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
  onPowerOn?: () => void
  onPowerOff?: () => void
}

const BOOT_DURATION_MS = 2000

function PowerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[58%] w-[58%] fill-none stroke-current stroke-[2.6]">
      <path d="M12 2v9" />
      <path d="M7.2 5.3a8 8 0 1 0 9.6 0" />
    </svg>
  )
}

function LightningIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[64%] w-[64%] fill-current">
      <path d="m13.5 1-8 13h5L9 23l9-14h-5l.5-8Z" />
    </svg>
  )
}

function BootScreen() {
  return (
    <div data-testid="wagami-z-boot-screen" className="grid h-full w-full place-items-center bg-black text-white">
      <span className="text-[clamp(34px,6cqw,86px)] font-black tracking-[0.04em]">WAGAMI</span>
    </div>
  )
}

function UnsupportedDisplay({ state }: { state: Exclude<WagamiZViewportState, 'supported'> }) {
  const portrait = state === 'portrait'
  return (
    <section data-testid="wagami-z-unsupported-display" className="grid h-full w-full place-items-center bg-black px-8 text-center text-white">
      <div className="space-y-3">
        <h1 className="text-2xl font-bold sm:text-3xl">
          {portrait ? 'Mode paysage requis' : 'Affichage non pris en charge'}
        </h1>
        <p className="text-base text-white/65 sm:text-lg">
          {portrait ? 'Tournez l’iPad pour continuer.' : 'Utilisez un iPad compatible en plein écran.'}
        </p>
      </div>
    </section>
  )
}

function StatusIndicator({ label, active }: { label: string; active: boolean }) {
  return (
    <span className="grid place-items-center gap-[18%]" aria-label={label}>
      <span className={cn(
        'aspect-square w-[clamp(7px,0.9cqw,13px)] rounded-full bg-emerald-950',
        active && 'bg-emerald-300 shadow-[0_0_8px_rgba(0,255,170,0.9)]',
      )} />
      <svg viewBox="0 0 24 8" aria-hidden="true" className="w-[clamp(12px,1.8cqw,24px)] fill-none stroke-white/80 stroke-[1.5]">
        <path d="M2 4c3-3 5 3 8 0s5 3 8 0 3 0 4 0" />
      </svg>
    </span>
  )
}

function InertPhysicalButton({ label, variant }: { label: string; variant: 'shock' | 'charge' }) {
  return (
    <div className="grid w-full place-items-center gap-[8%]">
      <span className="text-[clamp(9px,1.15cqw,15px)] font-bold tracking-wide text-slate-100">{label}</span>
      <button
        type="button"
        onClick={() => {}}
        aria-label={label}
        className={cn(
          'grid aspect-square min-h-11 min-w-11 w-full place-items-center rounded-full border-[clamp(2px,0.22cqw,4px)] transition hover:brightness-110 active:scale-95 active:brightness-125 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-bp',
          variant === 'shock' && 'wagami-z-shock-button text-white',
          variant === 'charge' && 'wagami-z-charge-button text-transparent',
        )}
      >
        {variant === 'shock' ? <LightningIcon /> : null}
      </button>
    </div>
  )
}

type WagamiZShellProps = WagamiZDeviceProps & {
  powerState: WagamiZPowerState
  onPowerToggle: () => void
}

function WagamiZShell({
  powerState,
  onPowerToggle,
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
}: WagamiZShellProps) {
  return (
    <div data-testid="wagami-z-shell" className="wagami-z-shell relative shrink-0 [container-type:size]">
      <div data-testid="wagami-z-lower-body" className="wagami-z-lower-body absolute bottom-0 left-[3%] h-[16.3%] w-[94%]" />
      <div className="wagami-z-left-foot absolute bottom-0 left-[4.5%] h-[8%] w-[20%]" />
      <div className="wagami-z-right-foot absolute bottom-0 right-[4.5%] h-[8%] w-[20%]" />

      <div className="wagami-z-upper-housing absolute inset-x-0 top-0 h-[93.5%] rounded-[11%]" />
      <div className="wagami-z-faceplate absolute left-[3.3%] top-[2.8%] h-[83%] w-[93.4%] rounded-[9.5%]" />
      <div className="wagami-z-top-handle absolute left-[41%] top-0 h-[4.4%] w-[18%] rounded-b-[18%]" />

      <button
        type="button"
        onClick={onPowerToggle}
        aria-label="Alimentation"
        aria-pressed={powerState !== 'off'}
        className={cn(
          'absolute left-[14.9%] top-[5.8%] z-30 grid aspect-square min-h-11 min-w-11 w-[5.6%] place-items-center rounded-full border-[clamp(2px,0.23cqw,4px)] text-white transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-bp',
          powerState === 'off' && 'border-green-950 bg-green-950',
          powerState === 'booting' && 'animate-pulse border-pending-amber bg-pending-amber',
          powerState === 'on' && 'wagami-z-power-on text-green-950',
        )}
      >
        <PowerIcon />
      </button>

      <div className="absolute left-[23.2%] top-[6.8%] z-30 flex h-[4.7%] items-start gap-[1.8cqw]">
        <StatusIndicator label="Indicateur secteur" active={powerState === 'on'} />
        <StatusIndicator label="Indicateur batterie" active={powerState === 'on'} />
      </div>

      <div className="absolute left-1/2 top-[5.2%] z-30 -translate-x-1/2 text-center text-[clamp(30px,4.5cqw,52px)] font-black tracking-[-0.04em] text-white drop-shadow-[0_2px_1px_rgba(0,0,0,0.18)]">WAGAMI</div>

      <div className="wagami-z-readiness absolute left-[70.8%] top-[5.6%] z-30 grid h-[6.2%] w-[10%] place-items-center rounded-[42%]">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[68%] w-auto fill-none stroke-emerald-700 stroke-[3.3]"><path d="m5 12 4 4L19 6" /></svg>
      </div>
      <span aria-hidden="true" className="absolute left-[89.9%] top-[9%] z-30 aspect-square w-[1.05%] rounded-full bg-black shadow-[inset_0_1px_2px_rgba(255,255,255,0.35)]" />

      <div data-testid="wagami-z-screen-bezel" className="wagami-z-screen-bezel absolute left-[10.5%] top-[14.8%] z-30 h-[66.8%] w-[73.7%] rounded-[4.3%] p-[1.85%]">
        <div className="h-full w-full overflow-hidden rounded-[1.8%] bg-black [container-type:size]">
          {powerState === 'off' ? <div className="h-full w-full bg-black" /> : null}
          {powerState === 'booting' ? <BootScreen /> : null}
          {powerState === 'on' ? (
            <WagamiZScreen
              date={date}
              time={time}
              sessionTimer={sessionTimer}
              patientMode={patientMode}
              rhythm={rhythm}
              heartRate={heartRate}
              spo2={spo2}
              etco2={etco2}
              bpSys={bpSys}
              bpDia={bpDia}
              joules={joules}
              shockCount={shockCount}
              spo2Waveform={spo2Waveform}
              etco2Waveform={etco2Waveform}
              active={active}
              cprOverride={cprOverride}
            />
          ) : null}
        </div>
      </div>

      <div className="absolute right-[5.75%] top-[17.2%] z-30 w-[6.5%]"><InertPhysicalButton label="CHOC" variant="shock" /></div>
      <div className="absolute right-[6.15%] top-[33.1%] z-30 w-[5.7%]"><InertPhysicalButton label="CHARGE" variant="charge" /></div>

      <button type="button" onClick={() => {}} aria-label="Sélecteur rotatif" className="wagami-z-knob absolute right-[4.45%] top-[65.25%] z-30 aspect-square min-h-11 min-w-11 w-[8.9%] rounded-full transition hover:brightness-110 active:rotate-6 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-bp">
        <span className="absolute bottom-[10%] left-1/2 h-[17%] w-[6%] -translate-x-1/2 rounded-full bg-slate-400" />
      </button>

      <div className="absolute left-1/2 top-[80.7%] z-30 -translate-x-1/2 text-[clamp(28px,3.4cqw,50px)] font-bold leading-none text-white drop-shadow-[0_2px_1px_rgba(0,0,0,0.2)]">Z</div>

      <div className="wagami-z-speaker-pod absolute left-[43.1%] top-[85.5%] z-40 grid h-[7.7%] w-[13.8%] place-items-center rounded-b-[36%]">
        <div aria-label="Haut-parleur" className="grid w-[62%] gap-[16%]">
          <span className="h-[clamp(3px,0.42cqh,6px)] rounded-full bg-black/85" />
          <span className="h-[clamp(3px,0.42cqh,6px)] rounded-full bg-black/85" />
          <span className="h-[clamp(3px,0.42cqh,6px)] rounded-full bg-black/85" />
        </div>
      </div>
    </div>
  )
}

export function WagamiZDevice({
  initialPowerState = 'off',
  powerStateOverride,
  onPowerStateChange,
  embedded = false,
  forceSupportedViewport = false,
  onPowerOn,
  onPowerOff,
  ...props
}: WagamiZDeviceProps) {
  const [internalPowerState, setPowerState] = useState<WagamiZPowerState>(initialPowerState)
  const powerState = powerStateOverride ?? internalPowerState
  const bootTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reportedPowerStateRef = useRef(powerState)
  const detectedViewportState = useWagamiZViewport()
  const viewportState = forceSupportedViewport ? 'supported' : detectedViewportState

  useEffect(() => {
    return () => {
      if (bootTimerRef.current) clearTimeout(bootTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (reportedPowerStateRef.current === powerState) return
    reportedPowerStateRef.current = powerState
    onPowerStateChange?.(powerState)
  }, [onPowerStateChange, powerState])

  const handlePowerToggle = () => {
    if (powerState === 'booting') return

    if (powerState === 'on') {
      setPowerState('off')
      onPowerOff?.()
      return
    }

    setPowerState('booting')
    bootTimerRef.current = setTimeout(() => {
      bootTimerRef.current = null
      setPowerState('on')
      onPowerOn?.()
    }, BOOT_DURATION_MS)
  }

  return (
    <main data-testid="wagami-z-device" data-power-state={powerState} data-viewport-state={viewportState} className={cn(
      'wagami-z-stage grid place-items-center overflow-hidden bg-wagami-z-backdrop',
      embedded ? 'h-full w-full' : 'h-[100dvh] w-screen',
    )}>
      {viewportState === 'supported' ? (
        <WagamiZShell {...props} powerState={powerState} onPowerToggle={handlePowerToggle} />
      ) : (
        <UnsupportedDisplay state={viewportState} />
      )}
    </main>
  )
}
