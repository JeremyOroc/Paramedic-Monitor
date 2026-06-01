import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SendButton } from '../SendButton'
import { useMonitorStore } from '@/store/monitorStore'

describe('SendButton', () => {
  beforeEach(() => {
    useMonitorStore.getState().reset()
  })

  it('is disabled when nothing is pending', () => {
    render(<SendButton />)
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
  })

  it('enables once a value has been saved', () => {
    act(() => {
      useMonitorStore.getState().setDraft('hr', 150)
      useMonitorStore.getState().save()
    })
    render(<SendButton />)
    expect(screen.getByRole('button', { name: 'Send' })).not.toBeDisabled()
  })

  it('enables when normal vitals are saved from the inactive zero start state', () => {
    act(() => {
      useMonitorStore.getState().resetVitalsToNormal()
      useMonitorStore.getState().save()
    })

    render(<SendButton />)

    expect(screen.getByRole('button', { name: 'Send' })).not.toBeDisabled()
  })

  it('enables once caller info has been saved', () => {
    act(() => {
      useMonitorStore.getState().setCallerInfoDraft('address', '123 Rue Principale')
      useMonitorStore.getState().save()
    })
    render(<SendButton />)
    expect(screen.getByRole('button', { name: 'Send' })).not.toBeDisabled()
  })

  it('fires send and disables again afterward', async () => {
    const user = userEvent.setup()
    act(() => {
      useMonitorStore.getState().setDraft('hr', 150)
      useMonitorStore.getState().save()
    })
    render(<SendButton />)
    const btn = screen.getByRole('button', { name: 'Send' })
    await user.click(btn)
    expect(useMonitorStore.getState().confirmed.hr).toBe(150)
    expect(btn).toBeDisabled()
  })

  it('sends caller info and disables again afterward', async () => {
    const user = userEvent.setup()
    act(() => {
      useMonitorStore.getState().setCallerInfoDraft('problem', 'Chute')
      useMonitorStore.getState().save()
    })
    render(<SendButton />)
    const btn = screen.getByRole('button', { name: 'Send' })
    await user.click(btn)
    expect(useMonitorStore.getState().callerInfoConfirmed.problem).toBe('Chute')
    expect(btn).toBeDisabled()
  })
})
