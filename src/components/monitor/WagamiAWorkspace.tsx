'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { TwelveLeadPage } from '@/components/monitor/TwelveLeadPage'
import { TwelveLeadPrintout } from '@/components/monitor/TwelveLeadPrintout'
import { WagamiAClinicalStatusLine } from '@/components/monitor/WagamiAClinicalStatusLine'
import { WagamiAScreen } from '@/components/monitor/WagamiAScreen'
import type { WagamiAWorkspaceController } from '@/hooks/useWagamiAWorkspace'
import type { DefibChargeOrigin, DefibState } from '@/hooks/useDefibSequence'
import type { NibpPhase } from '@/hooks/useNibpReading'
import type { VitalLogEntry } from '@/hooks/useVitalLog'
import { getWagamiAText } from '@/lib/wagamiALocalization'
import { ALL_MEDICATIONS } from '@/lib/monitor/medications'
import { isWagamiACallInfoBlocked } from '@/lib/wagamiACallInfo'
import { TWELVE_LEAD_TRANSMISSION_DESTINATIONS } from '@/lib/twelveLeadTransmission'
import { createBeatClock } from '@/lib/ecg/beatClock'
import { cn } from '@/lib/utils'
import type { WagamiADisplayState } from '@/lib/wagamiAPreviewState'
import { NIBP_AUTO_INTERVALS } from '@/types/nibp'
import { VITAL_LOG_INTERVALS } from '@/types/vitalLog'
import type { WagamiALocale } from '@/types/wagamiA'
import type { AlarmChannel, PatientMode } from '@/types/vitals'

const MEDICATION_LOG_PAGE_SIZE = 8
const VITAL_LOG_PAGE_SIZE = 10

type WagamiAWorkspaceProps = {
  controller: WagamiAWorkspaceController
  display: WagamiADisplayState
  energy: number
  defibState: DefibState
  chargeProgress: number
  chargeOrigin?: DefibChargeOrigin
  cprTime: string
  cprOverride: boolean
  nibpPhase: NibpPhase
  nibpDisplayValue: string | number
  patientMode: PatientMode
  canAdjustEnergy: boolean
  onEnergyDown: () => void
  onEnergyUp: () => void
  selectedAction?: string | null
  readOnly?: boolean
  onMonitorReady?: () => void
  date?: string
  time?: string
  sessionTimer?: string
  waveformSequenceKey?: string | number
  vitalLog?: VitalLogEntry[]
}

type ViewFrameProps = {
  title: string
  onBack: () => void
  backLabel: string
  patientMode: PatientMode
  alarms: AlarmChannel[]
  locale: WagamiALocale
  children: React.ReactNode
}

function ViewFrame({ title, onBack, backLabel, patientMode, alarms, locale, children }: ViewFrameProps) {
  return (
    <section className="grid h-full min-h-0 grid-rows-[clamp(42px,5cqw,68px)_minmax(0,1fr)] overflow-hidden bg-wagami-a-screen text-wagami-a-text">
      <header className="flex items-center gap-3 border-b border-wagami-a-border bg-wagami-a-surface px-[clamp(8px,1.1cqw,16px)]">
        <button type="button" onClick={onBack} className="min-h-[44px] rounded border border-wagami-a-border bg-wagami-a-surface-raised px-3 font-sans text-[clamp(10px,1cqw,15px)] font-semibold focus-visible:outline-2 focus-visible:outline-wagami-a-pni">← {backLabel}</button>
        <h1 className="min-w-0 truncate font-sans text-[clamp(15px,1.7cqw,25px)] font-semibold">{title}</h1>
        <WagamiAClinicalStatusLine patientMode={patientMode} alarms={alarms} locale={locale} className="ml-auto h-full max-w-[48%] shrink-0 justify-end text-right" />
      </header>
      <div className="relative min-h-0 overflow-hidden">{children}</div>
    </section>
  )
}

type WagamiAText = ReturnType<typeof getWagamiAText>

function VitalLogTable({ entries, text }: { entries: VitalLogEntry[]; text: WagamiAText }) {
  const rows = Array.from({ length: VITAL_LOG_PAGE_SIZE }, (_, index) => entries[index] ?? null)

  return (
    <div className="relative min-h-0 overflow-hidden">
      <table data-testid="wagami-a-vital-log-table" className="h-full w-full table-fixed border-collapse">
        <thead className="bg-wagami-a-surface-raised">
          <tr className="h-[clamp(28px,3.1cqw,38px)] text-center font-sans text-[clamp(12px,0.95cqw,15px)] font-bold">
            <th scope="col">{text.time}</th>
            <th scope="col" className="text-wagami-a-ecg">{text.heartRate}</th>
            <th scope="col" className="text-wagami-a-pni">{text.bpSys}</th>
            <th scope="col" className="text-wagami-a-pni">{text.bpDia}</th>
            <th scope="col" className="text-wagami-a-etco2">EtCO₂</th>
            <th scope="col" className="text-wagami-a-spo2">SpO₂</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((entry, index) => (
            <tr
              key={entry?.timestamp ?? `empty-${index}`}
              data-testid="wagami-a-vital-log-row"
              data-empty={entry ? 'false' : 'true'}
              aria-hidden={entry ? undefined : true}
              className="border-b border-wagami-a-border/80 text-center font-mono text-[clamp(15px,1.15cqw,18px)] tabular-nums"
            >
              <td>{entry?.timestamp ?? '\u00a0'}</td>
              <td>{entry ? (entry.fc ?? '-') : '\u00a0'}</td>
              <td>{entry ? (entry.pniSys ?? '-') : '\u00a0'}</td>
              <td>{entry ? (entry.pniDia ?? '-') : '\u00a0'}</td>
              <td>{entry ? (entry.etco2 ?? '-') : '\u00a0'}</td>
              <td>{entry ? (entry.spo2 ?? '-') : '\u00a0'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!entries.length ? (
        <p className="pointer-events-none absolute inset-x-0 bottom-0 top-[clamp(28px,3.1cqw,38px)] grid place-items-center bg-wagami-a-screen/78 text-center font-sans text-[clamp(14px,1.1cqw,17px)] font-semibold text-wagami-a-muted-text">
          {text.noVitals}
        </p>
      ) : null}
    </div>
  )
}

function VitalLogIntervalBand({
  interval,
  readOnly,
  onChange,
  text,
}: {
  interval: (typeof VITAL_LOG_INTERVALS)[number]
  readOnly: boolean
  onChange: (interval: (typeof VITAL_LOG_INTERVALS)[number]) => void
  text: WagamiAText
}) {
  return (
    <div role="group" aria-label={text.vitalLogInterval} className="grid min-h-0 grid-cols-[minmax(150px,0.8fr)_minmax(0,2fr)] items-center gap-3 rounded border border-wagami-a-border bg-wagami-a-surface px-3">
      <span className="font-sans text-[clamp(12px,1cqw,16px)] font-semibold">{text.vitalLogInterval}</span>
      <div className="grid grid-cols-6 gap-1">
        {VITAL_LOG_INTERVALS.map((option) => (
          <Toggle key={option} active={interval === option} disabled={readOnly} onClick={() => onChange(option)}>
            {option} {text.minutes}
          </Toggle>
        ))}
      </div>
    </div>
  )
}

export function WagamiAWorkspace({
  controller,
  display,
  energy,
  defibState,
  chargeProgress,
  chargeOrigin,
  cprTime,
  cprOverride,
  nibpPhase,
  nibpDisplayValue,
  patientMode,
  canAdjustEnergy,
  onEnergyDown,
  onEnergyUp,
  selectedAction,
  readOnly = false,
  onMonitorReady,
  date,
  time,
  sessionTimer,
  waveformSequenceKey,
  vitalLog = [],
}: WagamiAWorkspaceProps) {
  const text = getWagamiAText(controller.preferences.locale)
  const [etco2ClockNow, setEtco2ClockNow] = useState(() => Date.now())
  const etco2Deadline = controller.etco2Status === 'calibrating'
    ? controller.etco2EndsAt
    : controller.etco2Status === 'cancelled'
      ? controller.etco2CancellationEndsAt
      : null
  useEffect(() => {
    if (etco2Deadline === null) return
    const timer = setTimeout(
      () => setEtco2ClockNow(Date.now()),
      Math.max(0, etco2Deadline - Date.now()),
    )
    return () => clearTimeout(timer)
  }, [etco2Deadline])
  const effectiveEtco2Status = controller.etco2Status === 'calibrating' && controller.etco2EndsAt !== null && etco2ClockNow >= controller.etco2EndsAt
    ? 'calibrated'
    : controller.etco2Status === 'cancelled' && controller.etco2CancellationEndsAt !== null && etco2ClockNow >= controller.etco2CancellationEndsAt
      ? 'idle'
      : controller.etco2Status
  const [eventPage, setEventPage] = useState(1)
  const [vitalPage, setVitalPage] = useState(1)
  const clinicalStatus = { patientMode, alarms: display.alarms, locale: controller.preferences.locale }
  const callInfoBlocked = isWagamiACallInfoBlocked(defibState)
  const [beatClock] = useState(() => createBeatClock(Date.now()))
  const signalKey = `${display.vitals.rhythm}:${display.active.hr ? 'on' : 'off'}`
  const priorSignalKey = useRef(signalKey)
  useLayoutEffect(() => {
    if (priorSignalKey.current === signalKey) return
    priorSignalKey.current = signalKey
    beatClock.reset(Date.now())
  }, [beatClock, signalKey])

  const [surfaceState, setSurfaceState] = useState(() => ({
    target: controller.view,
    revealed: controller.view,
    twelveLeadMounted: controller.view === 'twelveLead',
  }))
  const target = controller.view
  const currentSurfaceState = surfaceState.target === target
    ? surfaceState
    : {
        target,
        revealed: target === 'monitor' || target === 'twelveLead' ? surfaceState.revealed : target,
        twelveLeadMounted: surfaceState.twelveLeadMounted || target === 'twelveLead',
      }
  if (surfaceState.target !== target) setSurfaceState(currentSurfaceState)
  const revealed = currentSurfaceState.revealed
  const pageView = revealed === 'monitor' || revealed === 'twelveLead' ? target : revealed
  const monitorOccluded = revealed !== 'monitor' && target !== 'monitor'
  const twelveLeadCovered = controller.twelveLead.captureState !== 'idle' || controller.twelveLead.printOpen || controller.twelveLead.transmissionOpen
  const twelveLeadOccluded = (revealed !== 'twelveLead' && target !== 'twelveLead') || (revealed === 'twelveLead' && twelveLeadCovered)
  const revealMonitor = useCallback(() => {
    if (target !== 'monitor') return
    setSurfaceState((current) => current.revealed === 'monitor' ? current : { ...current, revealed: 'monitor' })
    onMonitorReady?.()
  }, [onMonitorReady, target])
  const revealTwelveLead = useCallback(() => {
    if (target !== 'twelveLead') return
    setSurfaceState((current) => current.revealed === 'twelveLead' ? current : { ...current, revealed: 'twelveLead' })
  }, [target])

  let content: React.ReactNode = null

  if (pageView === 'medications') {
    content = (
      <ViewFrame title={text.medicationsTitle} onBack={controller.goBack} backLabel={text.back} {...clinicalStatus}>
        <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_56px] gap-2 p-3">
          <div className="grid min-h-0 grid-cols-4 grid-rows-3 gap-2">
            {ALL_MEDICATIONS.map((medication) => {
              const confirmed = controller.flashedMedication === medication
              return (
                <button
                  key={medication}
                  type="button"
                  disabled={readOnly}
                  data-confirmed={confirmed ? 'true' : 'false'}
                  onClick={() => controller.recordMedication(medication)}
                  className={cn(
                    'min-h-[44px] rounded border font-sans font-semibold focus-visible:outline-2 focus-visible:outline-wagami-a-pni disabled:cursor-default',
                    confirmed
                      ? 'border-wagami-a-pni bg-wagami-a-pni text-wagami-a-screen'
                      : 'border-wagami-a-border bg-wagami-a-surface text-wagami-a-pni enabled:hover:bg-wagami-a-surface-raised',
                  )}
                >
                  {medication}
                </button>
              )
            })}
          </div>
          <button type="button" onClick={() => controller.setView('medicationLog')} className="rounded border border-wagami-a-border bg-wagami-a-surface-raised font-semibold focus-visible:outline-2 focus-visible:outline-wagami-a-pni">{text.eventLog} · {controller.medicationEvents.length}</button>
        </div>
      </ViewFrame>
    )
  } else if (pageView === 'medicationLog') {
    const totalPages = Math.max(1, Math.ceil(controller.medicationEvents.length / MEDICATION_LOG_PAGE_SIZE))
    const page = Math.min(eventPage, totalPages)
    const entries = controller.medicationEvents.slice((page - 1) * MEDICATION_LOG_PAGE_SIZE, page * MEDICATION_LOG_PAGE_SIZE)
    content = (
      <ViewFrame title={text.eventLog} onBack={controller.goBack} backLabel={text.back} {...clinicalStatus}>
        <div className="grid h-full grid-rows-[minmax(0,1fr)_52px] p-4">
          {entries.length ? <ul className="grid content-start gap-1">{entries.map((entry) => <li key={`${entry.occurredAtMs}-${entry.medication}`} className="grid grid-cols-[1fr_auto] border-b border-wagami-a-border px-3 py-2"><span>{entry.medication}</span><time className="font-mono text-wagami-a-muted-text">{entry.time}</time></li>)}</ul> : <p className="text-wagami-a-muted-text">{text.noEvents}</p>}
          <Pagination page={page} totalPages={totalPages} setPage={setEventPage} text={text} />
        </div>
      </ViewFrame>
    )
  } else if (pageView === 'vitalLog') {
    const totalPages = Math.max(1, Math.ceil(vitalLog.length / VITAL_LOG_PAGE_SIZE))
    const page = Math.min(vitalPage, totalPages)
    const entries = vitalLog.slice((page - 1) * VITAL_LOG_PAGE_SIZE, page * VITAL_LOG_PAGE_SIZE)
    content = (
      <ViewFrame title={text.vitalLogTitle} onBack={controller.goBack} backLabel={text.back} {...clinicalStatus}>
        <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_clamp(52px,5.7cqw,72px)_52px] gap-[clamp(4px,0.6cqw,8px)] p-[clamp(8px,1cqw,14px)]">
          <VitalLogTable entries={entries} text={text} />
          <VitalLogIntervalBand interval={controller.preferences.vitalLogInterval} readOnly={readOnly} onChange={controller.setVitalLogInterval} text={text} />
          <Pagination page={page} totalPages={totalPages} setPage={setVitalPage} text={text} />
        </div>
      </ViewFrame>
    )
  } else if (pageView === 'configure') {
    content = (
      <ViewFrame title={text.configureTitle} onBack={controller.goBack} backLabel={text.back} {...clinicalStatus}>
        <div className="grid h-full content-center gap-3 p-6">
          <div className="grid grid-cols-[1fr_auto] items-center rounded border border-wagami-a-border bg-wagami-a-surface p-4"><span>{text.patientModeLabel}</span><strong data-testid="wagami-a-configure-mode" className="rounded border border-wagami-a-border bg-wagami-a-surface-raised px-2 py-1 text-wagami-a-text">{patientMode === 'adult' ? text.adult : patientMode === 'pediatric' ? text.pediatric : text.neonate}</strong></div>
          <div className="grid grid-cols-[1fr_auto] items-center rounded border border-wagami-a-border bg-wagami-a-surface p-4"><span>{text.language}</span><div className="grid grid-cols-2 gap-1"><Toggle active={controller.preferences.locale === 'fr'} disabled={readOnly} onClick={() => controller.setLocale('fr')}>{text.french}</Toggle><Toggle active={controller.preferences.locale === 'en'} disabled={readOnly} onClick={() => controller.setLocale('en')}>{text.english}</Toggle></div></div>
          <div className="grid grid-cols-[1fr_auto] items-center rounded border border-wagami-a-border bg-wagami-a-surface p-4"><span>{text.alarmLed}</span><div className="grid grid-cols-2 gap-1"><Toggle active={controller.preferences.shellAlarmLedEnabled} disabled={readOnly} onClick={() => controller.setShellAlarmLedEnabled(true)}>{text.on}</Toggle><Toggle active={!controller.preferences.shellAlarmLedEnabled} disabled={readOnly} onClick={() => controller.setShellAlarmLedEnabled(false)}>{text.off}</Toggle></div></div>
        </div>
      </ViewFrame>
    )
  } else if (pageView === 'nibpSettings') {
    content = (
      <ViewFrame title={text.pniTitle} onBack={controller.goBack} backLabel={text.back} {...clinicalStatus}>
        <div className="grid h-full content-center gap-4 p-8">
          <div className="grid grid-cols-[1fr_auto] items-center rounded border border-wagami-a-border bg-wagami-a-surface p-4"><span>{text.pniMode}</span><div className="grid grid-cols-2 gap-1"><Toggle active={controller.nibpMode === 'manual'} onClick={() => controller.setNibpMode('manual')}>{text.manual}</Toggle><Toggle active={controller.nibpMode === 'automatic'} onClick={() => controller.setNibpMode('automatic')}>{text.automatic}</Toggle></div></div>
          <fieldset disabled={controller.nibpMode !== 'automatic'} className="rounded border border-wagami-a-border bg-wagami-a-surface p-4 disabled:opacity-50"><legend className="px-2">{text.interval}</legend><div className="grid grid-cols-6 gap-2">{NIBP_AUTO_INTERVALS.map((interval) => <Toggle key={interval} active={controller.nibpAutoInterval === interval} onClick={() => controller.setNibpAutoInterval(interval)}>{interval} {text.minutes}</Toggle>)}</div></fieldset>
        </div>
      </ViewFrame>
    )
  }

  const capture = controller.twelveLead.lastCapture

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        data-testid="wagami-a-live-layer"
        aria-hidden={revealed !== 'monitor' ? true : undefined}
        className={cn('absolute inset-0', revealed !== 'monitor' && 'invisible pointer-events-none')}
      >
        <WagamiAScreen
          display={display}
          energy={energy}
          defibState={defibState}
          chargeProgress={chargeProgress}
          chargeOrigin={chargeOrigin}
          cprTime={cprTime}
          cprOverride={cprOverride}
          nibpPhase={nibpPhase}
          nibpDisplayValue={nibpDisplayValue}
          patientMode={patientMode}
          selectedAction={selectedAction}
          canAdjustEnergy={canAdjustEnergy}
          onTask={(task) => {
            if (task === 'callInfo' && callInfoBlocked) return
            controller.openTask(task)
          }}
          onEnergyDown={onEnergyDown}
          onEnergyUp={onEnergyUp}
          onOpenNibpSettings={readOnly ? undefined : () => controller.setView('nibpSettings')}
          locale={controller.preferences.locale}
          callInfoDisabled={callInfoBlocked}
          waveformOccluded={monitorOccluded}
          onWaveformsReady={revealMonitor}
          beatClock={beatClock}
          date={date}
          time={time}
          sessionTimer={sessionTimer}
          waveformSequenceKey={waveformSequenceKey}
          etco2CalibrationStatus={effectiveEtco2Status}
          etco2CalibrationStartedAt={controller.etco2StartedAt}
          etco2CalibrationEndsAt={controller.etco2EndsAt}
        />
      </div>
      {currentSurfaceState.twelveLeadMounted ? (
        <div
          data-testid="wagami-a-twelve-lead-layer"
          aria-hidden={revealed !== 'twelveLead' ? true : undefined}
          className={cn('absolute inset-0 z-10', revealed !== 'twelveLead' && 'invisible pointer-events-none')}
        >
          <ViewFrame title={text.twelveLeadTitle} onBack={controller.goBack} backLabel={text.back} {...clinicalStatus}>
            <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_clamp(52px,6cqw,80px)]">
              <div className="relative min-h-0">
                <TwelveLeadPage rhythm={display.vitals.rhythm} hr={display.vitals.hr} occluded={twelveLeadOccluded} onReady={revealTwelveLead} beatClock={beatClock} readyOnStart freshReveal sequenceKey={waveformSequenceKey} />
                {controller.twelveLead.captureState === 'acquiring' ? (
                  <div role="status" className="absolute inset-0 grid place-items-center bg-wagami-a-screen/90 font-sans text-xl font-bold text-wagami-a-pni">{text.acquiring}</div>
                ) : null}
                {controller.twelveLead.captureState === 'result' && capture ? (
                  <div className="absolute inset-0"><TwelveLeadPrintout rhythm={capture.rhythm} hr={capture.hr} /></div>
                ) : null}
                {controller.twelveLead.printOpen && capture ? (
                  <div className="absolute inset-0"><TwelveLeadPrintout rhythm={capture.rhythm} hr={capture.hr} /></div>
                ) : null}
                {controller.twelveLead.transmissionOpen ? (
                  <div role="dialog" aria-label={text.transmissionTitle} className="absolute inset-0 grid content-center gap-2 bg-wagami-a-screen/95 p-5">
                    <h2 className="font-sans text-lg font-semibold">{text.transmissionTitle}</h2>
                    <div className="grid grid-cols-2 gap-2">
                      {TWELVE_LEAD_TRANSMISSION_DESTINATIONS.map((destination) => (
                        <button key={destination} type="button" disabled={controller.twelveLead.sentUntil !== null} onClick={() => controller.sendTwelveLead(destination)} className="min-h-[44px] rounded border border-wagami-a-border bg-wagami-a-surface px-2 text-left text-xs font-semibold hover:bg-wagami-a-surface-raised focus-visible:outline-2 focus-visible:outline-wagami-a-pni disabled:opacity-50">{destination}</button>
                      ))}
                    </div>
                    {controller.twelveLead.sentDestination ? <p role="status" className="text-center font-bold text-wagami-a-ecg">{text.sent} · {controller.twelveLead.sentDestination}</p> : null}
                    <button type="button" disabled={controller.twelveLead.sentUntil !== null} onClick={controller.closeTwelveLeadOverlay} className="min-h-[44px] rounded border border-wagami-a-border bg-wagami-a-surface-raised px-3 font-semibold disabled:opacity-50">{text.close}</button>
                  </div>
                ) : null}
              </div>
              <div className="grid grid-cols-4 gap-2 border-t border-wagami-a-border bg-wagami-a-surface p-2">
                <button type="button" disabled={controller.twelveLead.captureState === 'acquiring' || controller.twelveLead.sentUntil !== null} onClick={controller.twelveLead.captureState === 'result' ? controller.closeTwelveLeadResult : controller.startTwelveLeadCapture} className="rounded border border-wagami-a-border bg-wagami-a-surface-raised font-semibold disabled:opacity-50">{controller.twelveLead.captureState === 'result' ? text.close : text.capture}</button>
                <button type="button" disabled={!capture || controller.workflowBusy} onClick={controller.openPrint} className="rounded border border-wagami-a-border bg-wagami-a-surface-raised font-semibold disabled:opacity-50">{text.print}</button>
                <button type="button" disabled={!capture || controller.workflowBusy} onClick={controller.openTransmission} className="rounded border border-wagami-a-border bg-wagami-a-surface-raised font-semibold disabled:opacity-50">{text.transmit}</button>
                <button type="button" disabled={!controller.twelveLead.printOpen} onClick={controller.closeTwelveLeadOverlay} className="rounded border border-wagami-a-border bg-wagami-a-surface-raised font-semibold disabled:opacity-50">{text.close}</button>
              </div>
            </div>
          </ViewFrame>
        </div>
      ) : null}
      {content ? <div className="absolute inset-0 z-20">{content}</div> : null}
    </div>
  )
}

function Toggle({ active, disabled = false, onClick, children }: { active: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-pressed={active} disabled={disabled} onClick={onClick} className={`min-h-[44px] rounded border px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-wagami-a-pni disabled:cursor-default ${active ? 'border-wagami-a-pni bg-wagami-a-pni text-wagami-a-screen' : 'border-wagami-a-border bg-wagami-a-surface-raised text-wagami-a-text'}`}>{children}</button>
}

function Pagination({ page, totalPages, setPage, text }: { page: number; totalPages: number; setPage: React.Dispatch<React.SetStateAction<number>>; text: ReturnType<typeof getWagamiAText> }) {
  return <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="min-h-[44px] rounded border border-wagami-a-border bg-wagami-a-surface-raised disabled:opacity-40">← {text.previous}</button><span className="font-mono text-sm">{text.page} {page} {text.of} {totalPages}</span><button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="min-h-[44px] rounded border border-wagami-a-border bg-wagami-a-surface-raised disabled:opacity-40">{text.next} →</button></div>
}
