import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useMonitorStore } from '@/store/monitorStore'
import type { MonitorProjection } from '@/types/monitorProjection'
import { MonitorPage, type StudentEventRecord } from '../MonitorPage'

describe('Wagami A live Attempt integration', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/')
    window.localStorage.clear()
    useMonitorStore.getState().reset()
    act(() => {
      useMonitorStore.setState({
        defibrillatorModelDraft: 'wagamiA',
        defibrillatorModelSaved: 'wagamiA',
        defibrillatorModelConfirmed: 'wagamiA',
      })
    })
  })

  it('renders the live device, records semantic actions, and publishes A state', async () => {
    const events: StudentEventRecord[] = []
    const projections: MonitorProjection[] = []
    render(
      <MonitorPage
        transportStorageScope="ABC234.participant-1.1"
        onStudentEvent={(event) => events.push(event)}
        onProjectionChange={(projection) => projections.push(projection)}
      />,
    )

    expect(screen.getByTestId('wagami-a-live')).toBeInTheDocument()
    expect(screen.getByTestId('wagami-a-screen-off')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Alimentation WAGAMI A' }))
    expect(screen.getByText('MODE ADULTE')).toBeInTheDocument()
    expect(screen.queryByText(/EN DIRECT|DONNÉES CONFIRMÉES/)).not.toBeInTheDocument()
    expect(events).toContainEqual({ kind: 'power_on', label: 'Power On' })

    fireEvent.click(screen.getByRole('button', { name: 'Médicaments' }))
    fireEvent.click(screen.getByRole('button', { name: /Epi/ }))

    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'medication', label: 'Epi' }),
    ]))
    await waitFor(() => {
      expect(projections.at(-1)).toMatchObject({
        model: 'wagamiA',
        powerState: 'on',
        wagamiA: {
          view: 'medications',
          preferences: { locale: 'fr', shellAlarmLedEnabled: true },
          medicationEvents: [expect.objectContaining({ medication: 'Epi' })],
        },
      })
    })
  })

  it('opens PNI settings without recording a clinical action and projects the view', async () => {
    const events: StudentEventRecord[] = []
    const projections: MonitorProjection[] = []
    render(
      <MonitorPage
        transportStorageScope="ABC234.participant-1.1"
        onStudentEvent={(event) => events.push(event)}
        onProjectionChange={(projection) => projections.push(projection)}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Alimentation WAGAMI A' }))
    events.length = 0
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir les réglages PNI' }))

    expect(screen.getByRole('heading', { name: 'Réglages PNI' })).toBeInTheDocument()
    expect(events).toEqual([])
    await waitFor(() => {
      expect(projections.at(-1)?.wagamiA?.view).toBe('nibpSettings')
    })
  })

  it('reopens Call Info as a full-page live dispatch workflow and projects the page', async () => {
    const events: StudentEventRecord[] = []
    const projections: MonitorProjection[] = []
    act(() => useMonitorStore.setState((state) => ({
      confirmed: { ...state.confirmed, rhythm: 'nsr' },
      confirmedVitalActive: { ...state.confirmedVitalActive, hr: true },
    })))
    render(
      <MonitorPage
        transportStorageScope="ABC234.participant-1.1"
        onStudentEvent={(event) => events.push(event)}
        onProjectionChange={(projection) => projections.push(projection)}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Alimentation WAGAMI A' }))
    const ecg = screen.getByTestId('live-ecg-canvas')
    fireEvent.click(screen.getByRole('button', { name: 'Info appel' }))

    expect(screen.getByTestId('wagami-a-call-info-page')).toBeInTheDocument()
    expect(screen.getByTestId('wagami-a-shell').parentElement).toHaveClass('invisible')
    expect(screen.getByTestId('live-ecg-canvas')).toBe(ecg)
    expect(screen.getByTestId('assignment-dashboard')).toBeInTheDocument()
    expect(screen.getByLabelText('Response timer')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Transport' })).toBeEnabled()
    await waitFor(() => expect(projections.at(-1)?.wagamiA?.view).toBe('callInfo'))

    fireEvent.click(screen.getByRole('button', { name: 'Transport' }))
    expect(events).toContainEqual(expect.objectContaining({ kind: 'transport', label: 'Transport' }))

    fireEvent.click(screen.getByRole('button', { name: /Retour/ }))
    expect(screen.getByTestId('wagami-a-shell')).toBeInTheDocument()
    expect(screen.getByTestId('live-ecg-canvas')).toBe(ecg)
    expect(screen.queryByTestId('wagami-a-call-info-page')).not.toBeInTheDocument()
  })

  it('preserves A language on the full-page caller surface', () => {
    render(<MonitorPage transportStorageScope="ABC234.participant-1.1" />)
    fireEvent.click(screen.getByRole('button', { name: 'Alimentation WAGAMI A' }))
    fireEvent.click(screen.getByRole('button', { name: 'Configurer' }))
    fireEvent.click(screen.getByRole('button', { name: 'English' }))
    fireEvent.click(screen.getByRole('button', { name: /Back/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Call Info' }))
    expect(screen.getByRole('heading', { name: 'Call information' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Acknowledge' })).toBeInTheDocument()
    expect(within(screen.getByTestId('wagami-a-call-info-page')).getByTestId('wagami-a-clinical-status-line')).toHaveTextContent('MODE ADULT')
  })

  it('resets device preferences for a new Attempt scope', async () => {
    const first = render(
      <MonitorPage
        key="attempt-1"
        transportStorageScope="ABC234.participant-1.1"
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Alimentation WAGAMI A' }))
    fireEvent.click(screen.getByRole('button', { name: 'Configurer' }))
    fireEvent.click(screen.getByRole('button', { name: 'English' }))
    fireEvent.click(screen.getByRole('button', { name: 'Off' }))
    expect(screen.getByRole('heading', { name: 'Configure' })).toBeInTheDocument()
    expect(screen.getByTestId('wagami-a-shell-led')).toHaveAttribute('data-enabled', 'false')
    first.unmount()

    render(
      <MonitorPage
        key="attempt-2"
        transportStorageScope="ABC234.participant-1.2"
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Alimentation WAGAMI A' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Configurer' })).toBeInTheDocument()
      expect(screen.getByTestId('wagami-a-shell-led')).toHaveAttribute('data-enabled', 'true')
    })
  })
})
