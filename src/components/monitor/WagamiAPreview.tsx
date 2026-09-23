'use client'

import { useMemo } from 'react'

import { WagamiADevice } from '@/components/monitor/WagamiADevice'
import { WagamiACallInfoPage } from '@/components/monitor/WagamiACallInfoPage'
import { WagamiAWorkspace } from '@/components/monitor/WagamiAWorkspace'
import type { CallerInfoVariant } from '@/components/monitor/CallerInfoModal'
import { useWagamiAClinicalCore } from '@/hooks/useWagamiAClinicalCore'
import { useVitalLog } from '@/hooks/useVitalLog'
import { useWagamiAPreferences } from '@/hooks/useWagamiAPreferences'
import { useWagamiAWorkspaceWithPreferences } from '@/hooks/useWagamiAWorkspace'
import { useWagamiACallInfoCover } from '@/hooks/useWagamiACallInfoCover'
import { useMonitorClock } from '@/hooks/useMonitorClock'
import { useSessionTimer } from '@/hooks/useSessionTimer'
import { resolveWagamiAPreviewState } from '@/lib/wagamiAPreviewState'
import { getWagamiAText } from '@/lib/wagamiALocalization'
import { useMonitorStore } from '@/store/monitorStore'
import { cn } from '@/lib/utils'

type WagamiAPreviewProps = {
  callerInfoVariant?: CallerInfoVariant
}

/** Room-free A5 device preview; A6 live Attempts stay gated. */
export function WagamiAPreview({ callerInfoVariant = 'assignment' }: WagamiAPreviewProps) {
  const montrealClock = useMonitorClock('America/Toronto')
  const confirmed = useMonitorStore((state) => state.confirmed)
  const confirmedActive = useMonitorStore((state) => state.confirmedVitalActive)
  const cprMode = useMonitorStore((state) => state.cprMode)
  const callerInfo = useMonitorStore((state) => state.callerInfoConfirmed)
  const dispatchRoute = useMonitorStore((state) => state.dispatchRouteConfirmed)
  const monitorResetVersion = useMonitorStore((state) => state.monitorResetVersion)
  const patientInfo = useMonitorStore((state) => state.patientInfo)
  const setPatientAge = useMonitorStore((state) => state.setPatientAge)
  const setPatientSex = useMonitorStore((state) => state.setPatientSex)
  const sourceDisplay = resolveWagamiAPreviewState(confirmed, confirmedActive)
  const preferenceState = useWagamiAPreferences('preview')
  const clinical = useWagamiAClinicalCore({
    sourceDisplay,
    cprMode,
    locale: preferenceState.preferences.locale,
  })
  const {
    formatted: monitorElapsed,
    elapsedSeconds: monitorElapsedSeconds,
  } = useSessionTimer(clinical.poweredOn)
  const workspace = useWagamiAWorkspaceWithPreferences({
    rhythm: clinical.display.vitals.rhythm,
    hr: clinical.display.vitals.hr,
    monitorResetVersion,
    patientInfo,
    onPatientAgeChange: setPatientAge,
    onPatientSexChange: setPatientSex,
    preferenceState,
  })
  const vitalLogSnapshot = useMemo(() => ({
    fc: clinical.display.active.hr ? clinical.display.vitals.hr : null,
    pniSys: clinical.display.active.bp_sys ? clinical.display.vitals.bp_sys : null,
    pniDia: clinical.display.active.bp_dia ? clinical.display.vitals.bp_dia : null,
    etco2: workspace.etco2Status === 'calibrated' && clinical.display.active.etco2
      ? clinical.display.vitals.etco2
      : null,
    spo2: clinical.display.active.spo2 ? clinical.display.vitals.spo2 : null,
  }), [
    clinical.display.active.bp_dia,
    clinical.display.active.bp_sys,
    clinical.display.active.etco2,
    clinical.display.active.hr,
    clinical.display.active.spo2,
    clinical.display.vitals.bp_dia,
    clinical.display.vitals.bp_sys,
    clinical.display.vitals.etco2,
    clinical.display.vitals.hr,
    clinical.display.vitals.spo2,
    workspace.etco2Status,
  ])
  const vitalLog = useVitalLog({
    elapsedSeconds: monitorElapsedSeconds,
    isRunning: clinical.poweredOn,
    snapshot: vitalLogSnapshot,
    intervalMinutes: preferenceState.preferences.vitalLogInterval,
  })
  const text = getWagamiAText(workspace.preferences.locale)
  const { showCallInfo, onMonitorReady } = useWagamiACallInfoCover(workspace.view)

  function onPowerToggle() {
    if (clinical.poweredOn) workspace.onDevicePowerOff()
    clinical.onPowerToggle()
  }

  const screenContent = (selectedAction: string | null) => (
    <WagamiAWorkspace
      controller={workspace}
      display={clinical.display}
      energy={clinical.defib.energy}
      defibState={clinical.defib.state}
      chargeProgress={clinical.defib.chargeProgress}
      chargeOrigin={clinical.defib.chargeOrigin}
      cprTime={clinical.cprTime}
      cprOverride={clinical.cprOverride}
      nibpPhase={clinical.nibpPhase}
      nibpDisplayValue={clinical.nibpDisplayValue}
      patientMode={clinical.patientMode}
      canAdjustEnergy={clinical.defib.canAdjustEnergy}
      onEnergyDown={clinical.onEnergyDown}
      onEnergyUp={clinical.onEnergyUp}
      selectedAction={selectedAction}
      onMonitorReady={onMonitorReady}
      date={montrealClock.date}
      time={montrealClock.time}
      sessionTimer={monitorElapsed}
      waveformSequenceKey={monitorResetVersion}
      vitalLog={vitalLog}
    />
  )

  return (
    <main data-testid="wagami-a-preview" className="fixed inset-0 grid h-screen w-screen min-w-[1024px] place-items-center overflow-hidden bg-wagami-a-screen text-wagami-a-text max-[1023px]:min-w-0">
      <div className="hidden max-[1023px]:grid max-[1023px]:place-items-center max-[1023px]:p-8 max-[1023px]:text-center">
        <div className="font-sans text-xl font-semibold">{text.landscapeRequired}</div>
        <p className="mt-3 text-wagami-a-muted-text">{text.landscapeHelp}</p>
      </div>
      <div aria-hidden={showCallInfo ? true : undefined} className={cn('max-[1023px]:hidden', showCallInfo && 'invisible pointer-events-none')}>
        <WagamiADevice
          display={clinical.display}
          energy={clinical.defib.energy}
          defibState={clinical.defib.state}
          chargeProgress={clinical.defib.chargeProgress}
          chargeOrigin={clinical.defib.chargeOrigin}
          cprTime={clinical.cprTime}
          cprOverride={clinical.cprOverride}
          nibpPhase={clinical.nibpPhase}
          nibpDisplayValue={clinical.nibpDisplayValue}
          bpReadingActive={clinical.nibpReadingActive}
          poweredOn={clinical.poweredOn}
          onPowerToggle={onPowerToggle}
          patientMode={clinical.patientMode}
          patientModeLocked={clinical.patientModeLocked}
          muted={clinical.muted}
          canAnalyse={clinical.defib.canAnalyse}
          canCharge={clinical.defib.canCharge}
          canShock={clinical.defib.canShock}
          canReadBP={clinical.canReadBP}
          canAdjustEnergy={clinical.defib.canAdjustEnergy}
          onAnalyse={clinical.onAnalyse}
          onCharge={clinical.onCharge}
          onShock={clinical.onShock}
          onMute={clinical.onMute}
          onPatientModeCycle={clinical.onPatientModeCycle}
          onReadBP={clinical.onReadBP}
          onEnergyDown={clinical.onEnergyDown}
          onEnergyUp={clinical.onEnergyUp}
          onTask={workspace.openTask}
          navigationView={workspace.twelveLead.patientInfoOpen ? 'twelveLeadPatientInfo' : workspace.view}
          secondaryActions={workspace.twelveLead.patientInfoOpen
            ? workspace.patientInfoActions
            : workspace.view === 'monitor'
              ? undefined
              : [{ id: 'back', enabled: workspace.twelveLead.sentUntil === null, activate: workspace.goBack }]}
          screenContent={screenContent}
          locale={workspace.preferences.locale}
          shellAlarmLedEnabled={workspace.preferences.shellAlarmLedEnabled}
          date={montrealClock.date}
          time={montrealClock.time}
          sessionTimer={monitorElapsed}
        />
      </div>
      {showCallInfo ? (
        <div className="absolute inset-0 z-30 h-full w-full max-[1023px]:hidden">
          <WagamiACallInfoPage
            locale={workspace.preferences.locale}
            patientMode={clinical.patientMode}
            alarms={clinical.display.alarms}
            onBack={workspace.goBack}
            callerInfo={{
              info: callerInfo,
              onCallerEvent: () => {},
              buttonState: {
                acknowledge: { disabled: true },
                arrival: { disabled: true },
                transport: { disabled: true },
              },
              responseFormatted: '--:--',
              variant: callerInfoVariant,
              route: dispatchRoute,
              mapReadOnly: true,
            }}
          />
        </div>
      ) : null}
    </main>
  )
}
