import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { TreatmentRecorder } from '../TreatmentRecorder'

function renderRecorder(overrides: Partial<React.ComponentProps<typeof TreatmentRecorder>> = {}) {
  const onRecord = vi.fn()
  render(
    <TreatmentRecorder
      medications={['Advil', 'Fentanyl']}
      traumaTreatments={['BVM', 'Intubation', 'Tourniquet']}
      participants={[{ id: 'p1', nickname: 'Medic 1' }]}
      participantId="p1"
      onParticipantChange={vi.fn()}
      onRecord={onRecord}
      counts={{ Fentanyl: 2, Tourniquet: 1 }}
      unavailableReason={null}
      {...overrides}
    />,
  )
  return { onRecord }
}

describe('TreatmentRecorder', () => {
  it('groups medication and Trauma controls and records their stable categories', async () => {
    const user = userEvent.setup()
    const { onRecord } = renderRecorder()

    expect(screen.getByText('Medications')).toBeInTheDocument()
    expect(screen.getByText('Trauma')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Advil' }))
    await user.click(screen.getByRole('button', { name: 'Tourniquet recorded 1 time' }))

    expect(onRecord).toHaveBeenNthCalledWith(1, 'Advil', 'medication')
    expect(onRecord).toHaveBeenNthCalledWith(2, 'Tourniquet', 'trauma')
    expect(screen.getByText('Intubation')).toBeInTheDocument()
  })

  it('shows whole-Attempt counts and explains why every button is disabled', () => {
    renderRecorder({ unavailableReason: 'Start / Dispatch first.' })

    expect(screen.getByRole('button', { name: 'Fentanyl given 2 times' })).toBeDisabled()
    expect(screen.getByTestId('treatment-recorder-unavailable')).toHaveTextContent('Start / Dispatch first.')
  })
})
