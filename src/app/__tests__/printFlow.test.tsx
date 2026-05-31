import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'

import { useMonitorStore } from '@/store/monitorStore'
import MonitorPage from '../page'

// Exercises the main-view PRINT key (real DeviceShell + page wiring): it is inert
// until a 12-lead has been acquired, then reprints the latest capture over the main
// view, and Back dismisses it. Fake timers drive the ~4s acquisition.
describe('MonitorPage — print latest 12-lead', () => {
  beforeEach(() => {
    useMonitorStore.getState().reset()
    window.history.pushState({}, '', '/?dev=1') // bypass the dispatch lock gate
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function clickButton(name: string) {
    fireEvent.click(screen.getByRole('button', { name }))
  }

  // Capture a 12-lead, then return to the main view (Back dismisses the printout,
  // a second Back exits the 12-lead view).
  function captureThenReturnToMain() {
    clickButton('12-lead view')
    clickButton('Capture 12-lead')
    act(() => {
      vi.advanceTimersByTime(4000)
    })
    expect(screen.getByTestId('twelve-lead-printout')).toBeInTheDocument()
    clickButton('Back') // dismiss in-view printout
    clickButton('Back') // exit 12-lead → main
    expect(screen.queryByTestId('twelve-lead-printout')).not.toBeInTheDocument()
  }

  it('is inert until a 12-lead has been acquired', () => {
    render(<MonitorPage />)
    clickButton('Printer soft key')
    expect(screen.queryByTestId('twelve-lead-printout')).not.toBeInTheDocument()
  })

  it('reprints the latest capture over the main view, and Back dismisses it', () => {
    render(<MonitorPage />)
    captureThenReturnToMain()

    clickButton('Printer soft key')
    expect(screen.getByTestId('twelve-lead-printout')).toBeInTheDocument()

    // While the printout is up, only Back works — other keys are inert.
    clickButton('12-lead view')
    expect(screen.getByTestId('twelve-lead-printout')).toBeInTheDocument()

    clickButton('Back')
    expect(screen.queryByTestId('twelve-lead-printout')).not.toBeInTheDocument()
  })

  it('forgets the capture after a power cycle', () => {
    render(<MonitorPage />)
    captureThenReturnToMain()

    // Power off then on; the boot timer runs for 2s.
    clickButton('Power')
    clickButton('Power')
    act(() => {
      vi.advanceTimersByTime(2000)
    })

    clickButton('Printer soft key')
    expect(screen.queryByTestId('twelve-lead-printout')).not.toBeInTheDocument()
  })
})
