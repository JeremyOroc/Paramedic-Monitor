import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { WagamiATaskDock } from '../WagamiATaskDock'

describe('Wagami A right task dock', () => {
  it('keeps all six distinct groups visible and preview-disabled until A5', () => {
    render(<WagamiATaskDock />)
    const dock = screen.getByRole('navigation', { name: 'Wagami A task dock' })
    const tasks = within(dock).getAllByRole('button')

    expect(tasks).toHaveLength(6)
    expect(tasks.every((task) => task.hasAttribute('disabled'))).toBe(true)
    expect(within(dock).getByRole('button', { name: 'Info appel' })).toBeInTheDocument()
    expect(within(dock).getByRole('button', { name: 'Journal des signes vitaux' })).toBeInTheDocument()
    expect(within(dock).queryByRole('button', { name: 'Imprimer / capturer' })).not.toBeInTheDocument()
    expect(within(dock).queryByRole('button', { name: 'Événements' })).not.toBeInTheDocument()
  })

  it('preserves future one-tap task semantics when a handler is supplied', () => {
    const onTask = vi.fn()
    render(<WagamiATaskDock onTask={onTask} />)

    fireEvent.click(screen.getByRole('button', { name: 'Info appel' }))
    expect(onTask).toHaveBeenCalledWith('callInfo')
  })

  it('visibly disables Call Info without disabling the other destinations', () => {
    const onTask = vi.fn()
    render(<WagamiATaskDock onTask={onTask} callInfoDisabled />)
    expect(screen.getByRole('button', { name: 'Info appel' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Médicaments' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Info appel' }))
    expect(onTask).not.toHaveBeenCalled()
  })
})
