'use client'

import { WagamiADevice } from '@/components/monitor/WagamiADevice'
import { WagamiAWorkspace } from '@/components/monitor/WagamiAWorkspace'
import { useWagamiAClinicalCore } from '@/hooks/useWagamiAClinicalCore'
import { useWagamiAWorkspace } from '@/hooks/useWagamiAWorkspace'
import { resolveWagamiAPreviewState } from '@/lib/wagamiAPreviewState'
import { getWagamiAText } from '@/lib/wagamiALocalization'
import { useMonitorStore } from '@/store/monitorStore'

/** Room-free A5 device preview; A6 live Attempts stay gated. */
export function WagamiAPreview() {
  const confirmed = useMonitorStore((state) => state.confirmed)
  const confirmedActive = useMonitorStore((state) => state.confirmedVitalActive)
  const cprMode = useMonitorStore((state) => state.cprMode)
  const callerInfo = useMonitorStore((state) => state.callerInfoConfirmed)
  const dispatchRoute = useMonitorStore((state) => state.dispatchRouteConfirmed)
  const sourceDisplay = resolveWagamiAPreviewState(confirmed, confirmedActive)
  const workspace = useWagamiAWorkspace({
    scope: 'preview',
    rhythm: sourceDisplay.vitals.rhythm,
    hr: sourceDisplay.vitals.hr,
  })
  const clinical = useWagamiAClinicalCore({
    sourceDisplay,
    cprMode,
    locale: workspace.preferences.locale,
  })
  const text = getWagamiAText(workspace.preferences.locale)

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
      callerInfo={callerInfo}
      dispatchRoute={dispatchRoute}
      selectedAction={selectedAction}
    />
  )

  return (
    <main data-testid="wagami-a-preview" className="fixed inset-0 grid h-screen w-screen min-w-[1024px] place-items-center overflow-hidden bg-wagami-a-screen text-wagami-a-text max-[1023px]:min-w-0">
      <div className="hidden max-[1023px]:grid max-[1023px]:place-items-center max-[1023px]:p-8 max-[1023px]:text-center">
        <div className="font-sans text-xl font-semibold">{text.landscapeRequired}</div>
        <p className="mt-3 text-wagami-a-muted-text">{text.landscapeHelp}</p>
      </div>
      <div className="max-[1023px]:hidden">
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
          navigationView={workspace.view}
          secondaryActions={workspace.view === 'monitor' ? undefined : [{ id: 'back', enabled: true, activate: workspace.goBack }]}
          screenContent={screenContent}
          locale={workspace.preferences.locale}
          shellAlarmLedEnabled={workspace.preferences.shellAlarmLedEnabled}
        />
      </div>
    </main>
  )
}
