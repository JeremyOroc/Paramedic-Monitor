import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SendButton } from '../SendButton'
import { useMonitorStore } from '@/store/monitorStore'
import { DEFAULT_DISPATCH_ROUTE } from '@/types/dispatchRoute'

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

  it('enables when normal vitals are saved from the inactive blank start state', () => {
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

  it('enables after dispatch countdown changes for an already-sent route', async () => {
    const user = userEvent.setup()
    const readyRoute = {
      ...DEFAULT_DISPATCH_ROUTE,
      destinationAddress: '200 Sainte-Anne Street, Sainte-Anne-de-Bellevue, QC',
      destination: { lat: 45.403, lng: -73.951 },
      distanceMeters: 3200,
      durationSeconds: 480,
      geometry: [
        { lat: 45.4068, lng: -73.9412 },
        { lat: 45.403, lng: -73.951 },
      ],
      status: 'ready' as const,
    }

    act(() => {
      useMonitorStore.getState().setDispatchMinutes(5)
      useMonitorStore.getState().setDispatchRouteDraft(readyRoute)
      useMonitorStore.getState().save()
      useMonitorStore.getState().send()
    })

    render(<SendButton />)
    const btn = screen.getByRole('button', { name: 'Send' })
    expect(btn).toBeDisabled()

    act(() => {
      useMonitorStore.getState().setDispatchMinutes(7)
    })

    expect(btn).not.toBeDisabled()
    await user.click(btn)
    expect(useMonitorStore.getState().dispatchRouteConfirmed.durationSeconds).toBe(420)
    expect(btn).toBeDisabled()
  })
})
