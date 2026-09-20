import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { MonitorProjection } from '@/types/monitorProjection'
import { SpectatorMonitor } from '../SpectatorMonitor'

describe('SpectatorMonitor A2 model boundary', () => {
  it('does not silently display an A projection as Wagami X', () => {
    const projection = {
      model: 'wagamiA',
      defib: { progress: 0, phaseStartedAt: null, phaseEndsAt: null },
    } as unknown as MonitorProjection

    render(<SpectatorMonitor projection={projection} embedded />)

    expect(screen.getByText('WAGAMI A · STATE UNAVAILABLE')).toBeInTheDocument()
    expect(screen.queryByTestId('device-shell')).not.toBeInTheDocument()
  })

  it('mirrors an A5 destination, locale, and shell LED preference from semantic projection state', () => {
    const projection = {
      model: 'wagamiA',
      powerState: 'on',
      controller: { isMuted: false },
      defib: { state: 'idle', energy: 120, progress: 0, phaseStartedAt: null, phaseEndsAt: null, canAnalyse: true, canCharge: true, canShock: false, canAdjustEnergy: true },
      confirmed: { hr: 80, bp_sys: 120, bp_dia: 80, etco2: 35, spo2: 98, rhythm: 'nsr', spo2_waveform: 'normal', etco2_waveform: 'normal' },
      confirmedVitalActive: { hr: true, bp_sys: true, bp_dia: true, etco2: true, spo2: true },
      acceptedBp: { bp_sys: 118, bp_dia: 76 },
      acceptedBpActive: { bp_sys: true, bp_dia: true },
      displayedHrActive: true,
      vfDisplayedHr: 80,
      displayedEtco2: 35,
      alarms: [],
      nibp: { enabled: true, phase: 'idle', displayValue: '' },
      callerInfo: { callNumber: '', priority: '', mpdsCode: '', address: '', problem: '', information: '', update: '', extra1Label: '', extra1: '', extra2Label: '', extra2: '', extra3Label: '', extra3: '', time: '' },
      dispatchRoute: { geometry: [] },
      cprOverrideActive: false,
      wagamiA: {
        view: 'configure',
        preferences: { locale: 'en', shellAlarmLedEnabled: false },
        etco2CalibrationStatus: 'idle',
        patientMode: 'adult',
        nibpMode: 'manual',
        nibpAutoInterval: 5,
        medicationEvents: [],
        vitalLog: [],
        twelveLead: { captureState: 'idle', lastCapture: null, printOpen: false, transmissionOpen: false, sentDestination: null, sentUntil: null },
      },
    } as unknown as MonitorProjection

    render(<SpectatorMonitor projection={projection} embedded />)

    expect(screen.getByRole('heading', { name: 'Configure' })).toBeInTheDocument()
    expect(screen.getByTestId('wagami-a-shell-led')).toHaveAttribute('data-enabled', 'false')
    expect(screen.queryByText('WAGAMI A · STATE UNAVAILABLE')).not.toBeInTheDocument()
  })

  it('mirrors automatic advised charge origin and capacitor progress', () => {
    const projection = {
      model: 'wagamiA',
      powerState: 'on',
      controller: { isMuted: false },
      defib: { state: 'charging', energy: 120, progress: 0.5, chargeOrigin: 'automatic_advised', phaseStartedAt: null, phaseEndsAt: null, canAnalyse: false, canCharge: false, canShock: false, canAdjustEnergy: false },
      confirmed: { hr: 80, bp_sys: 120, bp_dia: 80, etco2: 35, spo2: 98, rhythm: 'vf', spo2_waveform: 'normal', etco2_waveform: 'normal' },
      confirmedVitalActive: { hr: true, bp_sys: true, bp_dia: true, etco2: true, spo2: true },
      acceptedBp: { bp_sys: 118, bp_dia: 76 },
      acceptedBpActive: { bp_sys: true, bp_dia: true },
      displayedHrActive: true,
      vfDisplayedHr: 80,
      displayedEtco2: 35,
      alarms: [],
      nibp: { enabled: true, phase: 'idle', displayValue: '' },
      callerInfo: { callNumber: '', priority: '', mpdsCode: '', address: '', problem: '', information: '', update: '', extra1Label: '', extra1: '', extra2Label: '', extra2: '', extra3Label: '', extra3: '', time: '' },
      dispatchRoute: { geometry: [] },
      cprOverrideActive: false,
      wagamiA: {
        view: 'monitor',
        preferences: { locale: 'en', shellAlarmLedEnabled: true },
        etco2CalibrationStatus: 'idle',
        patientMode: 'adult',
        nibpMode: 'manual',
        nibpAutoInterval: 5,
        medicationEvents: [],
        vitalLog: [],
        twelveLead: { captureState: 'idle', lastCapture: null, printOpen: false, transmissionOpen: false, sentDestination: null, sentUntil: null },
      },
    } as unknown as MonitorProjection

    render(<SpectatorMonitor projection={projection} embedded />)

    expect(screen.getByText('SHOCK ADVISED · CHARGING')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Charge progress' })).toHaveValue(50)
  })

  it('mirrors the projected cuff-pressure count without starting a second clock', () => {
    const projection = {
      model: 'wagamiA',
      powerState: 'on',
      controller: { isMuted: false },
      defib: { state: 'idle', energy: 120, progress: 0, phaseStartedAt: null, phaseEndsAt: null, canAnalyse: true, canCharge: true, canShock: false, canAdjustEnergy: true },
      confirmed: { hr: 80, bp_sys: 120, bp_dia: 80, etco2: 35, spo2: 98, rhythm: 'nsr', spo2_waveform: 'normal', etco2_waveform: 'normal' },
      confirmedVitalActive: { hr: true, bp_sys: true, bp_dia: true, etco2: true, spo2: true },
      acceptedBp: { bp_sys: 118, bp_dia: 76 },
      acceptedBpActive: { bp_sys: true, bp_dia: true },
      displayedHrActive: true,
      vfDisplayedHr: 80,
      displayedEtco2: 35,
      alarms: [],
      nibp: { enabled: true, phase: 'counting', displayValue: 72 },
      callerInfo: { callNumber: '', priority: '', mpdsCode: '', address: '', problem: '', information: '', update: '', extra1Label: '', extra1: '', extra2Label: '', extra2: '', extra3Label: '', extra3: '', time: '' },
      dispatchRoute: { geometry: [] },
      cprOverrideActive: false,
      wagamiA: {
        view: 'monitor',
        preferences: { locale: 'en', shellAlarmLedEnabled: true },
        etco2CalibrationStatus: 'idle',
        patientMode: 'adult',
        nibpMode: 'manual',
        nibpAutoInterval: 5,
        medicationEvents: [],
        vitalLog: [],
        twelveLead: { captureState: 'idle', lastCapture: null, printOpen: false, transmissionOpen: false, sentDestination: null, sentUntil: null },
      },
    } as unknown as MonitorProjection

    render(<SpectatorMonitor projection={projection} embedded />)

    expect(screen.getByTestId('wagami-a-vital-pni')).toHaveTextContent('72')
    expect(screen.getByTestId('wagami-a-vital-pni')).not.toHaveTextContent('118/76')
    expect(screen.getByTestId('wagami-a-vital-pni').tagName).toBe('DIV')
    expect(screen.queryByRole('button', { name: 'Open NIBP settings' })).not.toBeInTheDocument()
  })
})
