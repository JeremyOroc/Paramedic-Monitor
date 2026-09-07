import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { ALL_MEDICATIONS } from '@/lib/monitor/medications'
import { MedicationRecorder } from '../MedicationRecorder'

const participants = [
  { id: 'p1', nickname: 'Alex' },
  { id: 'p2', nickname: 'Sam' },
]

function renderRecorder(overrides: Partial<React.ComponentProps<typeof MedicationRecorder>> = {}) {
  const onRecord = vi.fn()
  const onParticipantChange = vi.fn()
  render(
    <MedicationRecorder
      medications={ALL_MEDICATIONS}
      participants={[participants[0]]}
      participantId="p1"
      onParticipantChange={onParticipantChange}
      onRecord={onRecord}
      unavailableReason={null}
      {...overrides}
    />,
  )
  return { onRecord, onParticipantChange }
}

describe('MedicationRecorder', () => {
  it('offers every medication the monitor offers, unpaged', () => {
    renderRecorder()
    const grid = screen.getByTestId('medication-recorder')
    for (const medication of ALL_MEDICATIONS) {
      expect(within(grid).getByRole('button', { name: medication })).toBeEnabled()
    }
    // The console has the room the monitor's four soft keys do not.
    expect(ALL_MEDICATIONS).toHaveLength(12)
  })

  it('records the pressed medication', async () => {
    const user = userEvent.setup()
    const { onRecord } = renderRecorder()
    await user.click(screen.getByRole('button', { name: 'Nitro' }))
    expect(onRecord).toHaveBeenCalledExactlyOnceWith('Nitro')
  })

  it('confirms the press visually and to a screen reader', async () => {
    const user = userEvent.setup()
    renderRecorder()
    const button = screen.getByRole('button', { name: 'Epi' })
    expect(button).not.toHaveClass('bg-ecg-green')

    await user.click(button)
    expect(button).toHaveClass('bg-ecg-green')
    expect(screen.getByText('Epi recorded')).toBeInTheDocument()
  })

  it('moves the confirmation to the newest press rather than lighting both', async () => {
    const user = userEvent.setup()
    renderRecorder()
    await user.click(screen.getByRole('button', { name: 'Epi' }))
    await user.click(screen.getByRole('button', { name: 'O2' }))
    expect(screen.getByRole('button', { name: 'Epi' })).not.toHaveClass('bg-ecg-green')
    expect(screen.getByRole('button', { name: 'O2' })).toHaveClass('bg-ecg-green')
  })

  it('disables every button and says why when there is nobody to credit', async () => {
    const user = userEvent.setup()
    const { onRecord } = renderRecorder({
      participants: [],
      participantId: null,
      unavailableReason: 'No trainee has joined yet.',
    })
    expect(screen.getByTestId('medication-recorder-unavailable')).toHaveTextContent(
      'No trainee has joined yet.',
    )
    const button = screen.getByRole('button', { name: 'Nitro' })
    expect(button).toBeDisabled()
    await user.click(button)
    expect(onRecord).not.toHaveBeenCalled()
  })

  it('hides the credit picker for a one-trainee room and shows it for two', () => {
    const { unmount } = render(
      <MedicationRecorder
        medications={ALL_MEDICATIONS}
        participants={[participants[0]]}
        participantId="p1"
        onParticipantChange={vi.fn()}
        onRecord={vi.fn()}
        unavailableReason={null}
      />,
    )
    expect(screen.queryByLabelText('Credit to')).toBeNull()
    unmount()

    renderRecorder({ participants, participantId: 'p1' })
    expect(screen.getByLabelText('Credit to')).toHaveValue('p1')
  })

  it('reassigns credit when the instructor picks the other trainee', async () => {
    const user = userEvent.setup()
    const { onParticipantChange } = renderRecorder({ participants, participantId: 'p1' })
    await user.selectOptions(screen.getByLabelText('Credit to'), 'p2')
    expect(onParticipantChange).toHaveBeenCalledExactlyOnceWith('p2')
  })

  it('surfaces a failure instead of leaving the press looking successful', async () => {
    renderRecorder({ error: 'Participant is not in this session' })
    await waitFor(() =>
      expect(screen.getByTestId('medication-recorder-error')).toHaveTextContent(
        'Participant is not in this session',
      ),
    )
  })
})
