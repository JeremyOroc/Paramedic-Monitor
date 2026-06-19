import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'

import { useMonitorStore } from '@/store/monitorStore'
import MonitorPage from '../page'

// Exercises the real DeviceShell + page wiring: Capture soft key → "Acquiring"
// card → static printout, and the Back precedence (cancel mid-acquire / dismiss).
// Uses fireEvent (synchronous) so the click handling doesn't depend on timers,
// which are faked here to drive the ~4s acquisition.
describe('MonitorPage — 12-lead capture flow', () => {
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

  function enterTwelveLead() {
    render(<MonitorPage />)
    clickButton('12-lead view')
  }

  it('acquires for ~4s then shows the printout, and Back dismisses it', () => {
    enterTwelveLead()

    clickButton('Capture 12-lead')
    // Acquiring card is up; printout not yet.
    expect(screen.getByText('Acquiring 12-Lead')).toBeInTheDocument()
    expect(screen.queryByTestId('twelve-lead-printout')).not.toBeInTheDocument()

    // Bar fills → result.
    act(() => {
      vi.advanceTimersByTime(4000)
    })
    expect(screen.getByTestId('twelve-lead-printout')).toBeInTheDocument()
    expect(screen.queryByText('Acquiring 12-Lead')).not.toBeInTheDocument()

    // While the printout is up, only Back works — other keys are inert.
    clickButton('Patient Info')
    expect(screen.queryByText('Patient Age')).not.toBeInTheDocument()
    clickButton('Capture 12-lead')
    expect(screen.getByTestId('twelve-lead-printout')).toBeInTheDocument()

    // Back dismisses the printout, returning to the live 12-lead grid.
    clickButton('Back')
    expect(screen.queryByTestId('twelve-lead-printout')).not.toBeInTheDocument()
    expect(screen.getByText('aVR')).toBeInTheDocument()
  })

  it('uses the Anterior MI strip when Anterior MI is captured', () => {
    useMonitorStore.getState().setDraft('rhythm', 'anterior-mi')
    useMonitorStore.getState().save()
    useMonitorStore.getState().send()

    enterTwelveLead()
    clickButton('Capture 12-lead')

    act(() => {
      vi.advanceTimersByTime(4000)
    })

    expect(screen.getByTestId('twelve-lead-printout')).toHaveAttribute(
      'data-captured-rhythm',
      'anterior-mi',
    )
    expect(
      screen
        .getByRole('img', { name: '12-lead ECG capture' })
        .getAttribute('src'),
    ).toContain('anterior-mi-strip.jpg')
  })

  it('uses the Inferior MI strip when Inferior MI is captured', () => {
    useMonitorStore.getState().setDraft('rhythm', 'inferior-mi')
    useMonitorStore.getState().save()
    useMonitorStore.getState().send()

    enterTwelveLead()
    clickButton('Capture 12-lead')

    act(() => {
      vi.advanceTimersByTime(4000)
    })

    expect(screen.getByTestId('twelve-lead-printout')).toHaveAttribute(
      'data-captured-rhythm',
      'inferior-mi',
    )
    expect(
      screen
        .getByRole('img', { name: '12-lead ECG capture' })
        .getAttribute('src'),
    ).toContain('inferior-mi-strip.jpeg')
  })

  it('uses the VFib strip when VF is captured', () => {
    useMonitorStore.getState().setDraft('rhythm', 'vf')
    useMonitorStore.getState().save()
    useMonitorStore.getState().send()

    enterTwelveLead()
    clickButton('Capture 12-lead')

    act(() => {
      vi.advanceTimersByTime(4000)
    })

    expect(screen.getByTestId('twelve-lead-printout')).toHaveAttribute(
      'data-captured-rhythm',
      'vf',
    )
    expect(
      screen
        .getByRole('img', { name: '12-lead ECG capture' })
        .getAttribute('src'),
    ).toContain('vfib-12-lead-strip.png')
  })

  it('uses the 1st Degree strip when first-degree heart block is captured', () => {
    useMonitorStore.getState().setDraft('rhythm', 'first-degree')
    useMonitorStore.getState().save()
    useMonitorStore.getState().send()

    enterTwelveLead()
    clickButton('Capture 12-lead')

    act(() => {
      vi.advanceTimersByTime(4000)
    })

    expect(screen.getByTestId('twelve-lead-printout')).toHaveAttribute(
      'data-captured-rhythm',
      'first-degree',
    )
    expect(
      screen
        .getByRole('img', { name: '12-lead ECG capture' })
        .getAttribute('src'),
    ).toContain('first-degree-block-strip.png')
  })

  it('uses the 2nd Degree Type 1 strip when second-degree type 1 is captured', () => {
    useMonitorStore.getState().setDraft('rhythm', 'second-degree-type-1')
    useMonitorStore.getState().save()
    useMonitorStore.getState().send()

    enterTwelveLead()
    clickButton('Capture 12-lead')

    act(() => {
      vi.advanceTimersByTime(4000)
    })

    expect(screen.getByTestId('twelve-lead-printout')).toHaveAttribute(
      'data-captured-rhythm',
      'second-degree-type-1',
    )
    expect(
      screen
        .getByRole('img', { name: '12-lead ECG capture' })
        .getAttribute('src'),
    ).toContain('second-degree-type-1-strip.png')
  })

  it('uses the 2nd Degree Type 2 strip when second-degree type 2 is captured', () => {
    useMonitorStore.getState().setDraft('rhythm', 'second-degree-type-2')
    useMonitorStore.getState().save()
    useMonitorStore.getState().send()

    enterTwelveLead()
    clickButton('Capture 12-lead')

    act(() => {
      vi.advanceTimersByTime(4000)
    })

    expect(screen.getByTestId('twelve-lead-printout')).toHaveAttribute(
      'data-captured-rhythm',
      'second-degree-type-2',
    )
    expect(
      screen
        .getByRole('img', { name: '12-lead ECG capture' })
        .getAttribute('src'),
    ).toContain('second-degree-type-2-strip.png')
  })

  it('uses the 3rd Degree strip when complete heart block is captured', () => {
    useMonitorStore.getState().setDraft('rhythm', 'third-degree')
    useMonitorStore.getState().save()
    useMonitorStore.getState().send()

    enterTwelveLead()
    clickButton('Capture 12-lead')

    act(() => {
      vi.advanceTimersByTime(4000)
    })

    expect(screen.getByTestId('twelve-lead-printout')).toHaveAttribute(
      'data-captured-rhythm',
      'third-degree',
    )
    expect(
      screen
        .getByRole('img', { name: '12-lead ECG capture' })
        .getAttribute('src'),
    ).toContain('third-degree-block-strip.png')
  })

  it('cancels the acquisition when Back is pressed mid-fill', () => {
    enterTwelveLead()

    clickButton('Capture 12-lead')
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(screen.getByText('Acquiring 12-Lead')).toBeInTheDocument()

    clickButton('Back')
    expect(screen.queryByText('Acquiring 12-Lead')).not.toBeInTheDocument()

    // The cancelled timer must not fire a late switch to the printout.
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(screen.queryByTestId('twelve-lead-printout')).not.toBeInTheDocument()
    // Still in the live 12-lead view (not bounced to main).
    expect(screen.getByText('aVR')).toBeInTheDocument()
  })
})
