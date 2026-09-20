'use client'

import { useEffect, useRef, useState } from 'react'

import { useAlarm } from '@/hooks/useAlarm'
import { useCPRTimer } from '@/hooks/useCPRTimer'
import { useDefibAudio } from '@/hooks/useDefibAudio'
import { useDefibSequence } from '@/hooks/useDefibSequence'
import { useNibpReading, type NibpSnapshot } from '@/hooks/useNibpReading'
import {
  playCprMetronome,
  setAudioMuted,
  stopAllAudio,
  stopCprAudioSequence,
} from '@/lib/audio'
import { energyDown, energyUp } from '@/lib/defib/defibMachine'
import { isWagamiAPatientModeLocked, nextWagamiAPatientMode } from '@/lib/wagamiAPatientMode'
import type { WagamiADisplayState } from '@/lib/wagamiAPreviewState'
import { playWagamiACprPrompt, playWagamiADefibPrompt } from '@/lib/wagamiAVoice'
import type { WagamiALocale } from '@/types/wagamiA'
import { getCprHeartRate, type CprMode, type PatientMode } from '@/types/vitals'

export type WagamiAClinicalEvent = {
  kind: string
  label: string
  payload?: unknown
}

type Options = {
  sourceDisplay: WagamiADisplayState
  cprMode: CprMode
  locale?: WagamiALocale
  onStudentEvent?: (event: WagamiAClinicalEvent) => void
  onAcceptBpReading?: (snapshot: NibpSnapshot) => void
}

/** A4's Room-free clinical adapter. A6 may supply live event/BP sinks. */
export function useWagamiAClinicalCore({
  sourceDisplay,
  cprMode,
  locale = 'fr',
  onStudentEvent,
  onAcceptBpReading,
}: Options) {
  const [poweredOn, setPoweredOn] = useState(true)
  const [patientMode, setPatientMode] = useState<PatientMode>('adult')
  const [muted, setMuted] = useState(false)
  const [acceptedBp, setAcceptedBp] = useState<NibpSnapshot | null>(null)
  const shockPressedRef = useRef(false)
  const wasMutedRef = useRef(muted)
  const cprHeartRate = getCprHeartRate(cprMode)

  const defib = useDefibSequence({
    patientMode,
    rhythm: sourceDisplay.vitals.rhythm,
    chargePolicy: 'wagamiA',
    playPrompt: (prompt) => playWagamiADefibPrompt(locale, prompt),
    playCprPrompt: (onEnded) => playWagamiACprPrompt(locale, onEnded),
    onAnalyzeResult(result, analyzedRhythm) {
      onStudentEvent?.({
        kind: 'analyze',
        label: result === 'shock' ? 'Analyze - Shock' : 'Analyze - No Shock',
        payload: { result, rhythm: analyzedRhythm },
      })
    },
  })

  useEffect(() => {
    if (defib.state !== 'charged') shockPressedRef.current = false
  }, [defib.state])

  const pendingBp: NibpSnapshot = {
    bpSys: sourceDisplay.vitals.bp_sys,
    bpDia: sourceDisplay.vitals.bp_dia,
    active: {
      bp_sys: sourceDisplay.active.bp_sys,
      bp_dia: sourceDisplay.active.bp_dia,
    },
  }
  const nibp = useNibpReading(pendingBp, (snapshot) => {
    setAcceptedBp(snapshot)
    onAcceptBpReading?.(snapshot)
    onStudentEvent?.({
      kind: 'nibp_result',
      label: `NIBP ${snapshot.bpSys}/${snapshot.bpDia}`,
      payload: { bp_sys: snapshot.bpSys, bp_dia: snapshot.bpDia },
    })
  })
  const nibpReadingActive =
    nibp.phase === 'please_wait' || nibp.phase === 'reading' || nibp.phase === 'counting'

  const vitals = {
    ...sourceDisplay.vitals,
    hr: cprHeartRate ?? sourceDisplay.vitals.hr,
    bp_sys: acceptedBp?.bpSys ?? sourceDisplay.vitals.bp_sys,
    bp_dia: acceptedBp?.bpDia ?? sourceDisplay.vitals.bp_dia,
  }
  const active = {
    ...sourceDisplay.active,
    hr: cprHeartRate !== null || sourceDisplay.active.hr,
    bp_sys: acceptedBp?.active.bp_sys ?? (sourceDisplay.simulated && sourceDisplay.active.bp_sys),
    bp_dia: acceptedBp?.active.bp_dia ?? (sourceDisplay.simulated && sourceDisplay.active.bp_dia),
  }
  const alarmActive = {
    ...active,
    bp_sys: !nibpReadingActive && !!acceptedBp?.active.bp_sys,
    bp_dia: !nibpReadingActive && !!acceptedBp?.active.bp_dia,
  }
  const alarm = useAlarm(vitals, poweredOn, muted, true, alarmActive)
  useDefibAudio(defib.state, muted || !poweredOn)
  const cprTimer = useCPRTimer(defib.state === 'cpr' ? defib.cprStartTime : null)
  const patientModeLocked = isWagamiAPatientModeLocked(defib.state)
  const canReadBP = sourceDisplay.active.bp_sys || sourceDisplay.active.bp_dia ||
    !!acceptedBp?.active.bp_sys || !!acceptedBp?.active.bp_dia

  useEffect(() => {
    if (defib.state === 'cpr' && cprTimer.isDone) stopCprAudioSequence()
  }, [cprTimer.isDone, defib.state])

  useEffect(() => {
    const wasMuted = wasMutedRef.current
    wasMutedRef.current = muted
    if (
      wasMuted &&
      !muted &&
      defib.state === 'cpr' &&
      defib.cprStartTime !== null &&
      !cprTimer.isDone
    ) {
      playCprMetronome()
    }
  }, [cprTimer.isDone, defib.cprStartTime, defib.state, muted])

  useEffect(() => () => {
    stopAllAudio()
    setAudioMuted(false)
  }, [])

  function onPowerToggle() {
    if (poweredOn) {
      onStudentEvent?.({ kind: 'power_off', label: 'Power Off' })
      stopAllAudio()
      nibp.cancelReading()
      defib.reset()
      shockPressedRef.current = false
      setAudioMuted(false)
      setMuted(false)
      setAcceptedBp(null)
      setPoweredOn(false)
      return
    }
    onStudentEvent?.({ kind: 'power_on', label: 'Power On' })
    setPoweredOn(true)
  }

  function onAnalyse() {
    if (!poweredOn || !defib.canAnalyse) return
    defib.onAnalyse()
  }

  function onCharge() {
    if (!poweredOn || !defib.canCharge) return
    onStudentEvent?.({
      kind: 'charge', label: 'Charge',
      payload: { joules: defib.energy, state: defib.state },
    })
    defib.onCharge()
  }

  function onShock() {
    if (!poweredOn || !defib.canShock || shockPressedRef.current) return
    shockPressedRef.current = true
    onStudentEvent?.({
      kind: 'shock', label: 'Shock',
      payload: { joules: defib.energy, state: defib.state },
    })
    defib.onShock()
  }

  function onMute() {
    if (!poweredOn) return
    setAudioMuted(!muted)
    setMuted(!muted)
  }

  function onPatientModeCycle() {
    if (!poweredOn || patientModeLocked) return
    setPatientMode((current) => nextWagamiAPatientMode(current))
  }

  function onReadBP() {
    if (!poweredOn || !canReadBP) return
    if (!nibpReadingActive) {
      onStudentEvent?.({
        kind: 'nibp_start', label: 'NIBP Start',
        payload: { mode: 'manual', intervalMinutes: null },
      })
    }
    nibp.handlePatientEvent()
  }

  function onEnergyUp() {
    if (!poweredOn || !defib.canAdjustEnergy) return
    const to = energyUp({ patientMode, energy: defib.energy }, patientMode).energy
    onStudentEvent?.({
      kind: 'energy_change', label: 'Energy Up',
      payload: { from: defib.energy, to },
    })
    defib.onEnergyUp()
  }

  function onEnergyDown() {
    if (!poweredOn || !defib.canAdjustEnergy) return
    const to = energyDown({ patientMode, energy: defib.energy }, patientMode).energy
    onStudentEvent?.({
      kind: 'energy_change', label: 'Energy Down',
      payload: { from: defib.energy, to },
    })
    defib.onEnergyDown()
  }

  return {
    poweredOn,
    patientMode,
    patientModeLocked,
    muted,
    canReadBP,
    nibpReadingActive,
    nibpPhase: nibp.phase,
    nibpDisplayValue: nibp.displayValue,
    cprOverride: cprHeartRate !== null,
    cprTime: defib.state === 'cpr' ? cprTimer.formatted : '--:--',
    display: {
      vitals, active, simulated: sourceDisplay.simulated,
      alarms: alarm.activeAlarms,
    } satisfies WagamiADisplayState,
    defib,
    onPowerToggle,
    onAnalyse,
    onCharge,
    onShock,
    onMute,
    onPatientModeCycle,
    onReadBP,
    onEnergyUp,
    onEnergyDown,
  }
}
