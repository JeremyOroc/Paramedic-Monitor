import { describe, expect, it, beforeEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'

import { useMonitorStore } from '@/store/monitorStore'
import { DEFAULT_DISPATCH_ROUTE } from '@/types/dispatchRoute'

import { SaveButton } from '../SaveButton'

describe('SaveButton', () => {
  beforeEach(() => {
    useMonitorStore.getState().reset()
  })

  it('is disabled when nothing is dirty', () => {
    render(<SaveButton />)
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('enables when caller info draft changes', () => {
    act(() => {
      useMonitorStore.getState().setCallerInfoDraft('time', '14:45')
    })
    render(<SaveButton />)
    expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled()
  })

  it('enables when normal vitals are activated from the inactive blank start state', () => {
    act(() => {
      useMonitorStore.getState().resetVitalsToNormal()
    })

    render(<SaveButton />)

    expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled()
  })

  it('enables when dispatch countdown changes after a route send', () => {
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
      useMonitorStore.getState().setDispatchMinutes(7)
    })

    render(<SaveButton />)

    expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled()
  })
})
