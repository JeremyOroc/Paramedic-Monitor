import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VitalInput } from '../VitalInput'
import { useMonitorStore } from '@/store/monitorStore'

describe('VitalInput', () => {
  beforeEach(() => {
    useMonitorStore.getState().reset()
  })

  it('reflects clean status initially', () => {
    render(<VitalInput field="hr" label="FC" unit="bpm" />)
    expect(screen.getByTestId('status-hr')).toHaveTextContent('—')
  })

  it('typing updates draft and shows edited status', async () => {
    const user = userEvent.setup()
    render(<VitalInput field="hr" label="FC" unit="bpm" />)
    const input = screen.getByLabelText('FC') as HTMLInputElement
    await user.clear(input)
    await user.type(input, '160')
    expect(useMonitorStore.getState().draft.hr).toBe(160)
    expect(screen.getByTestId('status-hr')).toHaveTextContent('edited')
  })

  it('shows pending status after save', async () => {
    const user = userEvent.setup()
    render(<VitalInput field="hr" label="FC" />)
    const input = screen.getByLabelText('FC') as HTMLInputElement
    await user.clear(input)
    await user.type(input, '150')
    act(() => useMonitorStore.getState().save())
    expect(screen.getByTestId('status-hr')).toHaveTextContent('pending')
  })

  it('returns to clean after send', async () => {
    const user = userEvent.setup()
    render(<VitalInput field="hr" label="FC" />)
    const input = screen.getByLabelText('FC') as HTMLInputElement
    await user.clear(input)
    await user.type(input, '140')
    act(() => useMonitorStore.getState().save())
    act(() => useMonitorStore.getState().send())
    expect(screen.getByTestId('status-hr')).toHaveTextContent('—')
  })
})
