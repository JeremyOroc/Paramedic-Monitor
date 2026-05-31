import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { useMonitorStore } from '@/store/monitorStore'
import MonitorPage from '../page'

// Uses the real DeviceShell (no mock) so the physical soft-key wiring is
// exercised end to end: 12-lead → Back must return to the main waveform view.
describe('MonitorPage — 12-lead back flow', () => {
  beforeEach(() => {
    useMonitorStore.getState().reset()
    window.history.pushState({}, '', '/?dev=1') // bypass the dispatch lock gate
  })

  it('returns to the main view when the physical Back soft key is clicked', async () => {
    const user = userEvent.setup()
    render(<MonitorPage />)

    await user.click(screen.getByRole('button', { name: '12-lead view' }))
    // The 12-lead grid renders lead labels (e.g. aVR) the main view never shows.
    expect(screen.getByText('aVR')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.queryByText('aVR')).not.toBeInTheDocument()
  })
})
