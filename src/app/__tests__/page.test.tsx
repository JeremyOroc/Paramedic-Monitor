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
  }: {
    screen: ReactNode
    onAnalyse: () => void
  }) => (
    <div>
      {screen}
      <button type="button" onClick={onAnalyse}>
        Analyze rhythm
      </button>
    </div>
  ),
}))

vi.mock('@/components/monitor/WaveformPanel', () => ({
  WaveformPanel: () => <div>Waveform panel</div>,
}))

describe('MonitorPage', () => {
  beforeEach(() => {
    useMonitorStore.getState().reset()
  })

  it('shows confirmed caller info when ANALYZE is clicked', async () => {
    const user = userEvent.setup()
    act(() => {
      useMonitorStore.getState().setCallerInfoDraft('address', '123 Rue Principale')
      useMonitorStore.getState().setCallerInfoDraft('problem', 'Douleur thoracique')
      useMonitorStore.getState().save()
      useMonitorStore.getState().send()
    })

    render(<MonitorPage />)
    await user.click(screen.getByRole('button', { name: 'Analyze rhythm' }))

    expect(screen.getByRole('heading', { name: 'Caller Info' })).toBeInTheDocument()
    expect(screen.getByText('123 Rue Principale')).toBeInTheDocument()
    expect(screen.getByText('Douleur thoracique')).toBeInTheDocument()
  })
})
