import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { AttemptNotesPanel } from '../AttemptNotesPanel'

describe('AttemptNotesPanel', () => {
  it('autosaves General Notes on blur and clears a Report Note only after success', async () => {
    const user = userEvent.setup()
    const saveGeneralNotes = vi.fn().mockResolvedValue(undefined)
    const sendReportNote = vi.fn().mockResolvedValue(undefined)
    render(
      <AttemptNotesPanel
        generalNotes=""
        onSaveGeneralNotes={saveGeneralNotes}
        onSendReportNote={sendReportNote}
        disabledReason={null}
      />,
    )

    await user.type(screen.getByRole('textbox', { name: 'General Notes' }), 'Ongoing narrative')
    await user.tab()
    await waitFor(() => expect(saveGeneralNotes).toHaveBeenCalledWith('Ongoing narrative'))

    const reportNote = screen.getByLabelText('Report Note')
    await user.type(reportNote, 'Tourniquet reassessed')
    await user.click(screen.getByRole('button', { name: 'Send Report Note' }))
    expect(sendReportNote).toHaveBeenCalledWith('Tourniquet reassessed')
    expect(reportNote).toHaveValue('')
  })

  it('retains a failed Report Note and disables blank sends', async () => {
    const user = userEvent.setup()
    const sendReportNote = vi.fn().mockRejectedValue(new Error('Network unavailable'))
    render(
      <AttemptNotesPanel
        generalNotes=""
        onSaveGeneralNotes={vi.fn().mockResolvedValue(undefined)}
        onSendReportNote={sendReportNote}
        disabledReason={null}
      />,
    )

    expect(screen.getByRole('button', { name: 'Send Report Note' })).toBeDisabled()
    await user.type(screen.getByLabelText('Report Note'), 'Keep this draft')
    await user.click(screen.getByRole('button', { name: 'Send Report Note' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Network unavailable')
    expect(screen.getByLabelText('Report Note')).toHaveValue('Keep this draft')
  })
})
