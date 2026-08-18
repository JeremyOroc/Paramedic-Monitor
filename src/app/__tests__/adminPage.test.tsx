import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { useMonitorStore } from '@/store/monitorStore'

import AdminPage from '../admin/page'

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
  ScenarioLibraryPanel: () => <section aria-label="Scenarios library">Scenario library</section>,
}))

describe('AdminPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    routerReplace.mockClear()
    useMonitorStore.getState().reset()
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
    await user.click(screen.getByRole('button', { name: 'Monitor' }))

    await user.click(screen.getByRole('button', { name: 'New Attempt' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/api/session/ABC123/attempt', {
        method: 'POST',
        headers: { 'x-session-host-token': 'host_token' },
      }),
    )
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
    vi.spyOn(window, 'fetch').mockImplementation(async (input) => {
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

    // Load the previous run's scenario onto the instructor side.
    act(() => {
      useMonitorStore.getState().setDraft('rhythm', 'vf')
      useMonitorStore.getState().save()
      useMonitorStore.getState().send()
      useMonitorStore.getState().setCprMode('weak')
    })
    expect(useMonitorStore.getState().confirmed.rhythm).toBe('vf')
    expect(useMonitorStore.getState().cprMode).toBe('weak')
    const versionBefore = useMonitorStore.getState().monitorResetVersion

    await user.click(screen.getByRole('button', { name: 'New Attempt' }))

    // Without the reset this stayed 'vf' and was pushed back onto trainees who
    // had just been hard-reset by the attempt bump.
    await waitFor(() => {
      expect(useMonitorStore.getState().confirmed.rhythm).toBe('off')
    })
    expect(useMonitorStore.getState().draft.rhythm).toBe('off')
    expect(useMonitorStore.getState().cprMode).toBe('off')
    // The bumped reset version is what propagates the clear to students.
    expect(useMonitorStore.getState().monitorResetVersion).toBeGreaterThan(versionBefore)
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
    await user.click(screen.getByRole('button', { name: 'Monitor' }))

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

  it('pushes session state immediately when Reset is clicked', async () => {
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
    const versionBefore = useMonitorStore.getState().monitorResetVersion

    render(<AdminPage session={{ code: 'ABC123', hostToken: 'host_token' }} />)
    await waitFor(() => expect(screen.getByText('active')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Reset' }))

    await waitFor(() => {
      const statePosts = fetchMock.mock.calls.filter(
        ([url, init]) => String(url).endsWith('/state') && init?.method === 'POST',
      )
      expect(statePosts).toHaveLength(1)
      const posted = JSON.parse(String(statePosts[0][1]?.body))
      expect(posted.state.monitorResetVersion).toBe(versionBefore + 1)
    })
  })

  it('shows Scenarios first and by default, with Monitor in the next tab', async () => {
    const user = userEvent.setup()
    render(<AdminPage />)

    expect(screen.getByRole('button', { name: 'Scenarios' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Patient Information' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Patient Physical' })).toBeInTheDocument()
    expect(screen.getByLabelText('Scenarios library')).toBeInTheDocument()
    expect(screen.getByLabelText('Scenario title')).toBeInTheDocument()
    expect(screen.getByLabelText('Auto-sort scenario')).toBeInTheDocument()
    expect(screen.getByLabelText('Adresse')).toBeInTheDocument()
    expect(screen.queryByText('Vitals')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Monitor' }))

    expect(screen.getByRole('button', { name: 'Monitor' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Vitals')).toBeInTheDocument()
    expect(screen.queryByLabelText('Auto-sort vitals')).toBeNull()
    expect(within(screen.getByTestId('admin-graph-row-ecg')).getByRole('button', { name: 'ECG off' })).toBeInTheDocument()
    expect(screen.queryByTestId('admin-graph-row-spo2')).not.toBeInTheDocument()
    expect(screen.queryByTestId('admin-graph-row-etco2')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'SpO2 off' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'EtCO2 off' })).toBeInTheDocument()
    expect(screen.getByTestId('admin-etco2-calibration-indicator')).toHaveAttribute(
      'data-calibrated',
      'false',
    )
    expect(screen.queryByLabelText('Adresse')).toBeNull()
  })

  it('uses the Caller Info auto-sort scenario box to populate all admin sections', async () => {
    const user = userEvent.setup()
    render(<AdminPage />)

    await user.click(screen.getByRole('button', { name: 'Scenarios' }))
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

    await user.click(screen.getByRole('button', { name: 'Patient Information' }))
    expect(screen.getByLabelText('Sample S information')).toHaveValue('Opioid use disorder')
    expect(screen.getByLabelText('Sample M information')).toHaveValue('Methadone, Sertraline')
    expect(screen.getByLabelText('OPQRST O information')).toHaveValue(
      'Gradual decline after opioid use',
    )

    await user.click(screen.getByRole('button', { name: 'Patient Physical' }))
    expect(screen.getByRole('button', { name: 'Front chest' })).toHaveClass(
      'border-pending-amber',
    )
    expect(screen.getByRole('button', { name: 'Front abdomen' })).toHaveClass(
      'border-pending-amber',
    )
    expect(screen.getByRole('button', { name: 'Skin/Extremities' })).toHaveClass(
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

    await user.click(screen.getByRole('button', { name: 'Monitor' }))
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

    await user.click(screen.getByRole('button', { name: 'Monitor' }))
    await user.click(screen.getByRole('button', { name: 'T1' }))

    await user.click(screen.getByRole('button', { name: 'Patient Physical' }))
    const pulse = screen.getByRole('button', { name: 'Pulse' })
    const respiratory = screen.getByRole('button', { name: 'Respiratory' })
    expect(pulse).toHaveClass('border-pending-amber')
    expect(respiratory).toHaveClass('border-pending-amber')
    expect(abdomen).toHaveAttribute('aria-pressed', 'true')

    await user.click(pulse)
    expect(screen.getByRole('region', { name: 'Pulse finding slider' })).toHaveTextContent(
      'Rate: 106 bpm',
    )
    expect(screen.getByRole('region', { name: 'Pulse finding slider' })).toHaveTextContent(
      'Strength: Moderate',
    )
    await user.click(respiratory)
    expect(screen.getByRole('region', { name: 'Respiratory finding slider' })).toHaveTextContent(
      'Rate: 22 breaths/min',
    )
    expect(screen.getByRole('region', { name: 'Respiratory finding slider' })).toHaveTextContent(
      'Strength: Unlabored',
    )

    await user.click(screen.getByRole('button', { name: 'Monitor' }))
    await user.click(screen.getByRole('button', { name: 'U3' }))
    await user.click(screen.getByRole('button', { name: 'Patient Physical' }))

    expect(screen.getByRole('region', { name: 'Respiratory finding slider' })).toHaveTextContent(
      'Rate: 30 breaths/min',
    )
    expect(screen.getByRole('region', { name: 'Respiratory finding slider' })).toHaveTextContent(
      'Strength: Weak respiratory effort',
    )
    await user.click(screen.getByRole('button', { name: 'Pulse' }))
    expect(screen.getByRole('region', { name: 'Pulse finding slider' })).toHaveTextContent(
      'Rate: 136 bpm',
    )
    expect(screen.getByRole('region', { name: 'Pulse finding slider' })).toHaveTextContent(
      'Strength: Thready',
    )
    expect(screen.getByRole('button', { name: 'Front abdomen' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('shows Patient Information with independent SAMPLE and OPQRST letter toggles', async () => {
    const user = userEvent.setup()
    render(<AdminPage />)

    await user.click(screen.getByRole('button', { name: 'Patient Information' }))

    expect(screen.getByRole('button', { name: 'Patient Information' })).toHaveAttribute(
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

    await user.click(screen.getByRole('button', { name: 'Patient Information' }))
    const sampleS = within(screen.getByRole('region', { name: 'Sample' })).getByRole(
      'button',
      { name: 'S' },
    )
    await user.click(sampleS)
    await user.type(screen.getByLabelText('Sample S information'), 'Chest pain')
    await user.type(screen.getByLabelText('OPQRST O information'), '20 minutes')

    await user.click(screen.getByRole('button', { name: 'Monitor' }))
    await user.click(screen.getByRole('button', { name: 'Patient Information' }))

    expect(
      within(screen.getByRole('region', { name: 'Sample' })).getByRole('button', {
        name: 'S',
      }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Sample S information')).toHaveValue('Chest pain')
    expect(screen.getByLabelText('OPQRST O information')).toHaveValue('20 minutes')
  })

  it('uses the Patient Information tab Reset to clear only local checklist selections and text', async () => {
    const user = userEvent.setup()
    act(() => {
      useMonitorStore.getState().setDraft('hr', 180)
      useMonitorStore.getState().setCallerInfoDraft('address', '123 Rue Principale')
    })

    render(<AdminPage />)
    await user.click(screen.getByRole('button', { name: 'Patient Information' }))
    const sampleS = within(screen.getByRole('region', { name: 'Sample' })).getByRole(
      'button',
      { name: 'S' },
    )
    await user.click(sampleS)
    await user.type(screen.getByLabelText('Sample S information'), 'Chest pain')
    await user.type(screen.getByLabelText('OPQRST O information'), '20 minutes')

    await user.click(screen.getByRole('button', { name: 'Reset' }))

    expect(sampleS).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByLabelText('Sample S information')).toHaveValue('')
    expect(screen.getByLabelText('OPQRST O information')).toHaveValue('')
    expect(useMonitorStore.getState().draft.hr).toBe(180)
    expect(useMonitorStore.getState().callerInfoDraft.address).toBe('123 Rue Principale')
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

  it('keeps and resets Patient Physical selections locally', async () => {
    const user = userEvent.setup()
    act(() => {
      useMonitorStore.getState().setDraft('hr', 180)
    })

    render(<AdminPage />)

    await user.click(screen.getByRole('button', { name: 'Scenarios' }))
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

    await user.click(screen.getByRole('button', { name: 'Monitor' }))
    await user.click(screen.getByRole('button', { name: 'Patient Physical' }))

    const frontChest = screen.getByRole('button', { name: 'Front chest' })
    const respiratory = screen.getByRole('button', { name: 'Respiratory' })
    const skinExtremities = screen.getByRole('button', { name: 'Skin/Extremities' })
    const sceneEnvironment = screen.getByRole('button', { name: 'Scene/Environment' })

    expect(screen.queryByLabelText('Auto-sort patient physical')).toBeNull()
    expect(frontChest).toHaveClass('border-pending-amber')
    expect(respiratory).toHaveClass('border-pending-amber')
    expect(skinExtremities).toHaveClass('border-pending-amber')
    expect(sceneEnvironment).toHaveClass('border-pending-amber')
    expect(screen.getByLabelText('Selected body parts')).not.toHaveTextContent(
      'Left anterior chest tenderness',
    )
    await user.click(frontChest)
    expect(frontChest).toHaveClass('border-ecg-green')
    expect(screen.getByLabelText('Selected body parts')).toHaveTextContent(
      'Left anterior chest tenderness',
    )
    await user.click(respiratory)
    expect(respiratory).toHaveClass('border-ecg-green')
    expect(screen.getByRole('region', { name: 'Respiratory finding slider' })).toHaveTextContent(
      'Rate: 24 breaths/min',
    )
    await user.click(skinExtremities)
    expect(skinExtremities).toHaveClass('border-ecg-green')
    expect(screen.getByRole('region', { name: 'Skin/Extremities finding slider' })).toHaveTextContent(
      'Pale',
    )
    expect(screen.getByRole('region', { name: 'Skin/Extremities finding slider' })).toHaveTextContent(
      'Cool',
    )
    await user.click(sceneEnvironment)
    expect(sceneEnvironment).toHaveClass('border-ecg-green')
    expect(screen.getByRole('region', { name: 'Scene/Environment finding slider' })).toHaveTextContent(
      'Witnessed fall',
    )
    expect(screen.getByRole('region', { name: 'Scene/Environment finding slider' })).toHaveTextContent(
      'Approximately 12 wooden stairs',
    )
    expect(screen.getByRole('button', { name: 'Front patient left upper arm' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Rear back' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await user.click(screen.getByRole('button', { name: 'Reset' }))

    expect(screen.getByRole('button', { name: 'Front patient left upper arm' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByRole('button', { name: 'Rear back' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(frontChest).not.toHaveClass('border-pending-amber')
    expect(respiratory).not.toHaveClass('border-pending-amber')
    expect(skinExtremities).not.toHaveClass('border-pending-amber')
    expect(sceneEnvironment).not.toHaveClass('border-pending-amber')
    expect(respiratory).toHaveAttribute('aria-pressed', 'false')
    expect(skinExtremities).toHaveAttribute('aria-pressed', 'false')
    expect(sceneEnvironment).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('region', { name: 'Respiratory finding slider' })).toBeNull()
    expect(screen.queryByRole('region', { name: 'Skin/Extremities finding slider' })).toBeNull()
    expect(screen.queryByRole('region', { name: 'Scene/Environment finding slider' })).toBeNull()
    expect(screen.getByLabelText('Selected body parts')).not.toHaveTextContent(
      'Left anterior chest tenderness',
    )
    expect(useMonitorStore.getState().draft.hr).toBe(112)
  })

  it('auto-sorts Patient Information text without changing green selections', async () => {
    const user = userEvent.setup()
    render(<AdminPage />)

    await user.click(screen.getByRole('button', { name: 'Scenarios' }))
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
    await user.click(screen.getByRole('button', { name: 'Patient Information' }))

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

  it('uses the Monitor tab Reset to clear only monitor vitals', async () => {
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
    await user.click(screen.getByRole('button', { name: 'Monitor' }))
    expect(screen.getByTestId('admin-etco2-calibration-indicator')).toHaveAttribute(
      'data-calibrated',
      'true',
    )

    await user.click(screen.getByRole('button', { name: 'Reset' }))

    const s = useMonitorStore.getState()
    expect(s.confirmedVitalsActive).toBe(false)
    expect(s.confirmed.hr).toBe(0)
    expect(s.confirmed.rhythm).toBe('off')
    expect(s.confirmed.spo2_waveform).toBe('off')
    expect(s.confirmed.etco2_waveform).toBe('off')
    expect(s.etco2CalibrationStatus).toBe('idle')
    expect(screen.getByTestId('admin-etco2-calibration-indicator')).toHaveAttribute(
      'data-calibrated',
      'false',
    )
    expect(s.callerInfoConfirmed.address).toBe('123 Rue Principale')
    expect(s.dispatch.armed).toBe(true)
  })

  it('uses the Caller Info tab Reset to clear the full drill and universal auto-sort state', async () => {
    const user = userEvent.setup()

    render(<AdminPage />)
    await user.click(screen.getByRole('button', { name: 'Scenarios' }))
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

    await user.click(screen.getByRole('button', { name: 'Reset' }))

    const s = useMonitorStore.getState()
    expect(s.confirmedVitalsActive).toBe(false)
    expect(s.confirmed.rhythm).toBe('off')
    expect(s.callerInfoConfirmed.address).toBe('')
    expect(s.dispatch.armed).toBe(false)
    expect(s.etco2CalibrationStatus).toBe('idle')
    expect(screen.getByLabelText('Auto-sort scenario')).toHaveValue('')

    await user.click(screen.getByRole('button', { name: 'Patient Information' }))
    expect(screen.getByLabelText('Sample S information')).toHaveValue('')

    await user.click(screen.getByRole('button', { name: 'Patient Physical' }))
    expect(screen.getByRole('button', { name: 'Front chest' })).not.toHaveClass(
      'border-pending-amber',
    )
  })

  it('stages SpO2 and EtCO2 graph state through the left vital toggles', async () => {
    const user = userEvent.setup()
    render(<AdminPage />)
    await user.click(screen.getByRole('button', { name: 'Monitor' }))

    await user.click(within(screen.getByRole('heading', { name: 'ECG' }).closest('section')!).getByRole('button', { name: 'Rhythm Options' }))
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
    await user.click(screen.getByRole('button', { name: 'Monitor' }))

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
