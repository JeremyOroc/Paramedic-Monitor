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
    render(<WagamiAScreen display={display} energy={120} />)
    const strip = screen.getByLabelText('Fixed A vital card strip')
    const labels = within(strip).getAllByText(/^(FC|SpO₂|PNI|EtCO₂)$/)

    expect(labels.map((label) => label.textContent)).toEqual(['FC', 'SpO₂', 'PNI', 'EtCO₂'])
    expect(screen.getByTestId('a-waveform-workspace')).toBeInTheDocument()
    expect(screen.getByText('DONNÉES SIMULÉES', { exact: false })).toBeInTheDocument()
    expect(screen.getByTestId('wagami-a-vital-pni').tagName).toBe('DIV')
    expect(screen.queryByRole('button', { name: 'ANALYSER' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Démarrer une mesure PNI' })).not.toBeInTheDocument()
  })

  it('renders confirmed channel values without changing card geometry', () => {
    const confirmed = { ...display, simulated: false, vitals: { ...display.vitals, hr: 142, spo2: 88 } }
    render(<WagamiAScreen display={confirmed} energy={200} />)

    expect(screen.getByTestId('wagami-a-vital-fc')).toHaveTextContent('142')
    expect(screen.getByTestId('wagami-a-vital-spo2')).toHaveTextContent('88')
    expect(screen.getByText('DONNÉES CONFIRMÉES', { exact: false })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Wagami A defibrillation status' })).toHaveTextContent('200')
  })

  it('shows active cuff, charge and CPR states without another touch Analyze or BP action', () => {
    render(<WagamiAScreen display={display} energy={120} defibState="charging" defibProgress={0.5} nibpPhase="counting" nibpDisplayValue={72} cprTime="1:42" />)
    expect(screen.getByTestId('wagami-a-vital-pni')).toHaveTextContent('Mesure en cours · 72')
    expect(screen.getByRole('status')).toHaveTextContent('CHARGE EN COURS')
    expect(screen.getByRole('progressbar', { name: 'Charge progress' })).toHaveValue(50)
    expect(screen.getByRole('region', { name: 'Wagami A defibrillation status' })).toHaveTextContent('1:42')
    expect(screen.queryByRole('button', { name: 'Analyser WAGAMI A' })).not.toBeInTheDocument()
  })
})
