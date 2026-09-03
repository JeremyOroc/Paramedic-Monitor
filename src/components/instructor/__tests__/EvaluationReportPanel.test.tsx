import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { EvaluationReportPanel } from '../EvaluationReportPanel'
import type {
  ParticipantAttempt,
  SessionStateHistoryEntry,
  StudentEvent,
} from '@/types/session'

const START = '2026-09-02T14:00:00.000Z'
const startMs = Date.parse(START)

const at = (seconds: number) => new Date(startMs + seconds * 1000).toISOString()

const PARTICIPANTS = [{ id: 'student-1', nickname: 'Sarah M.' }]

const ATTEMPTS: ParticipantAttempt[] = [
  { participant_id: 'student-1', attempt_version: 1, started_at: START, completed_at: null },
]

function makeEvent(overrides: Partial<StudentEvent> = {}): StudentEvent {
  return {
    id: `event-${overrides.occurred_at ?? Math.random()}`,
    session_id: 'session-1',
    participant_id: 'student-1',
    attempt_version: 1,
    kind: 'acknowledge',
    label: 'Acknowledge',
    payload: {},
    occurred_at: at(0),
    state_version: null,
    ...overrides,
  }
}

function state(
  version: number,
  seconds: number,
  confirmed: Record<string, unknown>,
  extra: Record<string, unknown> = {},
): SessionStateHistoryEntry {
  return {
    version,
    attempt_version: 1,
    applied_at: at(seconds),
    state: {
      confirmed: { rhythm: 'nsr', hr: 88, bp_sys: 118, bp_dia: 76, spo2: 97, etco2: 35, ...confirmed },
      confirmedVitalActive: { hr: true, bp_sys: true, bp_dia: true, spo2: true, etco2: false },
      ...extra,
    },
  }
}

function renderPanel(props: Partial<React.ComponentProps<typeof EvaluationReportPanel>> = {}) {
  return render(
    <EvaluationReportPanel
      events={[]}
      stateHistory={[]}
      attempts={ATTEMPTS}
      participants={PARTICIPANTS}
      attemptVersion={1}
      {...props}
    />,
  )
}

describe('EvaluationReportPanel', () => {
  it('renders each action in order with its offset, kind, detail and patient state', () => {
    renderPanel({
      stateHistory: [state(1, 0, {})],
      events: [
        makeEvent({ kind: 'power_on', label: 'Power On', occurred_at: at(260), state_version: 1 }),
        makeEvent({
          kind: 'nibp_result',
          label: 'NIBP 82/48',
          payload: { bp_sys: 82, bp_dia: 48 },
          occurred_at: at(279),
          state_version: 1,
        }),
      ],
    })

    const rows = screen.getAllByTestId('report-row-action')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('t+4:20')
    expect(rows[0]).toHaveTextContent('power_on')
    expect(rows[1]).toHaveTextContent('t+4:39')
    expect(rows[1]).toHaveTextContent('{bp_sys: 82, bp_dia: 48}')
    expect(rows[1]).toHaveTextContent('NSR 88')
    expect(rows[1]).toHaveTextContent('BP 118/76')
  })

  it('shows an action taken before the first Send as dispatch', () => {
    renderPanel({ events: [makeEvent({ state_version: null })] })

    expect(screen.getByTestId('report-row-action')).toHaveTextContent('[dispatch]')
  })

  it('marks a row whose patient was in alarm and leaves a stable one unmarked', () => {
    renderPanel({
      stateHistory: [state(1, 0, {}), state(2, 100, { spo2: 84 })],
      events: [
        makeEvent({ occurred_at: at(10), state_version: 1 }),
        makeEvent({ occurred_at: at(110), state_version: 2 }),
      ],
    })

    const [stable, alarming] = screen.getAllByTestId('report-row-action')
    expect(stable).not.toHaveAttribute('data-alarm')
    expect(stable).toHaveClass('border-l-transparent')
    expect(alarming).toHaveAttribute('data-alarm', 'true')
    expect(alarming).toHaveClass('border-l-alarm-red')
    expect(within(alarming).getByText(/SpO2 84/)).toHaveClass('text-alarm-red')
  })

  it('distinguishes an instructor change and names what moved', () => {
    renderPanel({
      stateHistory: [state(1, 0, {}), state(2, 276, { rhythm: 'vf', hr: 112 })],
      events: [makeEvent({ occurred_at: at(271), state_version: 1 })],
    })

    const instructorRows = screen.getAllByTestId('report-row-instructor')
    expect(instructorRows[0]).toHaveTextContent('scenario sent')
    expect(instructorRows[1]).toHaveTextContent('rhythm NSR → VF')
    expect(instructorRows[1]).toHaveTextContent('HR 88 → 112')
  })

  it('places an instructor change between the actions it separates', () => {
    renderPanel({
      stateHistory: [state(1, 0, {}), state(2, 276, { rhythm: 'vf', hr: 112 })],
      events: [
        makeEvent({ kind: 'nibp_start', label: 'NIBP Start', occurred_at: at(271), state_version: 1 }),
        makeEvent({ kind: 'medication', label: 'Epinephrine', occurred_at: at(302), state_version: 2 }),
      ],
    })

    const rendered = screen
      .getAllByTestId(/report-row-/)
      .map((row) => row.textContent ?? '')
    expect(rendered[1]).toContain('nibp_start')
    expect(rendered[2]).toContain('Instructor')
    expect(rendered[3]).toContain('"Epinephrine"')
  })

  it('names the scenario on the opening row when the instructor titled it', () => {
    renderPanel({
      stateHistory: [state(1, 0, {}, { scenarioTitleConfirmed: 'Fall from ladder' })],
    })

    expect(screen.getByTestId('report-row-instructor')).toHaveTextContent(
      'scenario sent — "Fall from ladder"',
    )
  })

  it('falls back to a plain opening row for an untitled scenario', () => {
    renderPanel({ stateHistory: [state(1, 0, {})] })

    const opening = screen.getByTestId('report-row-instructor')
    expect(opening).toHaveTextContent('scenario sent')
    expect(opening).not.toHaveTextContent('—')
  })

  it('copies the scenario name with the stream', async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
    renderPanel({ stateHistory: [state(1, 0, {}, { scenarioTitleConfirmed: 'Fall from ladder' })] })

    await user.click(screen.getByRole('button', { name: 'Copy' }))

    expect(writeText.mock.calls[0][0]).toContain('scenario sent — "Fall from ladder"')
  })

  it('warns that patient context is unavailable when no state was recorded', () => {
    renderPanel({ events: [makeEvent({ state_version: null })] })

    expect(screen.getByTestId('evaluation-report-no-context')).toBeInTheDocument()
  })

  it('says the record is partial when the review was truncated', () => {
    renderPanel({ events: [makeEvent({})], truncated: true })

    expect(screen.getByTestId('evaluation-report-truncated')).toHaveTextContent('partial')
  })

  it('reports an attempt with nothing recorded rather than rendering an empty table', () => {
    renderPanel({})

    expect(screen.queryByTestId('evaluation-report-rows')).not.toBeInTheDocument()
    expect(screen.getByText('Nothing recorded for this attempt yet.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy' })).toBeDisabled()
  })

  it('copies the stream as plain text', async () => {
    const user = userEvent.setup()
    // setup() installs its own clipboard stub, so spy on that rather than
    // replacing the property it just defined.
    const writeText = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue(undefined)

    renderPanel({
      stateHistory: [state(1, 0, {})],
      events: [
        makeEvent({ kind: 'medication', label: 'Epinephrine', occurred_at: at(302), state_version: 1 }),
      ],
    })

    await user.click(screen.getByRole('button', { name: 'Copy' }))

    const copied = writeText.mock.calls[0][0] as string
    expect(copied).toContain('t+5:02')
    expect(copied).toContain('"Epinephrine"')
    expect(copied).toContain('NSR 88')
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })

  it('asks for another attempt when the evaluator selects one', async () => {
    const onAttemptVersionChange = vi.fn()
    const user = userEvent.setup()

    renderPanel({
      attemptVersion: 2,
      attempts: [
        ...ATTEMPTS,
        { participant_id: 'student-1', attempt_version: 2, started_at: at(600), completed_at: null },
      ],
      onAttemptVersionChange,
    })

    await user.selectOptions(screen.getByRole('combobox'), '1')
    expect(onAttemptVersionChange).toHaveBeenCalledWith(1)
  })

  it('names each trainee once a second one is in the room', () => {
    renderPanel({
      participants: [...PARTICIPANTS, { id: 'student-2', nickname: 'Dev K.' }],
      events: [
        makeEvent({ occurred_at: at(10) }),
        makeEvent({ participant_id: 'student-2', occurred_at: at(14) }),
      ],
    })

    const rows = screen.getAllByTestId('report-row-action')
    expect(rows[0]).toHaveTextContent('Sarah M.')
    expect(rows[1]).toHaveTextContent('Dev K.')
  })
})
