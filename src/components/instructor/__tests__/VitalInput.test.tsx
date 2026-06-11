import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VitalInput } from '../VitalInput'
import { useMonitorStore } from '@/store/monitorStore'

describe('VitalInput', () => {
  beforeEach(() => {
    useMonitorStore.getState().reset()
  })

  it('starts Off with clean status initially', () => {
    render(<VitalInput field="hr" label="FC" unit="bpm" />)
    expect(screen.getByTestId('status-hr')).toHaveAttribute('data-status', 'clean')
    expect(screen.getByRole('button', { name: 'FC off' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('renders the number field as a compact right-aligned console slot with embedded unit text', () => {
    render(<VitalInput field="hr" label="FC" unit="bpm" />)

    const input = screen.getByLabelText('FC')
    const shell = screen.getByTestId('vital-input-shell-hr')

    expect(input).toHaveClass('text-right')
    expect(shell).toHaveClass('w-24')
    expect(shell).toHaveClass('bg-transparent')
    expect(shell).toContainElement(input)
    expect(shell).toContainElement(screen.getByText('bpm'))
  })

  it('typing updates draft, turns the vital On, and marks it dirty', async () => {
    const user = userEvent.setup()
    render(<VitalInput field="hr" label="FC" unit="bpm" />)
    const input = screen.getByLabelText('FC') as HTMLInputElement
    await user.clear(input)
    await user.type(input, '160')
    expect(useMonitorStore.getState().draft.hr).toBe(160)
    expect(useMonitorStore.getState().draftVitalActive.hr).toBe(true)
    expect(screen.getByTestId('status-hr')).toHaveAttribute('data-status', 'dirty')
    expect(screen.getByRole('button', { name: 'FC on' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('shows pending status after save', async () => {
    const user = userEvent.setup()
    render(<VitalInput field="hr" label="FC" />)
    const input = screen.getByLabelText('FC') as HTMLInputElement
    await user.clear(input)
    await user.type(input, '150')
    act(() => useMonitorStore.getState().save())
    expect(screen.getByTestId('status-hr')).toHaveAttribute('data-status', 'pending')
  })

  it('does not leave a leading zero when typing after a clear', async () => {
    const user = userEvent.setup()
    render(<VitalInput field="hr" label="FC" />)
    const input = screen.getByLabelText('FC') as HTMLInputElement
    await user.clear(input)
    // Field stays empty after clearing instead of snapping back to "0".
    expect(input.value).toBe('')
    await user.type(input, '20')
    expect(input.value).toBe('20')
    expect(useMonitorStore.getState().draft.hr).toBe(20)
  })

  it('strips leading zeros as you type', async () => {
    const user = userEvent.setup()
    render(<VitalInput field="hr" label="FC" />)
    const input = screen.getByLabelText('FC') as HTMLInputElement
    await user.clear(input)
    await user.type(input, '0')
    await user.type(input, '2')
    expect(input.value).toBe('2')
    expect(useMonitorStore.getState().draft.hr).toBe(2)
  })

  it('resyncs from the store on reset', async () => {
    const user = userEvent.setup()
    render(<VitalInput field="hr" label="FC" />)
    const input = screen.getByLabelText('FC') as HTMLInputElement
    await user.clear(input)
    await user.type(input, '160')
    act(() => useMonitorStore.getState().reset())
    expect(input.value).toBe(String(useMonitorStore.getState().draft.hr))
  })

  it('returns to clean after send', async () => {
    const user = userEvent.setup()
    render(<VitalInput field="hr" label="FC" />)
    const input = screen.getByLabelText('FC') as HTMLInputElement
    await user.clear(input)
    await user.type(input, '140')
    act(() => useMonitorStore.getState().save())
    act(() => useMonitorStore.getState().send())
    expect(screen.getByTestId('status-hr')).toHaveAttribute('data-status', 'clean')
  })

  it('can turn a stored vital off without clearing its numeric value', async () => {
    const user = userEvent.setup()
    render(<VitalInput field="hr" label="FC" />)
    const input = screen.getByLabelText('FC') as HTMLInputElement
    await user.clear(input)
    await user.type(input, '0')
    await user.click(screen.getByRole('button', { name: 'FC on' }))

    expect(useMonitorStore.getState().draft.hr).toBe(0)
    expect(useMonitorStore.getState().draftVitalActive.hr).toBe(false)
    expect(screen.getByRole('button', { name: 'FC off' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('toggles on and off from anywhere in the same right-side rectangle', async () => {
    const user = userEvent.setup()
    render(<VitalInput field="hr" label="FC" />)

    await user.click(screen.getByRole('button', { name: 'FC off' }))
    expect(useMonitorStore.getState().draftVitalActive.hr).toBe(true)
    expect(screen.getByRole('button', { name: 'FC on' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await user.click(screen.getByRole('button', { name: 'FC on' }))
    expect(useMonitorStore.getState().draftVitalActive.hr).toBe(false)
    expect(screen.getByRole('button', { name: 'FC off' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })
})
