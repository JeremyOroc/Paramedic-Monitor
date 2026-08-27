'use client'

import { useEffect, useRef, useState } from 'react'

import { WagamiZScreen } from '@/components/monitor/WagamiZScreen'
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
  onPowerOn?: () => void
  onPowerOff?: () => void
}

const BOOT_DURATION_MS = 2000

function PowerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[58%] w-[58%] fill-none stroke-current stroke-[2.4]">
      <path d="M12 2v9" />
      <path d="M7.2 5.3a8 8 0 1 0 9.6 0" />
    </svg>
  )
}

function LightningIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[62%] w-[62%] fill-current">
      <path d="m13.5 1-8 13h5L9 23l9-14h-5l.5-8Z" />
    </svg>
  )
}

function InertPhysicalButton({
  label,
  variant,
}: {
  label: string
  variant: 'shock' | 'charge'
}) {
  return (
    <div className="grid place-items-center gap-1">
      <span className="text-[clamp(8px,0.68vw,12px)] font-bold tracking-wide text-slate-500">
        {label}
      </span>
      <button
        type="button"
        onClick={() => {}}
        aria-label={label}
        className={cn(
          'grid aspect-square w-[clamp(44px,5vw,78px)] place-items-center rounded-full border-[3px] transition hover:brightness-110 active:scale-95 active:brightness-125 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-bp',
          variant === 'shock' && 'border-orange-300 bg-wagami-z-shock-orange text-white shadow-[inset_0_0_0_5px_rgba(255,255,255,0.22),0_4px_7px_rgba(0,0,0,0.35)]',
          variant === 'charge' && 'border-slate-400 bg-wagami-z-charge-gray text-transparent shadow-[inset_0_0_0_4px_rgba(255,255,255,0.18),0_4px_7px_rgba(0,0,0,0.32)]',
        )}
      >
        {variant === 'shock' && <LightningIcon />}
      </button>
    </div>
  )
}

function BootScreen() {
  return (
    <div
      data-testid="wagami-z-boot-screen"
      className="grid h-full w-full place-items-center bg-black text-white"
    >
      <span className="text-[clamp(32px,6vw,90px)] font-black tracking-[0.04em]">WAGAMI</span>
    </div>
  )
}

export function WagamiZDevice({
  initialPowerState = 'off',
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
  onPowerOn,
  onPowerOff,
}: WagamiZDeviceProps) {
  const [powerState, setPowerState] = useState<WagamiZPowerState>(initialPowerState)
  const bootTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (bootTimerRef.current) clearTimeout(bootTimerRef.current)
    }
  }, [])

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
    <main
      data-testid="wagami-z-device"
      data-power-state={powerState}
      className="grid h-screen w-screen min-w-[1024px] place-items-center overflow-hidden bg-wagami-z-backdrop p-[1.5vh]"
    >
      <div className="relative aspect-[1.34] h-[95vh] max-h-[calc(97vw/1.34)]">
        <div className="absolute inset-x-[5%] bottom-0 h-[17%] rounded-b-[9%] bg-wagami-z-frame-dark shadow-[0_20px_40px_rgba(0,0,0,0.5)]" />
        <div className="absolute inset-x-0 top-0 h-[91%] overflow-hidden rounded-[10%] bg-wagami-z-frame p-[1.45%] shadow-[0_22px_45px_rgba(0,0,0,0.55),inset_0_0_0_3px_rgba(255,255,255,0.1)]">
          <div className="relative h-full overflow-hidden rounded-[9%] border border-wagami-z-face-edge bg-wagami-z-face shadow-[inset_0_0_25px_rgba(255,255,255,0.7)]">
            <div className="absolute left-[40%] top-0 h-[5.5%] w-[22%] rounded-b-[20%] bg-slate-200 shadow-[inset_0_-5px_8px_rgba(0,0,0,0.14)]" />

            <div className="absolute left-[10%] top-[5.2%] flex h-[8%] items-center gap-[3.5%]">
              <button
                type="button"
                onClick={handlePowerToggle}
                aria-label="Alimentation"
                aria-pressed={powerState !== 'off'}
                className={cn(
                  'grid aspect-square h-full place-items-center rounded-full border-[3px] text-white transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-bp',
                  powerState === 'off' && 'border-green-950 bg-green-950',
                  powerState === 'booting' && 'animate-pulse border-pending-amber bg-pending-amber',
                  powerState === 'on' && 'border-green-300 bg-ecg-green text-green-950 shadow-[0_0_14px_rgba(0,255,65,0.75)]',
                )}
              >
                <PowerIcon />
              </button>
              <span
                aria-label="Indicateur secteur"
                className={cn(
                  'h-[16%] aspect-square rounded-full bg-emerald-900',
                  powerState === 'on' && 'bg-emerald-300 shadow-[0_0_8px_rgba(0,255,170,0.9)]',
                )}
              />
              <span
                aria-label="Indicateur batterie"
                className={cn(
                  'h-[16%] aspect-square rounded-full bg-emerald-900',
                  powerState === 'on' && 'bg-emerald-300 shadow-[0_0_8px_rgba(0,255,170,0.9)]',
                )}
              />
            </div>

            <div className="absolute left-1/2 top-[6%] -translate-x-1/2 text-center text-[clamp(25px,3vw,49px)] font-black tracking-tight text-white drop-shadow-sm">
              WAGAMI<span className="text-[0.5em] align-top">®</span>
            </div>

            <div className="absolute right-[15%] top-[5.2%] flex h-[7%] w-[10%] items-center justify-center rounded-[38%] bg-wagami-z-readiness shadow-[inset_0_2px_7px_rgba(0,0,0,0.45)]">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[75%] w-auto fill-none stroke-cyan-600 stroke-[3]">
                <path d="m5 12 4 4L19 6" />
              </svg>
            </div>

            <div className="absolute left-[9%] top-[18%] h-[65%] w-[70%] rounded-[4%] bg-wagami-z-bezel p-[1.35%] shadow-[0_8px_12px_rgba(0,0,0,0.38),inset_0_0_0_3px_rgba(255,255,255,0.12)]">
              <div className="h-full w-full overflow-hidden rounded-[1.5%] bg-black">
                {powerState === 'off' && <div className="h-full w-full bg-black" />}
                {powerState === 'booting' && <BootScreen />}
                {powerState === 'on' && (
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
                    spo2Waveform={spo2Waveform}
                    etco2Waveform={etco2Waveform}
                    active={active}
                    cprOverride={cprOverride}
                  />
                )}
              </div>
            </div>

            <div className="absolute right-[4.5%] top-[20%] grid h-[47%] w-[12%] grid-rows-2 place-items-center">
              <InertPhysicalButton label="CHOC" variant="shock" />
              <InertPhysicalButton label="CHARGE" variant="charge" />
            </div>

            <button
              type="button"
              onClick={() => {}}
              aria-label="Sélecteur rotatif"
              className="absolute right-[6.3%] top-[70%] aspect-square w-[8.8%] rounded-full border-[5px] border-slate-500 bg-wagami-z-knob shadow-[inset_8px_0_0_rgba(255,255,255,0.13),inset_-7px_0_0_rgba(0,0,0,0.6),0_5px_8px_rgba(0,0,0,0.4)] transition hover:brightness-110 active:rotate-6 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-bp"
            >
              <span className="absolute bottom-[10%] left-1/2 h-[20%] w-[7%] -translate-x-1/2 rounded-full bg-slate-400" />
            </button>

            <div className="absolute bottom-[4%] left-1/2 -translate-x-1/2 text-[clamp(26px,3vw,48px)] font-bold leading-none text-white drop-shadow-sm">
              Z<span className="text-[0.48em] align-top">®</span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-[2.2%] left-1/2 grid h-[8.5%] w-[18%] -translate-x-1/2 place-items-center rounded-b-[35%] bg-wagami-z-frame-dark">
          <div aria-label="Haut-parleur" className="grid w-[60%] gap-[12%]">
            <span className="h-[clamp(3px,0.4vh,6px)] rounded-full bg-black/75" />
            <span className="h-[clamp(3px,0.4vh,6px)] rounded-full bg-black/75" />
            <span className="h-[clamp(3px,0.4vh,6px)] rounded-full bg-black/75" />
          </div>
        </div>
      </div>
    </main>
  )
}
