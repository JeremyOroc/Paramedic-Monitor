import { useEffect } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useWagamiAWorkspace } from '@/hooks/useWagamiAWorkspace'
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
  const controller = useWagamiAWorkspace({
    scope: 'workspace-test',
    rhythm: display.vitals.rhythm,
    hr: display.vitals.hr,
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

  it('paginates the Vital Log after ten stable rows and places the clinical status in its header', () => {
    render(<Harness vitalLog={makeLog(11)} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open vital log' }))

    expect(screen.getByText('Page 1 sur 2')).toBeInTheDocument()
    expect(screen.getByText('00:50:00')).toBeInTheDocument()
    expect(screen.queryByText('00:55:00')).not.toBeInTheDocument()
    expect(screen.getAllByTestId('wagami-a-vital-log-row')).toHaveLength(10)
    expect(screen.getAllByTestId('wagami-a-vital-log-row').every((row) => row.dataset.empty === 'false')).toBe(true)
    const clinicalStatus = screen.getByTestId('wagami-a-clinical-status-line')
    expect(clinicalStatus).toHaveTextContent('MODE ADULTE · ALARME · FC')
    expect(clinicalStatus).toHaveClass('ml-auto')

    fireEvent.click(screen.getByRole('button', { name: /Suivant/ }))
    expect(screen.getByText('Page 2 sur 2')).toBeInTheDocument()
    expect(screen.getByText('00:55:00')).toBeInTheDocument()
    expect(screen.queryByText('00:05:00')).not.toBeInTheDocument()
    expect(screen.getAllByTestId('wagami-a-vital-log-row').filter((row) => row.dataset.empty === 'true')).toHaveLength(9)
  })

  it('keeps the empty Vital Log table, interval band, and disabled pagination stable', () => {
    render(<Harness vitalLog={[]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open vital log' }))

    expect(screen.getByTestId('wagami-a-vital-log-table')).toBeInTheDocument()
    expect(screen.getAllByTestId('wagami-a-vital-log-row')).toHaveLength(10)
    expect(screen.getAllByTestId('wagami-a-vital-log-row').every((row) => row.dataset.empty === 'true')).toBe(true)
    expect(screen.getByText('Aucun signe vital consigné.')).toBeInTheDocument()
    expect(screen.getByText('Page 1 sur 1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Précédent/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Suivant/ })).toBeDisabled()
    expect(screen.getByRole('group', { name: 'Intervalle du journal des signes vitaux' })).toBeInTheDocument()
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

  it('moves the Vital Log interval out of Configure and localizes English vital headers as HR/BP', () => {
    render(<Harness vitalLog={makeLog(1)} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open configure' }))

    expect(screen.queryByText('Intervalle du journal des signes vitaux')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '5 min' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'English' }))
    expect(screen.getByTestId('wagami-a-configure-mode')).toHaveClass('border-wagami-a-border', 'bg-wagami-a-surface-raised')

    fireEvent.click(screen.getByRole('button', { name: /Back/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Open vital log' }))
    expect(screen.getByRole('group', { name: 'Vital Log interval' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '5 min' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: '3 min' }))
    expect(screen.getByRole('button', { name: '3 min' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('HR')).toBeInTheDocument()
    expect(screen.getByText('BP SYS')).toBeInTheDocument()
    expect(screen.getByText('BP DIA')).toBeInTheDocument()
  })
})
