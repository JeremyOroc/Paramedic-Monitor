import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { useMonitorStore } from '@/store/monitorStore'

import { DefibrillatorPanel } from '../DefibrillatorPanel'

describe('DefibrillatorPanel', () => {
  beforeEach(() => {
    useMonitorStore.getState().reset()
  })

  it('defaults to a clean Wagami X selection', () => {
    render(<DefibrillatorPanel />)

    expect(screen.getByRole('button', { name: 'Wagami X' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Wagami X' })).toHaveClass(
      'border-ecg-green',
      'bg-ecg-green',
    )
    expect(screen.getByRole('button', { name: 'Wagami Z' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('shows dirty and pending selection states through Save and Send', async () => {
    const user = userEvent.setup()
    render(<DefibrillatorPanel />)

    const wagamiZ = screen.getByRole('button', { name: 'Wagami Z' })
    await user.click(wagamiZ)
    expect(wagamiZ).toHaveClass('border-cyan-bp', 'text-cyan-bp')

    act(() => useMonitorStore.getState().save())
    expect(wagamiZ).toHaveClass('border-pending-amber', 'text-pending-amber')

    act(() => useMonitorStore.getState().send())
    expect(wagamiZ).toHaveClass('border-ecg-green', 'bg-ecg-green')
  })

  it('keeps the confirmed model highlighted while both choices are locked', () => {
    act(() => {
      const store = useMonitorStore.getState()
      store.setDefibrillatorModelDraft('wagamiZ')
      store.save()
      store.send()
    })

    render(<DefibrillatorPanel disabled />)

    expect(screen.getByRole('button', { name: 'Wagami X' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Wagami Z' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Wagami Z' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Wagami Z' })).toHaveClass('bg-ecg-green')
  })
})
