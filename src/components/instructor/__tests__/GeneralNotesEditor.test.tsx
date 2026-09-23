import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { GeneralNotesEditor } from '../GeneralNotesEditor'

describe('GeneralNotesEditor', () => {
  it('uses Edit and Done while retaining the latest saved narrative', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(
      <GeneralNotesEditor
        value="Initial note"
        onSave={onSave}
        showEditButton
        initiallyEditing={false}
      />,
    )

    expect(screen.getByTestId('general-notes-view')).toHaveTextContent('Initial note')
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    const editor = screen.getByRole('textbox', { name: 'General Notes' })
    await user.clear(editor)
    await user.type(editor, 'Revised note')
    await user.click(screen.getByRole('button', { name: 'Done' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledWith('Revised note'))
    expect(await screen.findByTestId('general-notes-view')).toHaveTextContent('Revised note')
  })

  it('keeps editing and shows the failure when Done cannot save', async () => {
    const user = userEvent.setup()
    render(
      <GeneralNotesEditor
        value=""
        onSave={vi.fn().mockRejectedValue(new Error('Save failed upstream'))}
        showEditButton
      />,
    )

    await user.type(screen.getByRole('textbox', { name: 'General Notes' }), 'Do not lose')
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(await screen.findByText('Save failed upstream')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'General Notes' })).toHaveValue('Do not lose')
  })

  it('queues edits made while an autosave is still in flight', async () => {
    const user = userEvent.setup()
    let resolveFirst: (() => void) | undefined
    const firstSave = new Promise<void>((resolve) => {
      resolveFirst = resolve
    })
    const onSave = vi.fn()
      .mockImplementationOnce(() => firstSave)
      .mockResolvedValue(undefined)
    render(<GeneralNotesEditor value="" onSave={onSave} />)

    const editor = screen.getByRole('textbox', { name: 'General Notes' })
    await user.type(editor, 'First')
    fireEvent.blur(editor)
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('First'))

    await user.click(editor)
    await user.type(editor, ' and latest')
    await act(async () => resolveFirst?.())

    await waitFor(() => expect(onSave).toHaveBeenNthCalledWith(2, 'First and latest'))
    expect(editor).toHaveValue('First and latest')
  })
})
