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
      counts={{}}
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
        counts={{}}
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

  describe('the given tally', () => {
    it('shows no badge for a med nobody has given', () => {
      renderRecorder()
      expect(screen.getByRole('button', { name: 'Nitro' })).not.toHaveAttribute('data-count')
    })

    it('shows the count and says it out loud', () => {
      renderRecorder({ counts: { Nitro: 3, Epi: 1 } })
      expect(screen.getByRole('button', { name: 'Nitro given 3 times' })).toHaveAttribute(
        'data-count',
        '3',
      )
      // Singular, because "given 1 times" is the sort of thing that ends up in
      // a debrief screenshot.
      expect(screen.getByRole('button', { name: 'Epi given 1 time' })).toBeInTheDocument()
    })

    it('marks a med that has been given so it reads apart from an untouched one', () => {
      renderRecorder({ counts: { Nitro: 2 } })
      expect(screen.getByRole('button', { name: 'Nitro given 2 times' })).toHaveClass(
        'text-ecg-green',
      )
      expect(screen.getByRole('button', { name: 'O2' })).toHaveClass('text-neutral-300')
    })

    it('keeps the tally visible while a press is still lit', async () => {
      const user = userEvent.setup()
      renderRecorder({ counts: { Nitro: 2 } })
      const button = screen.getByRole('button', { name: 'Nitro given 2 times' })
      await user.click(button)
      // The flash is transient; the tally is what survives it.
      expect(button).toHaveClass('bg-ecg-green')
      expect(button).toHaveAttribute('data-count', '2')
    })

    it('counts a med the trainee gave on the monitor, not only console presses', () => {
      // The prop is the run tally, so the instructor sees three Epi whoever
      // logged them.
      renderRecorder({ counts: { Epi: 3 } })
      expect(screen.getByRole('button', { name: 'Epi given 3 times' })).toHaveAttribute(
        'data-count',
        '3',
      )
    })
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
