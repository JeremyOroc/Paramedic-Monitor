import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useWagamiAWorkspace } from '@/hooks/useWagamiAWorkspace'
import type { VitalLogEntry } from '@/hooks/useVitalLog'
import type { WagamiADisplayState } from '@/lib/wagamiAPreviewState'
import { DEFAULT_CALLER_INFO } from '@/types/callerInfo'
import { DEFAULT_VITALS } from '@/types/vitals'
import type { WagamiATask } from '../WagamiATaskDock'
import { WagamiAWorkspace } from '../WagamiAWorkspace'

vi.mock('../WagamiAScreen', () => ({
  WagamiAScreen: ({ onTask }: { onTask?: (task: WagamiATask) => void }) => (
    <button type="button" onClick={() => onTask?.('vitalLog')}>Open vital log</button>
  ),
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
    vitalLog,
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
      callerInfo={DEFAULT_CALLER_INFO}
    />
  )
}

describe('WagamiAWorkspace', () => {
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
})
