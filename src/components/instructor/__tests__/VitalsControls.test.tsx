import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { useMonitorStore } from '@/store/monitorStore'
import { DEFAULT_VITALS } from '@/types/vitals'

import { VitalsControls } from '../VitalsControls'

describe('VitalsControls', () => {
  beforeEach(() => {
    useMonitorStore.getState().reset()
  })

  it('renders a Normal button at the top of the vitals panel', () => {
    render(<VitalsControls />)

    const heading = screen.getByRole('heading', { name: 'Vitals' })
    const normal = screen.getByRole('button', { name: 'Normal' })
    expect(heading.compareDocumentPosition(normal) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('resets draft vital numbers to normal defaults without sending them', async () => {
    const user = userEvent.setup()
    useMonitorStore.getState().setDraft('hr', 180)
    useMonitorStore.getState().setDraft('bp_sys', 230)
    useMonitorStore.getState().setDraft('bp_dia', 240)
    useMonitorStore.getState().setDraft('spo2', 82)
    useMonitorStore.getState().save()
    useMonitorStore.getState().send()
    useMonitorStore.getState().setDraft('hr', 185)

    render(<VitalsControls />)
    await user.click(screen.getByRole('button', { name: 'Normal' }))

    const state = useMonitorStore.getState()
    expect(state.draft.hr).toBe(DEFAULT_VITALS.hr)
    expect(state.draft.bp_sys).toBe(DEFAULT_VITALS.bp_sys)
    expect(state.draft.bp_dia).toBe(DEFAULT_VITALS.bp_dia)
    expect(state.draft.spo2).toBe(DEFAULT_VITALS.spo2)
    expect(state.confirmed.hr).toBe(180)
  })
})
