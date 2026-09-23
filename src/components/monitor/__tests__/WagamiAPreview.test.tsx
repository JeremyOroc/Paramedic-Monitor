import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useMonitorStore } from '@/store/monitorStore'
import { WagamiAPreview } from '../WagamiAPreview'

describe('Wagami A Room-free clinical preview', () => {
  beforeEach(() => window.localStorage.clear())

  it('shows simulated data with A4 clinical actions and all A5 tasks enabled', () => {
    useMonitorStore.getState().reset()
    render(<WagamiAPreview />)

    expect(screen.getByTestId('wagami-a-preview')).toBeInTheDocument()
    expect(screen.getByText('MODE ADULTE')).toBeInTheDocument()
    expect(screen.queryByText(/PREVIEW|DONNÉES SIMULÉES/)).not.toBeInTheDocument()
    expect(screen.getByTestId('wagami-a-vital-fc')).toHaveTextContent('80')
    expect(screen.getByText('Info appel')).toBeInTheDocument()
    const dock = screen.getByRole('navigation', { name: 'Wagami A task dock' })
    expect(within(dock).getAllByRole('button')).toHaveLength(6)
    expect(screen.getByRole('button', { name: 'Charge WAGAMI A' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Choc WAGAMI A' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Analyser WAGAMI A' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Mesurer la pression artérielle' })).toBeEnabled()
    expect(within(dock).getAllByRole('button').every((button) => !button.hasAttribute('disabled'))).toBe(true)
    expect(screen.getByRole('button', { name: 'Droite' })).toBeEnabled()
  })

  it('keeps non-Call-Info destinations inside the persistent shell', () => {
    useMonitorStore.getState().reset()
    render(<WagamiAPreview />)

    for (const [task, heading] of [
      ['12 dérivations', 'ECG 12 dérivations'],
      ['EtCO₂', 'Étalonnage EtCO₂'],
      ['Médicaments', 'Médicaments'],
      ['Journal des signes vitaux', 'Journal des signes vitaux'],
      ['Configurer', 'Configuration'],
    ]) {
      fireEvent.click(screen.getByRole('button', { name: task }))
      expect(screen.getByTestId('wagami-a-shell')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
      expect(screen.getAllByTestId('wagami-a-clinical-status-line').find((element) => !element.closest('[aria-hidden="true"]'))).toHaveTextContent('MODE ADULTE')
      fireEvent.click(screen.getByRole('button', { name: /Retour/ }))
    }
  })

  it('keeps live and 12-lead canvases mounted across tasks and shell-free Call Info', () => {
    useMonitorStore.getState().reset()
    render(<WagamiAPreview />)

    const ecg = screen.getByTestId('live-ecg-canvas')
    const spo2 = screen.getByTestId('spo2-waveform-canvas')
    const etco2 = screen.getByTestId('etco2-waveform-canvas')
    expect(ecg).toHaveAttribute('data-fresh-reveal', 'true')
    expect(spo2).toHaveAttribute('data-fresh-reveal', 'true')
    expect(etco2).toHaveAttribute('data-fresh-reveal', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'Médicaments' }))
    expect(screen.getByTestId('live-ecg-canvas')).toBe(ecg)
    expect(screen.getByTestId('spo2-waveform-canvas')).toBe(spo2)
    expect(screen.getByTestId('etco2-waveform-canvas')).toBe(etco2)
    fireEvent.click(screen.getByRole('button', { name: /Journal des événements/ }))
    fireEvent.click(screen.getByRole('button', { name: /Retour/ }))
    fireEvent.click(screen.getByRole('button', { name: /Retour/ }))

    fireEvent.click(screen.getByRole('button', { name: '12 dérivations' }))
    const leadI = screen.getByTestId('lead-canvas-I')
    const leadV6 = screen.getByTestId('lead-canvas-V6')
    expect(leadI).toHaveAttribute('data-fresh-reveal', 'true')
    expect(leadV6).toHaveAttribute('data-fresh-reveal', 'true')
    expect(screen.getByTestId('live-ecg-canvas')).toBe(ecg)
    fireEvent.click(screen.getByRole('button', { name: /Retour/ }))
    expect(screen.getByTestId('lead-canvas-I')).toBe(leadI)
    expect(screen.getByTestId('lead-canvas-V6')).toBe(leadV6)
    fireEvent.click(screen.getByRole('button', { name: '12 dérivations' }))
    expect(screen.getByTestId('lead-canvas-I')).toBe(leadI)
    fireEvent.click(screen.getByRole('button', { name: /Retour/ }))

    fireEvent.click(screen.getByRole('button', { name: 'Info appel' }))
    expect(screen.getByTestId('live-ecg-canvas')).toBe(ecg)
    expect(screen.getByTestId('lead-canvas-I')).toBe(leadI)
    expect(screen.getByTestId('wagami-a-shell').parentElement).toHaveClass('invisible')
    fireEvent.click(screen.getByRole('button', { name: /Retour/ }))
    expect(screen.getByTestId('live-ecg-canvas')).toBe(ecg)
    expect(screen.getByTestId('wagami-a-shell').parentElement).not.toHaveClass('invisible')
  })

  it('replaces the shell with a full-page Call Info canvas and returns to the monitor', () => {
    useMonitorStore.getState().reset()
    render(<WagamiAPreview />)

    fireEvent.click(screen.getByRole('button', { name: 'Info appel' }))
    expect(screen.getByTestId('wagami-a-call-info-page')).toBeInTheDocument()
    expect(screen.getByTestId('wagami-a-shell').parentElement).toHaveClass('invisible')
    expect(screen.getByRole('heading', { name: 'Information d’appel' })).toBeInTheDocument()
    expect(screen.getByTestId('assignment-dashboard')).toBeInTheDocument()
    expect(within(screen.getByTestId('wagami-a-call-info-page')).getByTestId('wagami-a-clinical-status-line')).toHaveTextContent('MODE ADULTE')
    expect(screen.getByLabelText('Response timer')).toHaveTextContent('--:--')
    expect(screen.getByRole('button', { name: 'Accuser réception' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Arrivée' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Transport' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: /Retour/ }))
    expect(screen.getByTestId('wagami-a-shell')).toBeInTheDocument()
    expect(screen.queryByTestId('wagami-a-call-info-page')).not.toBeInTheDocument()
  })

  it('uses the classic layout switch and blocks Call Info from analysis through charge', () => {
    vi.useFakeTimers()
    useMonitorStore.getState().reset()
    render(<WagamiAPreview callerInfoVariant="classic" />)

    fireEvent.click(screen.getByRole('button', { name: 'Info appel' }))
    expect(screen.getByTestId('dispatch-tablet-frame')).toHaveClass('dispatch-tablet-frame-classic-contained')
    fireEvent.click(screen.getByRole('button', { name: /Retour/ }))

    fireEvent.click(screen.getByRole('button', { name: 'Analyser WAGAMI A' }))
    expect(screen.getByRole('button', { name: 'Info appel' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Alimentation WAGAMI A' }))
    fireEvent.click(screen.getByRole('button', { name: 'Alimentation WAGAMI A' }))
    fireEvent.click(screen.getByRole('button', { name: 'Charge WAGAMI A' }))
    expect(screen.getByRole('button', { name: 'Info appel' })).toBeDisabled()
    act(() => vi.advanceTimersByTime(4000))
    expect(screen.getByRole('button', { name: 'Info appel' })).toBeDisabled()
    vi.useRealTimers()
  })

  it('switches language and shell LED, preserving both through a power cycle', () => {
    useMonitorStore.getState().reset()
    render(<WagamiAPreview />)
    fireEvent.click(screen.getByRole('button', { name: 'Configurer' }))
    fireEvent.click(screen.getByRole('button', { name: 'English' }))
    fireEvent.click(screen.getByRole('button', { name: 'Off' }))
    expect(screen.getByRole('heading', { name: 'Configure' })).toBeInTheDocument()
    expect(screen.getByTestId('wagami-a-shell-led')).toHaveAttribute('data-enabled', 'false')
    fireEvent.click(screen.getByRole('button', { name: 'WAGAMI A power' }))
    fireEvent.click(screen.getByRole('button', { name: 'WAGAMI A power' }))
    expect(screen.getByRole('button', { name: 'Call Info' })).toBeInTheDocument()
    expect(screen.getByTestId('wagami-a-shell-led')).toHaveAttribute('data-enabled', 'false')
  })

  it('records medication events inside Medications and keeps preview Vital Log honest', () => {
    useMonitorStore.getState().reset()
    render(<WagamiAPreview />)
    fireEvent.click(screen.getByRole('button', { name: 'Médicaments' }))
    fireEvent.click(screen.getByRole('button', { name: /Epi/ }))
    fireEvent.click(screen.getByRole('button', { name: /Journal des événements/ }))
    expect(screen.getByText('Epi')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Retour/ }))
    fireEvent.click(screen.getByRole('button', { name: /Retour/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Journal des signes vitaux' }))
    expect(screen.getByText('Aucun signe vital consigné.')).toBeInTheDocument()
  })

  it('offers EtCO₂ calibration and functional automatic PNI settings', () => {
    useMonitorStore.getState().reset()
    render(<WagamiAPreview />)
    fireEvent.click(screen.getByRole('button', { name: 'EtCO₂' }))
    fireEvent.click(screen.getByRole('button', { name: 'Étalonner' }))
    expect(screen.getByText('Étalonnage en cours')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    fireEvent.click(screen.getByRole('button', { name: /Retour/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Configurer' }))
    expect(screen.queryByRole('button', { name: /Réglages PNI/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Retour/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir les réglages PNI' }))
    fireEvent.click(screen.getByRole('button', { name: 'Automatique' }))
    fireEvent.click(screen.getByRole('button', { name: '15 min' }))
    expect(screen.getByRole('button', { name: '15 min' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('keeps PNI settings open while the physical key starts and completes a reading', () => {
    vi.useFakeTimers()
    useMonitorStore.getState().reset()
    render(<WagamiAPreview />)
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir les réglages PNI' }))

    fireEvent.click(screen.getByRole('button', { name: 'Mesurer la pression artérielle' }))
    expect(screen.getByRole('heading', { name: 'Réglages PNI' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Annuler la mesure de pression artérielle' })).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(8100))
    expect(screen.getByRole('heading', { name: 'Réglages PNI' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mesurer la pression artérielle' })).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('opens PNI settings from the active count without cancelling the reading', () => {
    vi.useFakeTimers()
    useMonitorStore.getState().reset()
    render(<WagamiAPreview />)

    fireEvent.click(screen.getByRole('button', { name: 'Mesurer la pression artérielle' }))
    expect(screen.getByRole('button', { name: 'Annuler la mesure de pression artérielle' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir les réglages PNI' }))

    expect(screen.getByRole('heading', { name: 'Réglages PNI' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Annuler la mesure de pression artérielle' })).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('cycles Patient mode and uses the energy ring without activating guarded Shock', () => {
    useMonitorStore.getState().reset()
    render(<WagamiAPreview />)
    fireEvent.click(screen.getByRole('button', { name: /Changer le mode patient/ }))
    expect(screen.getByRole('button', { name: 'Changer le mode patient, mode actuel PÉDIATRIQUE' })).toHaveTextContent('MODE')
    expect(screen.getByText('MODE PÉDIATRIQUE')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Wagami A defibrillation status' })).toHaveTextContent('50')
    for (let index = 0; index < 7; index += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Droite' }))
    }
    expect(screen.getByRole('button', { name: 'Diminuer l’énergie' })).toHaveAttribute('data-navigation-selected', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Entrée' }))
    expect(screen.getByRole('region', { name: 'Wagami A defibrillation status' })).toHaveTextContent('40')
    expect(screen.getByRole('button', { name: 'Choc WAGAMI A' })).toBeDisabled()
  })

  it('locks Patient mode during Analyze and resets the process on Power-off', () => {
    useMonitorStore.getState().reset()
    render(<WagamiAPreview />)
    fireEvent.click(screen.getByRole('button', { name: 'Analyser WAGAMI A' }))
    expect(screen.getByRole('button', { name: /Changer le mode patient/ })).toBeDisabled()
    expect(within(screen.getByRole('region', { name: 'Wagami A defibrillation status' })).getByRole('status')).toHaveTextContent('ANALYSE ECG')
    fireEvent.click(screen.getByRole('button', { name: 'Alimentation WAGAMI A' }))
    expect(screen.getByTestId('wagami-a-screen-off')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Alimentation WAGAMI A' }))
    expect(screen.getByRole('region', { name: 'Wagami A live display' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Changer le mode patient/ })).toBeEnabled()
  })
})
