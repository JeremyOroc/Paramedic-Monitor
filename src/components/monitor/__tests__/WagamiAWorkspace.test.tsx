import { useEffect, useState } from 'react'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useWagamiAWorkspace } from '@/hooks/useWagamiAWorkspace'
import { ACQUIRE_MS } from '@/hooks/useMonitorController'
import type { VitalLogEntry } from '@/hooks/useVitalLog'
import type { WagamiADisplayState } from '@/lib/wagamiAPreviewState'
import { DEFAULT_VITALS } from '@/types/vitals'
import type { WagamiATask } from '../WagamiATaskDock'
import { WagamiAWorkspace } from '../WagamiAWorkspace'

vi.mock('../WagamiAScreen', () => ({
  WagamiAScreen: ({ onTask, onOpenNibpSettings, waveformOccluded, onWaveformsReady }: { onTask?: (task: WagamiATask) => void; onOpenNibpSettings?: () => void; waveformOccluded?: boolean; onWaveformsReady?: () => void }) => {
    useEffect(() => {
      if (!waveformOccluded) onWaveformsReady?.()
    }, [onWaveformsReady, waveformOccluded])
    return (
      <>
        <button type="button" onClick={() => onTask?.('vitalLog')}>Open vital log</button>
        <button type="button" onClick={() => onTask?.('configure')}>Open configure</button>
        <button type="button" onClick={() => onTask?.('medications')}>Open medications</button>
        <button type="button" onClick={() => onTask?.('twelveLead')}>Open twelve lead</button>
        {onOpenNibpSettings ? <button type="button" onClick={onOpenNibpSettings}>Open PNI settings</button> : null}
      </>
    )
  },
}))

const display: WagamiADisplayState = {
  vitals: { ...DEFAULT_VITALS },
  active: { hr: true, bp_sys: true, bp_dia: true, etco2: true, spo2: true },
  simulated: false,
  alarms: ['hr'],
}

function makeLog(count: number): VitalLogEntry[] {
  return Array.from({ length: count }, (_, index) => ({
    timestamp: `00:${String((index + 1) * 5).padStart(2, '0')}:00`,
    fc: 80 + index,
    pniSys: 120 + index,
    pniDia: 80 + index,
    etco2: 35 + index,
    spo2: 98 - index,
  }))
}

function Harness({ vitalLog }: { vitalLog: VitalLogEntry[] }) {
  const [patientInfo, setPatientInfo] = useState({ age: 40, sex: 'M' as 'M' | 'F' })
  const controller = useWagamiAWorkspace({
    scope: 'workspace-test',
    rhythm: display.vitals.rhythm,
    hr: display.vitals.hr,
    patientInfo,
    onPatientAgeChange: (age) => setPatientInfo((current) => ({ ...current, age })),
    onPatientSexChange: (sex) => setPatientInfo((current) => ({ ...current, sex })),
  })

  return (
    <WagamiAWorkspace
      controller={controller}
      display={display}
      energy={120}
      defibState="idle"
      chargeProgress={0}
      cprTime="--:--"
      cprOverride={false}
      nibpPhase="idle"
      nibpDisplayValue=""
      patientMode="adult"
      canAdjustEnergy
      onEnergyDown={() => {}}
      onEnergyUp={() => {}}
      vitalLog={vitalLog}
    />
  )
}

describe('WagamiAWorkspace', () => {
  beforeEach(() => {
    vi.useRealTimers()
    window.localStorage.clear()
  })

  it('opens PNI settings from the monitor card, removes the Configure route, and returns to monitor', () => {
    render(<Harness vitalLog={[]} />)

    fireEvent.click(screen.getByRole('button', { name: 'Open configure' }))
    expect(screen.getByRole('heading', { name: 'Configuration' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Réglages PNI/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Retour/ }))

    fireEvent.click(screen.getByRole('button', { name: 'Open PNI settings' }))
    expect(screen.getByRole('heading', { name: 'Réglages PNI' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Retour/ }))
    expect(screen.getByRole('button', { name: 'Open PNI settings' })).toBeInTheDocument()
  })

  it('paginates the Vital Log after eight rows and places the clinical status in its header', () => {
    render(<Harness vitalLog={makeLog(9)} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open vital log' }))

    expect(screen.getByText('Page 1 sur 2')).toBeInTheDocument()
    expect(screen.getByText('00:40:00')).toBeInTheDocument()
    expect(screen.queryByText('00:45:00')).not.toBeInTheDocument()
    const clinicalStatus = screen.getByTestId('wagami-a-clinical-status-line')
    expect(clinicalStatus).toHaveTextContent('MODE ADULTE · ALARME · FC')
    expect(clinicalStatus).toHaveClass('ml-auto')

    fireEvent.click(screen.getByRole('button', { name: /Suivant/ }))
    expect(screen.getByText('Page 2 sur 2')).toBeInTheDocument()
    expect(screen.getByText('00:45:00')).toBeInTheDocument()
    expect(screen.queryByText('00:05:00')).not.toBeInTheDocument()
  })

  it('flashes only the accepted medication button and removes Record/Consigner sublabels', () => {
    vi.useFakeTimers()
    render(<Harness vitalLog={[]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open medications' }))

    const epi = screen.getByRole('button', { name: 'Epi' })
    const nitro = screen.getByRole('button', { name: 'Nitro' })
    expect(screen.queryByText('Consigner')).not.toBeInTheDocument()
    fireEvent.click(epi)
    expect(epi).toHaveAttribute('data-confirmed', 'true')
    expect(nitro).toHaveAttribute('data-confirmed', 'false')

    fireEvent.click(nitro)
    expect(epi).toHaveAttribute('data-confirmed', 'false')
    expect(nitro).toHaveAttribute('data-confirmed', 'true')
    act(() => vi.advanceTimersByTime(400))
    expect(nitro).toHaveAttribute('data-confirmed', 'false')
  })

  it('configures the Vital Log interval and localizes English vital headers as HR/BP', () => {
    render(<Harness vitalLog={makeLog(1)} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open configure' }))

    expect(screen.getByText('Intervalle du journal des signes vitaux')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '5 min' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: '3 min' }))
    expect(screen.getByRole('button', { name: '3 min' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'English' }))
    expect(screen.getByText('Vital Log interval')).toBeInTheDocument()
    expect(screen.getByTestId('wagami-a-configure-mode')).toHaveClass('border-wagami-a-border', 'bg-wagami-a-surface-raised')

    fireEvent.click(screen.getByRole('button', { name: /Back/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Open vital log' }))
    expect(screen.getByText('HR')).toBeInTheDocument()
    expect(screen.getByText('BP SYS')).toBeInTheDocument()
    expect(screen.getByText('BP DIA')).toBeInTheDocument()
  })

  it('orders the 12-lead footer and edits Patient Information without duplicate close actions', () => {
    render(<Harness vitalLog={[]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open twelve lead' }))

    const footer = screen.getByTestId('wagami-a-twelve-lead-footer')
    expect(within(footer).getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Acquérir',
      'Info patient',
      'Transmettre',
      'Imprimer',
    ])

    const patientInfoButton = within(footer).getByRole('button', { name: 'Info patient' })
    fireEvent.click(patientInfoButton)
    expect(screen.getByRole('dialog', { name: 'Informations patient' })).toBeInTheDocument()
    expect(screen.queryByTestId('wagami-a-twelve-lead-footer')).not.toBeInTheDocument()
    expect(screen.getByTestId('wagami-a-twelve-lead-content')).toHaveAttribute('aria-hidden', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'Augmenter l’âge' }))
    expect(screen.getByLabelText('Âge')).toHaveTextContent('41')
    fireEvent.click(screen.getByRole('button', { name: 'F' }))
    expect(screen.getByRole('button', { name: 'F' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Terminé' }))

    expect(screen.queryByRole('dialog', { name: 'Informations patient' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Info patient' })).toHaveFocus()
  })

  it('uses one contextual Fermer and fully covers the leads during transmission', () => {
    vi.useFakeTimers()
    render(<Harness vitalLog={[]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open twelve lead' }))
    fireEvent.click(screen.getByRole('button', { name: 'Acquérir' }))
    act(() => vi.advanceTimersByTime(ACQUIRE_MS))

    expect(screen.getAllByRole('button', { name: 'Fermer' })).toHaveLength(1)
    const capturedFooter = screen.getByTestId('wagami-a-twelve-lead-footer')
    expect(within(capturedFooter).getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Fermer',
      'Info patient',
      'Transmettre',
      'Imprimer',
    ])

    fireEvent.click(screen.getByRole('button', { name: 'Transmettre' }))
    const transmission = screen.getByRole('dialog', { name: 'Destination de transmission' })
    expect(transmission).toHaveClass('bg-wagami-a-screen')
    expect(screen.queryByTestId('wagami-a-twelve-lead-footer')).not.toBeInTheDocument()
    expect(screen.getByTestId('wagami-a-twelve-lead-content')).toHaveAttribute('aria-hidden', 'true')
    expect(within(transmission).getAllByRole('button', { name: 'Fermer' })).toHaveLength(1)

    fireEvent.click(within(transmission).getByRole('button', { name: 'Fermer' }))
    expect(screen.getByTestId('twelve-lead-printout')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Fermer' })).toHaveLength(1)
    vi.useRealTimers()
  })

  it('hides live 12-lead identifiers through acquisition, result, and print preview', () => {
    vi.useFakeTimers()
    render(<Harness vitalLog={[]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open twelve lead' }))

    const leads = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6']
    for (const lead of leads) {
      expect(screen.getByTestId(`lead-cell-${lead}`)).toHaveTextContent(lead)
    }

    fireEvent.click(screen.getByRole('button', { name: 'Acquérir' }))
    for (const lead of leads) {
      const cell = screen.getByTestId(`lead-cell-${lead}`)
      expect(cell).not.toHaveTextContent(lead)
      expect(screen.getByTestId(`lead-canvas-${lead}`)).toBeInTheDocument()
    }

    act(() => vi.advanceTimersByTime(ACQUIRE_MS))
    for (const lead of leads) {
      expect(screen.getByTestId(`lead-cell-${lead}`)).not.toHaveTextContent(lead)
    }
    expect(screen.getByTestId('twelve-lead-printout')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Imprimer' }))
    for (const lead of leads) {
      expect(screen.getByTestId(`lead-cell-${lead}`)).not.toHaveTextContent(lead)
    }
    expect(screen.getByTestId('twelve-lead-printout')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }))
    for (const lead of leads) {
      expect(screen.getByTestId(`lead-cell-${lead}`)).toHaveTextContent(lead)
    }

    fireEvent.click(screen.getByRole('button', { name: 'Acquérir' }))
    fireEvent.click(screen.getByRole('button', { name: /Retour/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Open twelve lead' }))
    for (const lead of leads) {
      expect(screen.getByTestId(`lead-cell-${lead}`)).toHaveTextContent(lead)
    }
    vi.useRealTimers()
  })
})
