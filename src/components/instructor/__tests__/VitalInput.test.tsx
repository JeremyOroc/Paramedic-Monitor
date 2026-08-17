import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VitalInput } from '../VitalInput'
import { useMonitorStore } from '@/store/monitorStore'
import type { NumericVitalField } from '@/types/vitals'

const VITAL_FIELDS: Array<{
  field: NumericVitalField
  label: string
  nonZero: number
}> = [
  { field: 'hr', label: 'FC', nonZero: 80 },
  { field: 'spo2', label: 'SpO2', nonZero: 98 },
  { field: 'bp_sys', label: 'BP sys', nonZero: 120 },
  { field: 'bp_dia', label: 'BP dia', nonZero: 80 },
  { field: 'etco2', label: 'EtCO2', nonZero: 35 },
]

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

  it('typing updates draft, keeps the vital Off, and marks it dirty', async () => {
    const user = userEvent.setup()
    render(<VitalInput field="hr" label="FC" unit="bpm" />)
    const input = screen.getByLabelText('FC') as HTMLInputElement
    await user.clear(input)
    await user.type(input, '160')
    expect(useMonitorStore.getState().draft.hr).toBe(160)
    expect(useMonitorStore.getState().draftVitalActive.hr).toBe(false)
    expect(screen.getByTestId('status-hr')).toHaveAttribute('data-status', 'dirty')
    expect(screen.getByRole('button', { name: 'FC off' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('typing SpO2 keeps the SpO2 graph disconnected while Off', async () => {
    const user = userEvent.setup()
    render(<VitalInput field="spo2" label="SpO2" unit="%" />)
    const input = screen.getByLabelText('SpO2') as HTMLInputElement

    await user.click(input)
    await user.type(input, '98')

    const s = useMonitorStore.getState()
    expect(s.draft.spo2).toBe(98)
    expect(s.draftVitalActive.spo2).toBe(false)
    expect(s.draft.spo2_waveform).toBe('off')
    expect(s.draft.etco2_waveform).toBe('off')
  })

  it('typing EtCO2 keeps the EtCO2 graph disconnected while Off', async () => {
    const user = userEvent.setup()
    render(<VitalInput field="etco2" label="EtCO2" unit="mmHg" />)
    const input = screen.getByLabelText('EtCO2') as HTMLInputElement

    await user.click(input)
    await user.type(input, '35')

    const s = useMonitorStore.getState()
    expect(s.draft.etco2).toBe(35)
    expect(s.draftVitalActive.etco2).toBe(false)
    expect(s.draft.etco2_waveform).toBe('off')
    expect(s.draft.spo2_waveform).toBe('off')
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

  it.each(VITAL_FIELDS)(
    'clears a zero-valued $label field on focus without marking it dirty',
    async ({ field, label }) => {
      const user = userEvent.setup()
      render(<VitalInput field={field} label={label} />)
      const input = screen.getByLabelText(label) as HTMLInputElement

      expect(input.value).toBe('0')
      await user.click(input)

      expect(input.value).toBe('')
      expect(useMonitorStore.getState().draft[field]).toBe(0)
      expect(screen.getByTestId(`status-${field}`)).toHaveAttribute(
        'data-status',
        'clean',
      )
    },
  )

  it.each(VITAL_FIELDS)(
    'restores the visible zero on blur when $label is focused but untouched',
    async ({ field, label }) => {
      const user = userEvent.setup()
      render(<VitalInput field={field} label={label} />)
      const input = screen.getByLabelText(label) as HTMLInputElement

      await user.click(input)
      expect(input.value).toBe('')
      await user.tab()

      expect(input.value).toBe('0')
      expect(useMonitorStore.getState().draft[field]).toBe(0)
    },
  )

  it.each(VITAL_FIELDS)(
    'types into a cleared $label field without keeping the leading zero',
    async ({ field, label, nonZero }) => {
      const user = userEvent.setup()
      render(<VitalInput field={field} label={label} />)
      const input = screen.getByLabelText(label) as HTMLInputElement

      await user.click(input)
      await user.type(input, String(nonZero))

      expect(input.value).toBe(String(nonZero))
      expect(useMonitorStore.getState().draft[field]).toBe(nonZero)
      expect(useMonitorStore.getState().draftVitalActive[field]).toBe(false)
      expect(screen.getByTestId(`status-${field}`)).toHaveAttribute(
        'data-status',
        'dirty',
      )
    },
  )

  it.each(VITAL_FIELDS)(
    'preserves an active $label switch while editing its number',
    async ({ field, label, nonZero }) => {
      const user = userEvent.setup()
      act(() => useMonitorStore.getState().setDraftVitalActive(field, true))
      render(<VitalInput field={field} label={label} />)
      const input = screen.getByLabelText(label) as HTMLInputElement

      await user.clear(input)
      await user.type(input, String(nonZero))

      expect(useMonitorStore.getState().draft[field]).toBe(nonZero)
      expect(useMonitorStore.getState().draftVitalActive[field]).toBe(true)
      expect(screen.getByRole('button', { name: `${label} on` })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
    },
  )

  it.each(VITAL_FIELDS)(
    'does not clear a non-zero $label value on focus',
    async ({ field, label, nonZero }) => {
      const user = userEvent.setup()
      act(() => {
        useMonitorStore.getState().setDraft(field, nonZero)
        useMonitorStore.getState().save()
        useMonitorStore.getState().send()
      })
      render(<VitalInput field={field} label={label} />)
      const input = screen.getByLabelText(label) as HTMLInputElement

      await user.click(input)

      expect(input.value).toBe(String(nonZero))
      expect(useMonitorStore.getState().draft[field]).toBe(nonZero)
    },
  )

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
    await user.click(screen.getByRole('button', { name: 'FC off' }))
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
