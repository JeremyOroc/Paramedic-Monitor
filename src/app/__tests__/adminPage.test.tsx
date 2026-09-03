import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { useMonitorStore } from '@/store/monitorStore'

import AdminPage from '@/components/instructor/AdminPage'

const routerReplace = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: routerReplace,
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(window.location.search),
  usePathname: () => window.location.pathname,
}))

vi.mock('@/components/instructor/ScenarioLibraryPanel', () => ({
  ScenarioLibraryPanel: ({
    scenarioDraftActive,
    scenarioDraftTitle,
    scenarioIsDirty,
    onNewScenario,
  }: {
    scenarioDraftActive: boolean
    scenarioDraftTitle: string
    scenarioIsDirty: boolean
    onNewScenario: () => void
  }) => (
    <section aria-label="Scenarios library">
      <button type="button" onClick={onNewScenario}>New Scenario</button>
      {scenarioDraftActive ? (
        <button type="button" disabled={!scenarioIsDirty}>
          Save {scenarioDraftTitle.trim() || 'Untitled Scenario'}
        </button>
      ) : null}
    </section>
  ),
}))

function revealSnsOptions(group: 'pulse' | 'respiratory') {
  fireEvent.pointerEnter(screen.getByTestId(`${group}-measurement-surface`), {
    pointerType: 'mouse',
  })
}

describe('AdminPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    routerReplace.mockClear()
    useMonitorStore.getState().reset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('lets a session instructor end an active room', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.spyOn(window, 'fetch')
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            session: { status: 'active' },
            participants: [],
            events: [],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ session: { status: 'ended' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

    render(<AdminPage session={{ code: 'ABC123', hostToken: 'host_token' }} />)

    await waitFor(() => expect(screen.getByText('active')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'End Room' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/api/session/ABC123/end', {
        method: 'POST',
        headers: { 'x-session-host-token': 'host_token' },
      }),
    )
    await waitFor(() => expect(routerReplace).toHaveBeenCalledWith('/'))
  })

  it('shows a live roster with connection dots and per-student progress', async () => {
    vi.spyOn(window, 'fetch').mockImplementation(async () => {
      const body = {
        session: { status: 'active', active_attempt_version: 1 },
        participants: [
          {
            id: 'student-1',
            nickname: 'Alice',
            joined_at: '2026-07-04T11:00:00.000Z',
            last_seen_at: new Date().toISOString(),
          },
          {
            id: 'student-2',
            nickname: 'Bob',
            joined_at: '2026-07-04T11:00:00.000Z',
            last_seen_at: '2026-07-04T11:00:05.000Z',
          },
        ],
        events: [
          {
            id: 'e1',
            session_id: 's',
            participant_id: 'student-1',
            attempt_version: 1,
            kind: 'acknowledge',
            label: 'Acknowledge',
            payload: {},
            occurred_at: '2026-07-04T11:01:00.000Z',
          },
          {
            id: 'e2',
            session_id: 's',
            participant_id: 'student-1',
            attempt_version: 1,
            kind: 'shock',
            label: 'Shock',
            payload: {},
            occurred_at: '2026-07-04T11:02:00.000Z',
          },
        ],
      }
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })

    render(<AdminPage session={{ code: 'ABC123', hostToken: 'host_token' }} />)

    await waitFor(() => expect(screen.getByText('Students')).toBeInTheDocument())
    const studentsPanel = screen.getByText('Students').parentElement as HTMLElement
    await waitFor(() =>
      expect(within(studentsPanel).getByText('Alice')).toBeInTheDocument(),
    )
    expect(within(studentsPanel).getByText('Bob')).toBeInTheDocument()
    expect(within(studentsPanel).getAllByLabelText('Connected')).toHaveLength(1)
    expect(within(studentsPanel).getAllByLabelText('Offline')).toHaveLength(1)

    const aliceRow = within(studentsPanel).getByText('Alice').closest(
      'div[class*="justify-between"]',
    ) as HTMLElement
    expect(within(aliceRow).getByText('Ack')).toHaveClass('text-ecg-green')
    expect(within(aliceRow).getByText('Arr')).not.toHaveClass('text-ecg-green')
    expect(within(aliceRow).getByText(/Shk 1/)).toBeInTheDocument()
  })

  it('lets a session instructor force a new attempt', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.spyOn(window, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      const body = url.endsWith('/attempt')
        ? { session: { status: 'active', active_attempt_version: 2 } }
        : {
            session: { status: 'active', active_attempt_version: 1 },
            participants: [],
            events: [],
          }
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })

    render(<AdminPage session={{ code: 'ABC123', hostToken: 'host_token' }} />)
    await waitFor(() => expect(screen.getByText('active')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Monitor & Patient SNS' }))
    revealSnsOptions('pulse')
    await user.click(screen.getByRole('button', { name: 'Pulse 15s' }))
    expect(screen.getByRole('button', {
      name: 'Cancel Pulse 15-second measurement',
    })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'New Attempt' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/api/session/ABC123/attempt', {
        method: 'POST',
        headers: { 'x-session-host-token': 'host_token' },
      }),
    )
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Pulse measurement controls' }))
        .toHaveAttribute('aria-expanded', 'false'),
    )
    expect(screen.queryByRole('button', {
      name: 'Cancel Pulse 15-second measurement',
    })).toBeNull()
  })

  it('keeps Start disabled until the call info has been sent', async () => {
    vi.spyOn(window, 'fetch').mockImplementation(async () =>
      new Response(
        JSON.stringify({
          session: { status: 'waiting', active_attempt_version: 1 },
          participants: [],
          events: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    render(<AdminPage session={{ code: 'ABC123', hostToken: 'host_token' }} />)
    await waitFor(() => expect(screen.getByText('waiting')).toBeInTheDocument())

    // Opening the room is what begins the scenario, so the call has to be
    // staged first — otherwise trainees land on an empty dispatch.
    const start = screen.getByRole('button', { name: 'Start / Dispatch' })
    expect(start).toBeDisabled()

    act(() => {
      useMonitorStore.getState().setCallerInfoDraft('address', '123 Rue Principale')
      useMonitorStore.getState().save()
      useMonitorStore.getState().send()
    })

    expect(start).toBeEnabled()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Defibrillators' }))
    await user.click(screen.getByRole('button', { name: 'Wagami Z' }))
    expect(start).toBeDisabled()
    expect(start).toHaveAttribute(
      'title',
      'Save and Send the defibrillator model before starting',
    )

    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(start).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Send' }))
    expect(start).toBeEnabled()
  })

  it('locks the confirmed model after Start and keeps the selected button highlighted', async () => {
    let started = false
    vi.spyOn(window, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.endsWith('/start')) {
        started = true
        return new Response(
          JSON.stringify({ session: { status: 'active', active_attempt_version: 1 } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
      const body = url.endsWith('/review')
        ? {
            session: {
              status: started ? 'active' : 'waiting',
              active_attempt_version: 1,
            },
            participants: [],
            events: [],
          }
        : { session: { status: started ? 'active' : 'waiting' }, state: { version: 1 } }
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })

    act(() => {
      const store = useMonitorStore.getState()
      store.setCallerInfoDraft('address', '123 Rue Principale')
      store.save()
      store.send()
    })

    const user = userEvent.setup()
    render(<AdminPage session={{ code: 'ABC123', hostToken: 'host_token' }} />)
    await waitFor(() => expect(screen.getByText('waiting')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Defibrillators' }))
    await user.click(screen.getByRole('button', { name: 'Wagami Z' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await user.click(screen.getByRole('button', { name: 'Send' }))
    await user.click(screen.getByRole('button', { name: 'Start / Dispatch' }))

    await waitFor(() => expect(screen.getByText('active')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Defibrillators' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Wagami X' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Wagami Z' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Wagami Z' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Wagami Z' })).toHaveClass('bg-ecg-green')
  })

  it('keeps the model selector unlocked when Start fails', async () => {
    vi.spyOn(window, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.endsWith('/start')) {
        return new Response(JSON.stringify({ error: 'Unable to open room' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      const body = url.endsWith('/review')
        ? {
            session: { status: 'waiting', active_attempt_version: 1 },
            participants: [],
            events: [],
          }
        : { session: { status: 'waiting' }, state: { version: 1 } }
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })
    act(() => {
      const store = useMonitorStore.getState()
      store.setCallerInfoDraft('address', '123 Rue Principale')
      store.setDefibrillatorModelDraft('wagamiZ')
      store.save()
      store.send()
    })

    const user = userEvent.setup()
    render(<AdminPage session={{ code: 'ABC123', hostToken: 'host_token' }} />)
    await waitFor(() => expect(screen.getByText('waiting')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Defibrillators' }))
    await user.click(screen.getByRole('button', { name: 'Start / Dispatch' }))

    await waitFor(() => expect(screen.getByText('Unable to open room')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Wagami X' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Wagami Z' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Wagami Z' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('stamps the dispatch clock from when the room opens, not from Send', async () => {
    vi.spyOn(window, 'fetch').mockImplementation(async (input) => {
      const body = String(input).endsWith('/start')
        ? { session: { status: 'active', active_attempt_version: 1 } }
        : {
            session: { status: 'waiting', active_attempt_version: 1 },
            participants: [],
            events: [],
            state: { version: 1 },
          }
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })

    render(<AdminPage session={{ code: 'ABC123', hostToken: 'host_token' }} />)
    await waitFor(() => expect(screen.getByText('waiting')).toBeInTheDocument())

    act(() => {
      useMonitorStore.getState().setDispatchMinutes(2)
      useMonitorStore.getState().save()
      useMonitorStore.getState().send()
      // Stand in for a previous run's state. Only startDispatchClock clears
      // this, so it proves the clock was re-stamped as the room opened rather
      // than left at whatever Send set — a plain timestamp compare would pass
      // trivially, since Send and Start can land in the same millisecond.
      useMonitorStore.getState().acknowledgeCall('10:00:00')
    })
    expect(useMonitorStore.getState().dispatch.acknowledgedAt).toBe('10:00:00')

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Start / Dispatch' }))

    await waitFor(() => {
      expect(useMonitorStore.getState().dispatch.acknowledgedAt).toBeNull()
    })
    expect(useMonitorStore.getState().dispatch.arrivedAt).toBeNull()
  })

  it('clears the instructor panel when a new attempt starts', async () => {
    const user = userEvent.setup()
    let newAttemptStarted = false
    vi.spyOn(window, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.endsWith('/attempt')) {
        newAttemptStarted = true
        return new Response(
          JSON.stringify({ session: { status: 'waiting', active_attempt_version: 2 } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
      const body = {
        session: {
          status: newAttemptStarted ? 'waiting' : 'active',
          active_attempt_version: newAttemptStarted ? 2 : 1,
        },
        participants: [],
        events: [],
      }
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })

    render(<AdminPage session={{ code: 'ABC123', hostToken: 'host_token' }} />)
    await waitFor(() => expect(screen.getByText('active')).toBeInTheDocument())

    // Load the previous run's scenario onto the instructor side.
    act(() => {
      useMonitorStore.getState().setDraft('rhythm', 'vf')
      useMonitorStore.getState().setDefibrillatorModelDraft('wagamiZ')
      useMonitorStore.getState().save()
      useMonitorStore.getState().send()
      useMonitorStore.getState().setCprMode('weak')
    })
    expect(useMonitorStore.getState().confirmed.rhythm).toBe('vf')
    expect(useMonitorStore.getState().cprMode).toBe('weak')
    expect(useMonitorStore.getState().defibrillatorModelConfirmed).toBe('wagamiZ')
    const versionBefore = useMonitorStore.getState().monitorResetVersion

    await user.click(screen.getByRole('button', { name: 'New Attempt' }))

    // Without the reset this stayed 'vf' and was pushed back onto trainees who
    // had just been hard-reset by the attempt bump.
    await waitFor(() => {
      expect(useMonitorStore.getState().confirmed.rhythm).toBe('off')
    })
    expect(useMonitorStore.getState().draft.rhythm).toBe('off')
    expect(useMonitorStore.getState().cprMode).toBe('off')
    expect(useMonitorStore.getState().defibrillatorModelDraft).toBe('wagamiZ')
    expect(useMonitorStore.getState().defibrillatorModelSaved).toBe('wagamiZ')
    expect(useMonitorStore.getState().defibrillatorModelConfirmed).toBe('wagamiZ')
    // The bumped reset version is what propagates the clear to students.
    expect(useMonitorStore.getState().monitorResetVersion).toBeGreaterThan(versionBefore)
    await user.click(screen.getByRole('button', { name: 'Defibrillators' }))
    expect(screen.getByRole('button', { name: 'Wagami X' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Wagami Z' })).toBeEnabled()
  })

  it('pushes every CPR mode transition to the session immediately', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.spyOn(window, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      const body = url.includes('/review')
        ? { session: { status: 'active' }, participants: [], events: [] }
        : { session: { status: 'active' }, state: { version: 1 } }
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })

    render(<AdminPage session={{ code: 'ABC123', hostToken: 'host_token' }} />)
    await waitFor(() => expect(screen.getByText('active')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Monitor & Patient SNS' }))

    const statePosts = () =>
      fetchMock.mock.calls.filter(
        ([url, init]) => String(url).endsWith('/state') && init?.method === 'POST',
      )
    expect(statePosts()).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: 'Regular CPR' }))

    await waitFor(() => expect(statePosts()).toHaveLength(1))
    const regularPost = JSON.parse(String(statePosts()[0][1]?.body))
    expect(regularPost.state.cprMode).toBe('regular')
    expect(regularPost.state.cprOverrideActive).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Weak CPR' }))

    await waitFor(() => expect(statePosts()).toHaveLength(2))
    const weakPost = JSON.parse(String(statePosts()[1][1]?.body))
    expect(weakPost.state.cprMode).toBe('weak')
    expect(weakPost.state.cprOverrideActive).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Weak CPR' }))

    await waitFor(() => expect(statePosts()).toHaveLength(3))
    const offPost = JSON.parse(String(statePosts()[2][1]?.body))
    expect(offPost.state.cprMode).toBe('off')
    expect(offPost.state.cprOverrideActive).toBe(false)
  })

  it('removes the shared Reset control from live sessions', async () => {
    vi.spyOn(window, 'fetch').mockImplementation(async () => {
      const body = { session: { status: 'active' }, participants: [], events: [] }
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })

    render(<AdminPage session={{ code: 'ABC123', hostToken: 'host_token' }} />)
    await waitFor(() => expect(screen.getByText('active')).toBeInTheDocument())

    expect(screen.queryByRole('button', { name: 'Reset' })).toBeNull()
    expect(screen.getByRole('button', { name: 'New Attempt' })).toBeInTheDocument()
  })

  it('shows the five-tab layout and combines Vitals, SNS, and Patient Information', async () => {
    const user = userEvent.setup()
    render(<AdminPage />)

    expect(screen.getByRole('button', { name: 'Scenarios' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Monitor & Patient SNS' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Patient Information' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Patient Physical' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Defibrillators' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Report' })).toBeInTheDocument()
    expect(screen.getByLabelText('Scenarios library')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Expand Caller Info' }))
    expect(screen.getByLabelText('Scenario title')).toBeInTheDocument()
    expect(screen.getByLabelText('Auto-sort scenario')).toBeInTheDocument()
    expect(screen.getByLabelText('Adresse')).toBeInTheDocument()
    expect(screen.queryByText('Vitals')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Monitor & Patient SNS' }))

    expect(screen.getByRole('button', { name: 'Monitor & Patient SNS' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Vitals')).toBeInTheDocument()
    expect(screen.queryByLabelText('Auto-sort vitals')).toBeNull()
    expect(within(screen.getByTestId('admin-graph-row-ecg')).getByRole('button', { name: 'ECG off' })).toBeInTheDocument()
    expect(screen.queryByTestId('admin-graph-row-spo2')).not.toBeInTheDocument()
    expect(screen.queryByTestId('admin-graph-row-etco2')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'SpO2 off' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'EtCO2 off' })).toBeInTheDocument()
    expect(screen.getByTestId('patient-sns-controls')).toHaveClass('grid-cols-3')
    expect(screen.getByRole('heading', { name: 'Pulse' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Respiratory' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Pulse measurement options' })).toBeNull()
    expect(screen.queryByRole('group', { name: 'Respiratory measurement options' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Pulse measurement controls' }))
      .toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: 'Respiratory measurement controls' }))
      .toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: 'Skin/Extremities' })).toBeInTheDocument()
    const vitals = screen.getByRole('heading', { name: 'Vitals' }).closest('section')
    const sample = screen.getByRole('region', { name: 'Sample' })
    const monitorLayout = screen.getByTestId('monitor-patient-sns-layout')
    expect(monitorLayout).toHaveClass(
      'grid',
      'lg:grid-cols-[minmax(0,11fr)_minmax(0,9fr)]',
      'xl:[@media(min-height:800px)]:grid-cols-[minmax(0,8fr)_minmax(0,5fr)]',
    )
    expect(monitorLayout).toContainElement(vitals)
    expect(monitorLayout).toContainElement(sample)
    expect(screen.getByTestId('admin-etco2-calibration-indicator')).toHaveAttribute(
      'data-calibrated',
      'false',
    )
    expect(screen.queryByRole('button', { name: 'Set vitals to normal' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Reset' })).toBeNull()
    expect(screen.queryByLabelText('Adresse')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Scenarios' }))
    await user.click(screen.getByRole('button', { name: 'New Scenario' }))
    await user.click(screen.getByRole('button', { name: 'Defibrillators' }))
    expect(screen.getByRole('button', { name: 'Defibrillators' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Wagami X' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Wagami Z' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )

    await user.click(screen.getByRole('button', { name: 'Wagami Z' }))
    await user.click(screen.getByRole('button', { name: 'Scenarios' }))
    await user.click(screen.getByRole('button', { name: 'Expand Caller Info' }))
    expect(screen.getByRole('button', { name: 'Save Untitled Scenario' })).toBeEnabled()
  })

  it('continues independent SNS measurements while another tab is selected', () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    render(<AdminPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Monitor & Patient SNS' }))
    revealSnsOptions('pulse')
    fireEvent.click(screen.getByRole('button', { name: 'Pulse 15s' }))
    revealSnsOptions('respiratory')
    fireEvent.click(screen.getByRole('button', { name: 'Respiratory 30s' }))
    fireEvent.click(screen.getByRole('button', { name: 'Scenarios' }))

    expect(screen.queryByRole('heading', { name: 'Pulse' })).toBeNull()
    act(() => {
      vi.advanceTimersByTime(15_000)
    })

    fireEvent.click(screen.getByRole('button', { name: 'Monitor & Patient SNS' }))

    expect(screen.getByRole('region', { name: 'Pulse measurement result' }))
      .toHaveTextContent('Missing: Rate, Rhythm, Strength')
    expect(screen.getByRole('img', { name: 'Pulse findings' })).toHaveClass(
      'text-ecg-green',
    )
    expect(screen.getByRole('button', {
      name: 'Cancel Respiratory 30-second measurement',
    })).toHaveTextContent('15s')
    expect(screen.queryByRole('region', { name: 'Respiratory measurement result' }))
      .toBeNull()
  })

  it('opens the evaluation report on its own tab', async () => {
    const user = userEvent.setup()
    render(<AdminPage />)

    await user.click(screen.getByRole('button', { name: 'Report' }))

    expect(screen.getByRole('button', { name: 'Report' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('evaluation-report-panel')).toBeInTheDocument()
    // No session, so there is nothing recorded to read -- the panel says so
    // rather than rendering an empty table.
    expect(screen.getByText('Nothing recorded for this attempt yet.')).toBeInTheDocument()
  })

  it('sends the scenario name with the state so the record can say what was run', async () => {
    const user = userEvent.setup()
    const bodies: string[] = []
    vi.spyOn(window, 'fetch').mockImplementation(async (input, init) => {
      if (String(input).endsWith('/state') && init?.body) bodies.push(String(init.body))
      return new Response(
        JSON.stringify({
          session: { status: 'waiting', active_attempt_version: 1 },
          participants: [],
          events: [],
          attempts: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    })

    render(<AdminPage session={{ code: 'ABC123', hostToken: 'host_token' }} />)
    await waitFor(() => expect(screen.getByText('waiting')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Expand Caller Info' }))
    await user.type(screen.getByLabelText('Scenario title'), 'Fall from ladder')

    act(() => {
      useMonitorStore.getState().setCallerInfoDraft('address', '123 Rue Principale')
      useMonitorStore.getState().save()
    })
    await user.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => expect(bodies.length).toBeGreaterThan(0))
    // The title is console state, not store state, so this is the only place
    // the two are joined -- and the record is empty of scenario identity
    // without it.
    expect(JSON.parse(bodies.at(-1) as string).state.scenarioTitleConfirmed).toBe(
      'Fall from ladder',
    )
  })

  it('asks the review poll for history only while the Report tab is open (PLAN 13f)', async () => {
    const user = userEvent.setup()
    const urls: string[] = []
    vi.spyOn(window, 'fetch').mockImplementation(async (input) => {
      urls.push(String(input))
      return new Response(
        JSON.stringify({
          session: { status: 'active', active_attempt_version: 1 },
          participants: [],
          events: [],
          stateHistory: [],
          attempts: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    })

    render(<AdminPage session={{ code: 'ABC123', hostToken: 'host_token' }} />)
    await waitFor(() => expect(urls.length).toBeGreaterThan(0))
    expect(urls[0]).toBe('/api/session/ABC123/review')

    await user.click(screen.getByRole('button', { name: 'Report' }))
    await waitFor(() =>
      expect(urls.at(-1)).toBe('/api/session/ABC123/review?include=history'),
    )

    await user.click(screen.getByRole('button', { name: 'Scenarios' }))
    await waitFor(() => expect(urls.at(-1)).toBe('/api/session/ABC123/review'))
  })

  it('places the shared Save and Send actions immediately above the tab list', () => {
    render(<AdminPage />)

    const actions = screen.getByTestId('admin-save-send-actions')
    const tabs = screen.getByTestId('admin-tab-list')
    expect(actions.compareDocumentPosition(tabs)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(actions).toContainElement(screen.getByRole('button', { name: 'Save' }))
    expect(actions).toContainElement(screen.getByRole('button', { name: 'Send' }))
  })

  it('uses the Caller Info auto-sort scenario box to populate all admin sections', async () => {
    const user = userEvent.setup()
    render(<AdminPage />)

    await user.click(screen.getByRole('button', { name: 'Scenarios' }))
    await user.click(screen.getByRole('button', { name: 'Expand Caller Info' }))
    fireEvent.change(screen.getByLabelText('Auto-sort scenario'), {
      target: {
        value: [
          'CALL #: 2026-0612-1416',
          'PRIORITY: P1 / DELTA',
          'MPDS CODE: 23-D-1',
          'ADDRESS:',
          '2155 Rue Sherbrooke E, Montreal, QC',
          'CHIEF COMPLAINT:',
          'Male, 31 years old, possible opioid overdose',
          'DETAILS:',
          'Found unconscious in apartment',
          'STATUS:',
          '10-100 Unstable',
          'TIME RECEIVED:',
          '14:16',
          '',
          '### Vitals (Origin)',
          'HR: 54 bpm',
          'SpO2: 78% on room air',
          'BP: 96/58 mmHg',
          'EtCO2: 62 mmHg',
          '',
          '### SAMPLE',
          'S: Opioid use disorder',
          'A: No known allergies',
          'M:',
          'Methadone (long-acting opioid)',
          'Sertraline (antidepressant)',
          'P: Previous opioid overdoses',
          'L: Unknown',
          'E: Friend reports opioid use 30 minutes before being found',
          '',
          '### OPQRST',
          'O: Gradual decline after opioid use',
          'P: N/A',
          'Q: N/A',
          'R: N/A',
          'S: N/A',
          'T: Approximately 30 minutes',
          '',
          'Chest / Respiratory',
          'Shallow respirations',
          'Abdomen',
          'Soft',
          'Skin / Extremities',
          'Pale',
          'Cool',
          'Scene / Environment',
          'Found in apartment',
        ].join('\n'),
      },
    })

    const draft = useMonitorStore.getState().callerInfoDraft
    expect(draft.callNumber).toBe('2026-0612-1416')
    expect(draft.priority).toBe('P1 / DELTA')
    expect(draft.mpdsCode).toBe('23-D-1')
    expect(draft.address).toBe('2155 Rue Sherbrooke E, Montreal, QC')
    expect(draft.problem).toBe('Male, 31 years old, possible opioid overdose')
    expect(draft.information).toBe('Found unconscious in apartment')
    expect(draft.update).toBe('10-100 Unstable')
    expect(draft.time).toBe('14:16')

    const state = useMonitorStore.getState()
    expect(state.draft.hr).toBe(54)
    expect(state.draft.spo2).toBe(78)
    expect(state.draft.bp_sys).toBe(96)
    expect(state.draft.bp_dia).toBe(58)
    expect(state.draft.etco2).toBe(62)
    expect(state.draftVitalActive).toMatchObject({
      hr: false,
      spo2: false,
      bp_sys: false,
      bp_dia: false,
      etco2: false,
    })
    expect(state.draft.spo2_waveform).toBe('off')
    expect(state.draft.etco2_waveform).toBe('off')
    expect(state.callerInfoConfirmed.address).toBe('')
    expect(state.confirmed.hr).toBe(0)

    await user.click(screen.getByRole('button', { name: 'Monitor & Patient SNS' }))
    expect(screen.getByLabelText('Sample S information')).toHaveValue('Opioid use disorder')
    expect(screen.getByLabelText('Sample M information')).toHaveValue('Methadone, Sertraline')
    expect(screen.getByLabelText('OPQRST O information')).toHaveValue(
      'Gradual decline after opioid use',
    )
    expect(screen.getByRole('button', { name: 'Skin/Extremities' })).toHaveClass(
      'border-pending-amber',
    )

    await user.click(screen.getByRole('button', { name: 'Patient Physical' }))
    expect(screen.getByRole('button', { name: 'Front chest' })).toHaveClass(
      'border-pending-amber',
    )
    expect(screen.getByRole('button', { name: 'Front abdomen' })).toHaveClass(
      'border-pending-amber',
    )
    expect(screen.getByRole('button', { name: 'Scene/Environment' })).toHaveClass(
      'border-pending-amber',
    )
  })

  it('keeps auto-sorted vitals off until manually toggled on and sent', async () => {
    const user = userEvent.setup()
    render(<AdminPage />)

    await user.click(screen.getByRole('button', { name: 'Scenarios' }))
    await user.click(screen.getByRole('button', { name: 'Expand Caller Info' }))
    fireEvent.change(screen.getByLabelText('Auto-sort scenario'), {
      target: {
        value: [
          '### Vitals (Origin)',
          'HR: 54 bpm',
          'SpO2: 78% on room air',
          'BP: 96/58 mmHg',
          'EtCO2: 62 mmHg',
        ].join('\n'),
      },
    })

    await user.click(screen.getByRole('button', { name: 'Save' }))
    await user.click(screen.getByRole('button', { name: 'Send' }))

    let state = useMonitorStore.getState()
    expect(state.confirmed.hr).toBe(54)
    expect(state.confirmed.spo2).toBe(78)
    expect(state.confirmed.etco2).toBe(62)
    expect(state.confirmedVitalsActive).toBe(false)
    expect(state.confirmedVitalActive.hr).toBe(false)
    expect(state.confirmedVitalActive.spo2).toBe(false)
    expect(state.confirmedVitalActive.etco2).toBe(false)
    expect(state.confirmed.spo2_waveform).toBe('off')
    expect(state.confirmed.etco2_waveform).toBe('off')

    await user.click(screen.getByRole('button', { name: 'Monitor & Patient SNS' }))
    await user.click(screen.getByRole('button', { name: 'FC off' }))
    await user.click(screen.getByRole('button', { name: 'SpO2 off' }))
    await user.click(screen.getByRole('button', { name: 'EtCO2 off' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await user.click(screen.getByRole('button', { name: 'Send' }))

    state = useMonitorStore.getState()
    expect(state.confirmedVitalActive.hr).toBe(true)
    expect(state.confirmedVitalActive.spo2).toBe(true)
    expect(state.confirmedVitalActive.etco2).toBe(true)
    expect(state.confirmed.hr).toBe(54)
    expect(state.confirmed.spo2).toBe(78)
    expect(state.confirmed.etco2).toBe(62)
    expect(state.confirmed.spo2_waveform).toBe('normal')
    expect(state.confirmed.etco2_waveform).toBe('normal')
  })

  it('preserves manually active vitals while universal auto-sort changes their values', async () => {
    const user = userEvent.setup()
    useMonitorStore.getState().setDraftVitalActive('hr', true)
    useMonitorStore.getState().setDraftVitalActive('spo2', true)
    useMonitorStore.getState().setDraftVitalActive('etco2', true)
    render(<AdminPage />)

    await user.click(screen.getByRole('button', { name: 'Scenarios' }))
    await user.click(screen.getByRole('button', { name: 'Expand Caller Info' }))
    fireEvent.change(screen.getByLabelText('Auto-sort scenario'), {
      target: {
        value: [
          '### Vitals (Origin)',
          'HR: 54 bpm',
          'SpO2: 78% on room air',
          'BP: 96/58 mmHg',
          'EtCO2: 62 mmHg',
        ].join('\n'),
      },
    })

    await user.click(screen.getByRole('button', { name: 'Save' }))
    await user.click(screen.getByRole('button', { name: 'Send' }))

    const state = useMonitorStore.getState()
    expect(state.confirmed).toMatchObject({ hr: 54, spo2: 78, etco2: 62 })
    expect(state.confirmedVitalActive).toMatchObject({
      hr: true,
      spo2: true,
      bp_sys: false,
      bp_dia: false,
      etco2: true,
    })
    expect(state.confirmed.spo2_waveform).toBe('normal')
    expect(state.confirmed.etco2_waveform).toBe('normal')
  })

  it('updates Patient Physical pulse and respiratory findings from timed vitals buttons', async () => {
    const user = userEvent.setup()
    render(<AdminPage />)

    await user.click(screen.getByRole('button', { name: 'Scenarios' }))
    await user.click(screen.getByRole('button', { name: 'Expand Caller Info' }))
    fireEvent.change(screen.getByLabelText('Auto-sort scenario'), {
      target: {
        value: [
          'Abdomen',
          'Soft',
          '',
          'Treated (+5 min)',
          'Pulse: 106 bpm, Regular, Moderate',
          'SpO2: 98% on O2',
          'BP: 112/70 mmHg',
          'Respirations: 22 breaths/min, Regular, Unlabored',
          'EtCO2: 36 mmHg',
          '',
          'Untreated (+15 min)',
          'Pulse: 136 bpm, Regular, Thready',
          'SpO2: 92% on room air',
          'BP: 76/46 mmHg',
          'Respirations: 30 breaths/min, Irregular, Weak respiratory effort',
          'EtCO2: 26 mmHg',
        ].join('\n'),
      },
    })

    await user.click(screen.getByRole('button', { name: 'Patient Physical' }))
    const abdomen = screen.getByRole('button', { name: 'Front abdomen' })
    await user.click(abdomen)
    expect(abdomen).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: 'Monitor & Patient SNS' }))
    await user.click(screen.getByRole('button', { name: 'T1' }))

    const pulseContext = screen.getByRole('img', { name: 'Pulse findings' }).parentElement
    const respiratoryContext = screen.getByRole('img', {
      name: 'Respiratory findings',
    }).parentElement
    expect(pulseContext).toHaveClass('border-pending-amber')
    expect(respiratoryContext).toHaveClass('border-pending-amber')

    revealSnsOptions('pulse')
    await user.click(screen.getByRole('button', { name: 'Pulse Tap' }))
    expect(screen.getByRole('region', { name: 'Pulse measurement result' })).toHaveTextContent(
      'Rate: 106 bpm',
    )
    expect(screen.getByRole('region', { name: 'Pulse measurement result' })).toHaveTextContent(
      'Strength: Moderate',
    )
    revealSnsOptions('respiratory')
    await user.click(screen.getByRole('button', { name: 'Respiratory Tap' }))
    expect(screen.getByRole('region', { name: 'Respiratory measurement result' })).toHaveTextContent(
      'Respiratory: 22 breaths/min',
    )
    expect(screen.getByRole('region', { name: 'Respiratory measurement result' })).toHaveTextContent(
      'Unlabored',
    )

    await user.click(screen.getByRole('button', { name: 'U3' }))

    expect(screen.getByRole('region', { name: 'Respiratory measurement result' })).toHaveTextContent(
      'Respiratory: 22 breaths/min',
    )
    revealSnsOptions('respiratory')
    await user.click(screen.getByRole('button', { name: 'Respiratory Tap' }))
    expect(screen.queryByRole('region', { name: 'Respiratory measurement result' })).toBeNull()
    revealSnsOptions('respiratory')
    await user.click(screen.getByRole('button', { name: 'Respiratory Tap' }))
    expect(screen.getByRole('region', { name: 'Respiratory measurement result' })).toHaveTextContent(
      'Respiratory: 30 breaths/min',
    )
    expect(screen.getByRole('region', { name: 'Respiratory measurement result' })).toHaveTextContent(
      'Weak respiratory effort',
    )
    revealSnsOptions('pulse')
    await user.click(screen.getByRole('button', { name: 'Pulse Tap' }))
    expect(screen.queryByRole('region', { name: 'Pulse measurement result' })).toBeNull()
    revealSnsOptions('pulse')
    await user.click(screen.getByRole('button', { name: 'Pulse Tap' }))
    expect(screen.getByRole('region', { name: 'Pulse measurement result' })).toHaveTextContent(
      'Rate: 136 bpm',
    )
    expect(screen.getByRole('region', { name: 'Pulse measurement result' })).toHaveTextContent(
      'Strength: Thready',
    )
    await user.click(screen.getByRole('button', { name: 'Patient Physical' }))
    expect(screen.getByRole('button', { name: 'Front abdomen' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('shows Patient Information with independent SAMPLE and OPQRST letter toggles', async () => {
    const user = userEvent.setup()
    render(<AdminPage />)

    await user.click(screen.getByRole('button', { name: 'Monitor & Patient SNS' }))

    expect(screen.getByRole('button', { name: 'Monitor & Patient SNS' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    const sample = screen.getByRole('region', { name: 'Sample' })
    const opqrst = screen.getByRole('region', { name: 'OPQRST' })

    expect(screen.queryByLabelText('Auto-sort patient information')).toBeNull()
    for (const letter of ['S', 'A', 'M', 'P', 'L', 'E']) {
      expect(within(sample).getByRole('button', { name: letter })).toBeInTheDocument()
      expect(within(sample).getByLabelText(`Sample ${letter} information`)).toBeInTheDocument()
    }
    for (const letter of ['O', 'P', 'Q', 'R', 'S', 'T']) {
      expect(within(opqrst).getByRole('button', { name: letter })).toBeInTheDocument()
      expect(within(opqrst).getByLabelText(`OPQRST ${letter} information`)).toBeInTheDocument()
    }

    const sampleS = within(sample).getByRole('button', { name: 'S' })
    const opqrstS = within(opqrst).getByRole('button', { name: 'S' })
    await user.click(sampleS)

    expect(sampleS).toHaveAttribute('aria-pressed', 'true')
    expect(sampleS).toHaveClass('bg-ecg-green')
    expect(opqrstS).toHaveAttribute('aria-pressed', 'false')

    await user.click(sampleS)
    expect(sampleS).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps Patient Information selections and text while switching admin tabs', async () => {
    const user = userEvent.setup()
    render(<AdminPage />)

    await user.click(screen.getByRole('button', { name: 'Monitor & Patient SNS' }))
    const sampleS = within(screen.getByRole('region', { name: 'Sample' })).getByRole(
      'button',
      { name: 'S' },
    )
    await user.click(sampleS)
    await user.type(screen.getByLabelText('Sample S information'), 'Chest pain')
    await user.type(screen.getByLabelText('OPQRST O information'), '20 minutes')

    await user.click(screen.getByRole('button', { name: 'Scenarios' }))
    await user.click(screen.getByRole('button', { name: 'Monitor & Patient SNS' }))

    expect(
      within(screen.getByRole('region', { name: 'Sample' })).getByRole('button', {
        name: 'S',
      }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Sample S information')).toHaveValue('Chest pain')
    expect(screen.getByLabelText('OPQRST O information')).toHaveValue('20 minutes')
  })

  it('does not render the shared Reset control on any standalone admin tab', async () => {
    const user = userEvent.setup()
    render(<AdminPage />)

    expect(screen.queryByRole('button', { name: 'Reset' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Monitor & Patient SNS' }))
    expect(screen.queryByRole('button', { name: 'Reset' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Patient Physical' }))
    expect(screen.queryByRole('button', { name: 'Reset' })).toBeNull()
  })

  it('shows Patient Physical with selectable front and rear body regions', async () => {
    const user = userEvent.setup()
    render(<AdminPage />)

    await user.click(screen.getByRole('button', { name: 'Patient Physical' }))

    expect(screen.getByRole('button', { name: 'Patient Physical' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByAltText('Front and back body outline')).toBeInTheDocument()

    const frontHead = screen.getByRole('button', { name: 'Front head' })
    const frontTrunk = screen.getByRole('button', { name: 'Front trunk' })
    const rearBack = screen.getByRole('button', { name: 'Rear back' })
    const rearTrunk = screen.getByRole('button', { name: 'Rear trunk' })
    const frontLeftShoulder = screen.getByRole('button', {
      name: 'Front patient left shoulder',
    })
    const frontRightShoulder = screen.getByRole('button', {
      name: 'Front patient right shoulder',
    })

    await user.click(frontHead)
    await user.click(frontTrunk)
    await user.click(rearBack)
    await user.click(frontLeftShoulder)

    expect(frontHead).toHaveAttribute('aria-pressed', 'true')
    expect(frontHead).toHaveClass('bg-ecg-green/45')
    expect(frontTrunk).toHaveAttribute('aria-pressed', 'true')
    expect(rearBack).toHaveAttribute('aria-pressed', 'true')
    expect(rearTrunk).toHaveAttribute('aria-pressed', 'false')
    expect(frontLeftShoulder).toHaveAttribute('aria-pressed', 'true')
    expect(frontRightShoulder).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps Patient Physical and moved SNS selections while switching tabs', async () => {
    const user = userEvent.setup()
    render(<AdminPage />)

    await user.click(screen.getByRole('button', { name: 'Expand Caller Info' }))
    fireEvent.change(screen.getByLabelText('Auto-sort scenario'), {
      target: {
        value: [
          'Chest / Respiratory',
          'Left anterior chest tenderness',
          'Respiratory Rate: 24 breaths/min',
          'Pulse Rate: 112 bpm',
          'Skin / Extremities',
          'Pale',
          'Cool',
          'Scene / Environment',
          'Witnessed fall',
          'Approximately 12 wooden stairs',
        ].join('\n'),
      },
    })
    await user.click(screen.getByRole('button', { name: 'Patient Physical' }))
    await user.click(screen.getByRole('button', { name: 'Front patient left upper arm' }))
    await user.click(screen.getByRole('button', { name: 'Rear back' }))
    const frontChest = screen.getByRole('button', { name: 'Front chest' })
    const sceneEnvironment = screen.getByRole('button', { name: 'Scene/Environment' })

    expect(frontChest).toHaveClass('border-pending-amber')
    expect(sceneEnvironment).toHaveClass('border-pending-amber')
    expect(screen.queryByRole('heading', { name: 'Respiratory' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Skin/Extremities' })).toBeNull()
    await user.click(frontChest)
    await user.click(sceneEnvironment)

    await user.click(screen.getByRole('button', { name: 'Monitor & Patient SNS' }))
    const respiratory = screen.getByRole('img', { name: 'Respiratory findings' })
    const skinExtremities = screen.getByRole('button', { name: 'Skin/Extremities' })
    expect(respiratory.parentElement).toHaveClass('border-pending-amber')
    expect(skinExtremities).toHaveClass('border-pending-amber')
    revealSnsOptions('respiratory')
    await user.click(screen.getByRole('button', { name: 'Respiratory Tap' }))
    expect(screen.getByRole('region', { name: 'Respiratory measurement result' })).toHaveTextContent(
      'Respiratory: 24 breaths/min',
    )
    await user.click(skinExtremities)
    expect(screen.getByRole('region', { name: 'Skin/Extremities finding slider' })).toHaveTextContent(
      'Pale',
    )

    await user.click(screen.getByRole('button', { name: 'Patient Physical' }))
    expect(screen.getByRole('button', { name: 'Front chest' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Scene/Environment' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await user.click(screen.getByRole('button', { name: 'Scene/Environment' }))
    expect(screen.getByRole('region', { name: 'Scene/Environment finding slider' })).toHaveTextContent(
      'Witnessed fall',
    )
    expect(screen.getByRole('button', { name: 'Front patient left upper arm' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Rear back' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('auto-sorts Patient Information text without changing green selections', async () => {
    const user = userEvent.setup()
    render(<AdminPage />)

    await user.click(screen.getByRole('button', { name: 'Scenarios' }))
    await user.click(screen.getByRole('button', { name: 'Expand Caller Info' }))
    await user.type(
      screen.getByLabelText('Auto-sort scenario'),
      [
        'S: Chest pain',
        'P: Asthma',
        'O: 20 minutes',
        'P: Worse breathing',
        'S: 8/10',
      ].join('\n'),
    )
    await user.click(screen.getByRole('button', { name: 'Monitor & Patient SNS' }))

    expect(screen.getByLabelText('Sample S information')).toHaveValue('Chest pain')
    expect(screen.getByLabelText('Sample P information')).toHaveValue('Asthma')
    expect(screen.getByLabelText('OPQRST O information')).toHaveValue('20 minutes')
    expect(screen.getByLabelText('OPQRST P information')).toHaveValue('Worse breathing')
    expect(screen.getByLabelText('OPQRST S information')).toHaveValue('8/10')
    expect(
      within(screen.getByRole('region', { name: 'Sample' })).getByRole('button', {
        name: 'S',
      }),
    ).toHaveAttribute('aria-pressed', 'false')
  })

  it('preserves monitor state because the combined tab has no Reset control', async () => {
    const user = userEvent.setup()
    act(() => {
      useMonitorStore.getState().setDraft('hr', 180)
      useMonitorStore.getState().save()
      useMonitorStore.getState().setCallerInfoDraft('address', '123 Rue Principale')
      useMonitorStore.getState().save()
      useMonitorStore.getState().send()
      useMonitorStore.getState().startEtco2Calibration()
      useMonitorStore.getState().completeEtco2Calibration()
    })

    render(<AdminPage />)
    await user.click(screen.getByRole('button', { name: 'Monitor & Patient SNS' }))
    expect(screen.getByTestId('admin-etco2-calibration-indicator')).toHaveAttribute(
      'data-calibrated',
      'true',
    )

    const s = useMonitorStore.getState()
    expect(screen.queryByRole('button', { name: 'Reset' })).toBeNull()
    expect(s.confirmed.hr).toBe(180)
    expect(s.etco2CalibrationStatus).toBe('calibrated')
    expect(screen.getByTestId('admin-etco2-calibration-indicator')).toHaveAttribute(
      'data-calibrated',
      'true',
    )
    expect(s.callerInfoConfirmed.address).toBe('123 Rue Principale')
    expect(s.dispatch.armed).toBe(true)
  })

  it('preserves scenario authoring state because Scenarios has no Reset control', async () => {
    const user = userEvent.setup()

    render(<AdminPage />)
    await user.click(screen.getByRole('button', { name: 'Scenarios' }))
    await user.click(screen.getByRole('button', { name: 'Expand Caller Info' }))
    fireEvent.change(screen.getByLabelText('Auto-sort scenario'), {
      target: {
        value: [
          'ADDRESS: 123 Rue Principale',
          '### Vitals (Origin)',
          'HR: 180 bpm',
          'S: Chest pain',
          'Chest / Respiratory',
          'Left anterior chest tenderness',
        ].join('\n'),
      },
    })
    expect(useMonitorStore.getState().draft.hr).toBe(180)
    expect(useMonitorStore.getState().callerInfoDraft.address).toBe('123 Rue Principale')
    act(() => {
      useMonitorStore.getState().startEtco2Calibration()
      useMonitorStore.getState().completeEtco2Calibration()
    })

    const s = useMonitorStore.getState()
    expect(screen.queryByRole('button', { name: 'Reset' })).toBeNull()
    expect(s.draft.hr).toBe(180)
    expect(s.callerInfoDraft.address).toBe('123 Rue Principale')
    expect(s.etco2CalibrationStatus).toBe('calibrated')
    expect(screen.getByLabelText('Auto-sort scenario')).not.toHaveValue('')

    await user.click(screen.getByRole('button', { name: 'Monitor & Patient SNS' }))
    expect(screen.getByLabelText('Sample S information')).toHaveValue('Chest pain')

    await user.click(screen.getByRole('button', { name: 'Patient Physical' }))
    expect(screen.getByRole('button', { name: 'Front chest' })).toHaveClass(
      'border-pending-amber',
    )
  })

  it('stages SpO2 and EtCO2 graph state through the left vital toggles', async () => {
    const user = userEvent.setup()
    render(<AdminPage />)
    await user.click(screen.getByRole('button', { name: 'Monitor & Patient SNS' }))

    await user.click(within(screen.getByRole('heading', { name: 'ECG' }).closest('section')!).getByRole('button', { name: 'NSR (Off)' }))
    await user.click(within(screen.getByRole('heading', { name: 'ECG' }).closest('section')!).getByRole('button', { name: 'Cardiac Arrest' }))
    await user.click(within(screen.getByRole('heading', { name: 'ECG' }).closest('section')!).getByRole('button', { name: 'VF' }))
    await user.click(screen.getByRole('button', { name: 'SpO2 off' }))
    await user.click(screen.getByRole('button', { name: 'EtCO2 off' }))

    expect(useMonitorStore.getState().draft.rhythm).toBe('vf')
    expect(useMonitorStore.getState().draft.spo2_waveform).toBe('normal')
    expect(useMonitorStore.getState().draft.etco2_waveform).toBe('normal')
    expect(useMonitorStore.getState().draftVitalActive.spo2).toBe(true)
    expect(useMonitorStore.getState().draftVitalActive.etco2).toBe(true)
    expect(useMonitorStore.getState().draftVitalsActive).toBe(true)
    expect(screen.getByTestId('status-rhythm')).toHaveTextContent('-')
    expect(screen.getByTestId('status-spo2')).toHaveAttribute('data-status', 'dirty')
    expect(screen.getByTestId('status-etco2')).toHaveAttribute('data-status', 'dirty')
  })

  it('sends SpO2 and EtCO2 graph on/off state from the left vital toggles', async () => {
    const user = userEvent.setup()
    render(<AdminPage />)
    await user.click(screen.getByRole('button', { name: 'Monitor & Patient SNS' }))

    await user.click(screen.getByRole('button', { name: 'SpO2 off' }))
    await user.click(screen.getByRole('button', { name: 'EtCO2 off' }))
    expect(useMonitorStore.getState().confirmed.spo2_waveform).toBe('off')
    expect(useMonitorStore.getState().confirmed.etco2_waveform).toBe('off')

    await user.click(screen.getByRole('button', { name: 'Save' }))
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(useMonitorStore.getState().confirmedVitalActive.spo2).toBe(true)
    expect(useMonitorStore.getState().confirmed.spo2_waveform).toBe('normal')
    expect(useMonitorStore.getState().confirmedVitalActive.etco2).toBe(true)
    expect(useMonitorStore.getState().confirmed.etco2_waveform).toBe('normal')

    await user.click(screen.getByRole('button', { name: 'SpO2 on' }))
    await user.click(screen.getByRole('button', { name: 'EtCO2 on' }))
    expect(useMonitorStore.getState().confirmed.spo2_waveform).toBe('normal')
    expect(useMonitorStore.getState().confirmed.etco2_waveform).toBe('normal')

    await user.click(screen.getByRole('button', { name: 'Save' }))
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(useMonitorStore.getState().confirmedVitalActive.spo2).toBe(false)
    expect(useMonitorStore.getState().confirmed.spo2_waveform).toBe('off')
    expect(useMonitorStore.getState().confirmedVitalActive.etco2).toBe(false)
    expect(useMonitorStore.getState().confirmed.etco2_waveform).toBe('off')
  })
})
