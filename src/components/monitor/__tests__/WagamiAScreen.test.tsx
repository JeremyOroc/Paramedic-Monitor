import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DEFAULT_VITALS } from '@/types/vitals'
import type { WagamiADisplayState } from '@/lib/wagamiAPreviewState'
import { WagamiAScreen } from '../WagamiAScreen'

vi.mock('../WagamiAWaveformWorkspace', () => ({
  WagamiAWaveformWorkspace: () => <div data-testid="a-waveform-workspace" />,
}))

const display: WagamiADisplayState = {
  vitals: { ...DEFAULT_VITALS },
  active: { hr: true, bp_sys: true, bp_dia: true, etco2: true, spo2: true },
  simulated: true,
  alarms: [],
}

describe('Wagami A fixed live display', () => {
  it('locks FC/SpO₂/PNI/EtCO₂ order above the dominant waveform area', () => {
    const onOpenNibpSettings = vi.fn()
    render(<WagamiAScreen display={display} energy={120} onOpenNibpSettings={onOpenNibpSettings} />)
    const strip = screen.getByLabelText('Fixed A vital card strip')
    const labels = within(strip).getAllByText(/^(FC|SpO₂|PNI|EtCO₂)$/)

    expect(labels.map((label) => label.textContent)).toEqual(['FC', 'SpO₂', 'PNI', 'EtCO₂'])
    expect(screen.getByTestId('a-waveform-workspace')).toBeInTheDocument()
    expect(screen.queryByText(/DONNÉES SIMULÉES|PREVIEW/)).not.toBeInTheDocument()
    expect(screen.getByTestId('wagami-a-main-clinical-column')).toHaveClass('grid-rows-[clamp(82px,11.4cqw,160px)_clamp(28px,3.1cqw,42px)_minmax(0,1fr)]')
    expect(screen.getByTestId('wagami-a-vital-pni').tagName).toBe('BUTTON')
    screen.getByRole('button', { name: 'Ouvrir les réglages PNI' }).click()
    expect(onOpenNibpSettings).toHaveBeenCalledOnce()
    expect(screen.queryByRole('button', { name: 'ANALYSER' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Démarrer une mesure PNI' })).not.toBeInTheDocument()
  })

  it('renders confirmed channel values without changing card geometry', () => {
    const confirmed = { ...display, simulated: false, vitals: { ...display.vitals, hr: 142, spo2: 88 } }
    render(<WagamiAScreen display={confirmed} energy={200} />)

    expect(screen.getByTestId('wagami-a-vital-fc')).toHaveTextContent('142')
    expect(screen.getByTestId('wagami-a-vital-spo2')).toHaveTextContent('88')
    expect(screen.queryByText(/DONNÉES CONFIRMÉES|EN DIRECT/)).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Wagami A defibrillation status' })).toHaveTextContent('200')
  })

  it('shows active cuff, charge and CPR states without another touch Analyze or BP action', () => {
    render(<WagamiAScreen display={display} energy={120} defibState="charging" chargeProgress={0.5} nibpPhase="counting" nibpDisplayValue={72} cprTime="1:42" />)
    expect(screen.getByTestId('wagami-a-vital-pni')).toHaveTextContent('72')
    expect(screen.getByTestId('wagami-a-vital-pni')).not.toHaveTextContent('164/92')
    expect(screen.getByTestId('wagami-a-vital-pni')).not.toHaveTextContent(/mesure|patient|reading/i)
    expect(screen.getByText('72')).toHaveAttribute('data-value-layout', 'single')
    expect(within(screen.getByRole('region', { name: 'Wagami A defibrillation status' })).getByRole('status')).toHaveTextContent('CHARGE EN COURS')
    expect(screen.getByRole('progressbar', { name: 'Charge progress' })).toHaveValue(50)
    expect(screen.getByTestId('wagami-a-cpr-timer')).toHaveTextContent('--:--')
    expect(screen.queryByRole('button', { name: 'Analyser WAGAMI A' })).not.toBeInTheDocument()
  })

  it('keeps the complete accepted PNI pair visible when either BP channel is active', () => {
    const partialBp = {
      ...display,
      active: { ...display.active, bp_sys: false, bp_dia: true },
    }

    render(<WagamiAScreen display={partialBp} energy={120} />)

    expect(screen.getByTestId('wagami-a-vital-pni')).toHaveTextContent('120/80')
  })

  it('uses English HR/BP terminology and displays Montréal clock metadata', () => {
    const inactiveBp = {
      ...display,
      active: { ...display.active, bp_sys: false, bp_dia: false },
    }

    render(<WagamiAScreen display={inactiveBp} energy={120} locale="en" onOpenNibpSettings={() => {}} date="2026-09-22" time="20:19:40" sessionTimer="00:07:23" />)

    const strip = screen.getByLabelText('Fixed A vital card strip')
    expect(within(strip).getByText('HR')).toBeInTheDocument()
    expect(within(strip).getByText('BP')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open BP settings' })).toHaveTextContent('--/--')
    expect(screen.getByLabelText('Montréal date and time')).toHaveTextContent('2026-09-22 20:19:40')
    expect(screen.getByLabelText('Monitor elapsed time')).toHaveTextContent('00:07:23')
    const metadata = screen.getByTestId('wagami-a-monitor-metadata')
    expect(metadata).toHaveClass('grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]', 'text-[clamp(13px,1.15cqw,18px)]')
    expect(within(metadata).getByTestId('wagami-a-clinical-status-line')).toHaveTextContent('MODE ADULT')
    expect(screen.getByTestId('a-waveform-workspace')).not.toContainElement(screen.getByTestId('wagami-a-clinical-status-line'))
  })
})
