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
  }: {
    screen: ReactNode
    onAnalyse: () => void
    onLeftAnalyse: () => void
  }) => (
    <div>
      {screen}
      <button type="button" onClick={onAnalyse}>
        Analyze rhythm
      </button>
      <button type="button" onClick={onLeftAnalyse}>
        Analyse (sidebar)
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

  it('shows confirmed caller info when left sidebar ANALYSE is clicked', async () => {
    const user = userEvent.setup()
    act(() => {
      useMonitorStore.getState().setCallerInfoDraft('address', '456 Avenue Centrale')
      useMonitorStore.getState().setCallerInfoDraft('problem', 'Difficultes respiratoires')
      useMonitorStore.getState().save()
      useMonitorStore.getState().send()
    })

    render(<MonitorPage />)
    await user.click(screen.getByRole('button', { name: 'Analyse (sidebar)' }))

    expect(screen.getByRole('heading', { name: 'Caller Info' })).toBeInTheDocument()
    expect(screen.getByText('456 Avenue Centrale')).toBeInTheDocument()
    expect(screen.getByText('Difficultes respiratoires')).toBeInTheDocument()
  })
})
