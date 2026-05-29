import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'

import { useMonitorStore } from '@/store/monitorStore'

import MonitorPage from '../page'

vi.mock('@/components/monitor/DeviceShell', () => ({
  DeviceShell: ({
    screen,
    onAnalyse,
    onLeftAnalyse,
    onMoveUp,
    onMoveDown,
    onEnter,
  }: {
    screen: ReactNode
    onAnalyse: () => void
    onLeftAnalyse: () => void
    onMoveUp: () => void
    onMoveDown: () => void
    onEnter: () => void
  }) => (
    <div>
      {screen}
      <button type="button" onClick={onAnalyse}>
        Analyze rhythm
      </button>
      <button type="button" onClick={onLeftAnalyse}>
        Call Info (sidebar)
      </button>
      <button type="button" onClick={onMoveUp}>
        Move up
      </button>
      <button type="button" onClick={onMoveDown}>
        Move down
      </button>
      <button type="button" onClick={onEnter}>
        Enter
      </button>
    </div>
  ),
}))

vi.mock('@/components/monitor/WaveformPanel', () => ({
  WaveformPanel: ({
    showAllSecondaryChannels,
  }: {
    showAllSecondaryChannels?: boolean
  }) => (
    <div>
      Waveform panel
      {showAllSecondaryChannels && <span>expanded-waveforms</span>}
    </div>
  ),
}))

describe('MonitorPage', () => {
  beforeEach(() => {
    useMonitorStore.getState().reset()
  })

  it('does not open caller info modal when ANALYZE is clicked', async () => {
    const user = userEvent.setup()
    act(() => {
      useMonitorStore.getState().setCallerInfoDraft('address', '123 Rue Principale')
      useMonitorStore.getState().setCallerInfoDraft('problem', 'Douleur thoracique')
      useMonitorStore.getState().save()
      useMonitorStore.getState().send()
    })

    render(<MonitorPage />)
    await user.click(screen.getByRole('button', { name: 'Analyze rhythm' }))

    expect(screen.queryByRole('heading', { name: 'Caller Info' })).not.toBeInTheDocument()
  })

  it('shows confirmed caller info when left sidebar ANALYSE is clicked', async () => {
    const user = userEvent.setup()
    act(() => {
      useMonitorStore.getState().setCallerInfoDraft('address', '456 Avenue Centrale')
      useMonitorStore.getState().setCallerInfoDraft('problem', 'Difficultes respiratoires')
      useMonitorStore.getState().save()
      useMonitorStore.getState().send()
    })

    render(<MonitorPage />)
    await user.click(screen.getByRole('button', { name: 'Call Info (sidebar)' }))

    expect(screen.getByRole('heading', { name: 'Caller Info' })).toBeInTheDocument()
    expect(screen.getByText('456 Avenue Centrale')).toBeInTheDocument()
    expect(screen.getByText('Difficultes respiratoires')).toBeInTheDocument()
  })

  it('starts with date and time selected', () => {
    render(<MonitorPage />)

    expect(screen.getByLabelText('Date and time')).toHaveClass(
      'bg-[var(--color-selection-blue)]',
      'text-white',
    )
  })

  it('cycles to the bottom status toggle in reverse and hides the bottom panel on enter', async () => {
    const user = userEvent.setup()
    render(<MonitorPage />)

    expect(screen.getByText('APPL ELECT.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Move down' }))
    await user.click(screen.getByRole('button', { name: 'Enter' }))

    expect(screen.queryByText('APPL ELECT.')).not.toBeInTheDocument()
    expect(screen.getByText('expanded-waveforms')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Toggle bottom status panel' })).toHaveClass(
      'bg-[var(--color-selection-blue)]',
      'text-white',
    )
  })
})
