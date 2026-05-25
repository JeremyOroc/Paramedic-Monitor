import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { useMonitorStore } from '@/store/monitorStore'
import MonitorPage from '../page'

// Real DeviceShell (no mock): exercises the full Patient Info flow driven by the
// physical soft keys + right-cluster nav buttons.
async function enterTwelveLead(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: '12-lead view' }))
}

function ageValue() {
  // value chip lives in the "Patient Age" row of the panel
  const row = screen.getByText('Patient Age').closest('li') as HTMLElement
  return within(row).getAllByText(/^\d+$/)[0].textContent
}

describe('MonitorPage — Patient Info menu', () => {
  beforeEach(() => {
    useMonitorStore.getState().reset()
  })

  it('opens only from the 12-lead slot-2 key', async () => {
    const user = userEvent.setup()
    render(<MonitorPage />)
    // not available in the main view
    expect(screen.queryByRole('button', { name: 'Patient Info' })).not.toBeInTheDocument()

    await enterTwelveLead(user)
    await user.click(screen.getByRole('button', { name: 'Patient Info' }))
    expect(screen.getByRole('heading', { name: 'Patient Info' })).toBeInTheDocument()
    expect(ageValue()).toBe('40') // default
  })

  it('edits age with a draft and commits on Enter', async () => {
    const user = userEvent.setup()
    render(<MonitorPage />)
    await enterTwelveLead(user)
    await user.click(screen.getByRole('button', { name: 'Patient Info' }))

    // Enter to edit Age, Move up twice → draft 42
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    await user.click(screen.getByRole('button', { name: 'Move up' }))
    await user.click(screen.getByRole('button', { name: 'Move up' }))
    expect(ageValue()).toBe('42')
    // not yet committed to the store
    expect(useMonitorStore.getState().patientInfo.age).toBe(40)

    // Enter to confirm → store updated
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    expect(useMonitorStore.getState().patientInfo.age).toBe(42)
  })

  it('cancels an edit with Back (reverts the draft)', async () => {
    const user = userEvent.setup()
    render(<MonitorPage />)
    await enterTwelveLead(user)
    await user.click(screen.getByRole('button', { name: 'Patient Info' }))

    await user.click(screen.getByRole('button', { name: 'Enter' }))
    await user.click(screen.getByRole('button', { name: 'Move down' })) // draft 39
    expect(ageValue()).toBe('39')

    await user.click(screen.getByRole('button', { name: 'Back' })) // cancel
    expect(ageValue()).toBe('40') // reverted to stored value
    expect(useMonitorStore.getState().patientInfo.age).toBe(40)
    // panel still open
    expect(screen.getByRole('heading', { name: 'Patient Info' })).toBeInTheDocument()
  })

  it('navigates to Sex and toggles M/F', async () => {
    const user = userEvent.setup()
    render(<MonitorPage />)
    await enterTwelveLead(user)
    await user.click(screen.getByRole('button', { name: 'Patient Info' }))

    // browse down to Sex, edit, toggle, confirm
    await user.click(screen.getByRole('button', { name: 'Move down' }))
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    await user.click(screen.getByRole('button', { name: 'Move up' })) // toggle M→F
    await user.click(screen.getByRole('button', { name: 'Enter' }))
    expect(useMonitorStore.getState().patientInfo.sex).toBe('F')
  })

  it('Back closes the panel, then exits the 12-lead view', async () => {
    const user = userEvent.setup()
    render(<MonitorPage />)
    await enterTwelveLead(user)
    expect(screen.getByText('aVR')).toBeInTheDocument() // 12-lead grid

    await user.click(screen.getByRole('button', { name: 'Patient Info' }))
    expect(screen.getByRole('heading', { name: 'Patient Info' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Back' })) // close panel
    expect(screen.queryByRole('heading', { name: 'Patient Info' })).not.toBeInTheDocument()
    expect(screen.getByText('aVR')).toBeInTheDocument() // still in 12-lead

    await user.click(screen.getByRole('button', { name: 'Back' })) // exit 12-lead
    expect(screen.queryByText('aVR')).not.toBeInTheDocument()
  })
})
