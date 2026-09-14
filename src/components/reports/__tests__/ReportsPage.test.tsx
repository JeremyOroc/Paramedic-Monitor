import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ReportsPage } from '../ReportsPage'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))

const SUMMARY = {
  id: '51000000-0000-4000-8000-000000000001',
  source_room_code: 'ABC234',
  attempt_version: 2,
  attempt_label: 'Morning',
  scenario_name: 'Cardiac arrest',
  defibrillator_model: 'wagamiZ' as const,
  student_names: ['Alice'],
  status: 'incomplete' as const,
  completion_method: null,
  started_at: '2026-09-07T14:00:00.000Z',
  completed_at: null,
  created_at: '2026-09-07T14:00:00.000Z',
  updated_at: '2026-09-07T14:00:00.000Z',
  deletion_blocked: false,
}

const SECOND = {
  ...SUMMARY,
  id: '51000000-0000-4000-8000-000000000002',
  attempt_version: 3,
  attempt_label: 'Afternoon',
  scenario_name: 'Stroke',
  status: 'complete' as const,
}

const ACTIVE = {
  ...SUMMARY,
  id: '51000000-0000-4000-8000-000000000003',
  attempt_version: 4,
  attempt_label: 'Live cohort',
  scenario_name: 'Active trauma',
  deletion_blocked: true,
}

const DETAIL = {
  ...SUMMARY,
  owner_user_id: 'user-1',
  source_session_id: 'session-1',
  scenario_snapshot: {},
  participants: [{ id: 'p1', nickname: 'Trainee' }],
  participant_attempts: [{ participant_id: 'p1', attempt_version: 2, started_at: SUMMARY.started_at, completed_at: null }],
  events: [],
  state_history: [],
}

function response(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  }))
}

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('lists newest owner records, applies filters, and opens durable detail', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input)
      if (url.startsWith('/api/reports?')) return response({ items: [SUMMARY], total: 1, page: 1, pageSize: 25 })
      return response({ report: DETAIL })
    })
    const user = userEvent.setup()
    render(<ReportsPage />)

    expect(await screen.findByText('1 records')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Reports' })).toHaveClass('text-2xl', 'font-bold', 'text-ecg-green')
    expect(screen.queryByText('Persistent Evaluation records for your Account.')).not.toBeInTheDocument()
    expect(screen.queryByText('Instructor console')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Console' })).toHaveAttribute('href', '/instructor')
    expect(screen.getByRole('link', { name: 'Reports' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Account' })).toHaveAttribute('href', '/instructor/account')
    expect(screen.getByRole('button', { name: 'Sign Out' })).toBeInTheDocument()
    expect(screen.getByText('Cardiac arrest')).toBeInTheDocument()
    await user.type(screen.getByPlaceholderText('Attempt, scenario, or Student'), 'Alice')
    await user.selectOptions(screen.getByLabelText('Status'), 'incomplete')
    fireEvent.change(screen.getByLabelText('From (Toronto)'), { target: { value: '2026-09-01' } })
    await user.click(screen.getByRole('button', { name: 'Apply' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('status=incomplete'), expect.any(Object)))
    await user.click(screen.getByRole('button', { name: /Attempt 2 · Morning/ }))
    expect(await screen.findByLabelText('Student names')).toHaveValue('Alice')
    expect(screen.getByText(/Room ABC234/)).toBeInTheDocument()
    expect(screen.getByText('Wagami Z', { exact: false })).toBeInTheDocument()
  })

  it('saves metadata, manually completes, and shows contextual permanent deletion', async () => {
    const completed = { ...SUMMARY, attempt_label: 'Afternoon', student_names: ['Alice', 'Bob'], status: 'complete' as const, completion_method: 'manual' as const, completed_at: '2026-09-07T15:00:00.000Z' }
    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const url = String(input)
      if (url.startsWith('/api/reports?')) return response({ items: [SUMMARY], total: 1, page: 1, pageSize: 25 })
      if (url.endsWith('/complete')) return response({ report: completed })
      if (init?.method === 'PATCH') return response({ report: { ...SUMMARY, attempt_label: 'Afternoon', student_names: ['Alice', 'Bob'] } })
      if (init?.method === 'DELETE') return Promise.resolve(new Response(null, { status: 204 }))
      return response({ report: DETAIL })
    })
    const user = userEvent.setup()
    render(<ReportsPage />)
    await user.click(await screen.findByRole('button', { name: /Attempt 2 · Morning/ }))

    const attempt = await screen.findByLabelText('Attempt name')
    await user.clear(attempt)
    await user.type(attempt, 'Afternoon')
    await user.type(screen.getByLabelText('Student names'), '\nBob')
    await user.click(screen.getByRole('button', { name: 'Save details' }))
    expect(await screen.findByText('Report details saved.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Mark complete' }))
    expect(await screen.findByText(/timeline was not changed/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Delete permanently' }))
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Afternoon')
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Cardiac arrest')
    expect(screen.getByRole('alertdialog')).toHaveTextContent('cannot be recovered')
  })

  it('selects only eligible current-page reports and atomically deletes after contextual confirmation', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const url = String(input)
      if (url.startsWith('/api/reports?')) {
        return response({ items: [SUMMARY, SECOND, ACTIVE], total: 3, page: 1, pageSize: 25 })
      }
      if (url === '/api/reports/delete' && init?.method === 'POST') {
        return response({ deleted: 2 })
      }
      return response({ report: DETAIL })
    })
    const user = userEvent.setup()
    render(<ReportsPage />)

    await user.click(await screen.findByRole('button', { name: 'Delete reports' }))
    expect(screen.getByText(/Delete mode active/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Attempt 2 · Morning/ })).toBeNull()
    expect(screen.getByRole('checkbox', { name: /Live cohort.*Active trauma/ })).toBeDisabled()
    expect(screen.getByText('Active Attempt — cannot delete')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Select all on page' }))
    expect(screen.getByRole('button', { name: 'Delete selected (2)' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Delete selected (2)' }))

    const dialog = screen.getByRole('alertdialog', { name: 'Delete 2 reports permanently?' })
    expect(dialog).toHaveTextContent('Morning')
    expect(dialog).toHaveTextContent('Cardiac arrest')
    expect(dialog).toHaveTextContent('Afternoon')
    expect(dialog).toHaveTextContent('Stroke')
    expect(within(dialog).getByRole('list', { name: 'Reports selected for deletion' }))
      .toHaveClass('max-h-56', 'overflow-y-auto')

    await user.click(within(dialog).getByRole('button', { name: 'Delete 2 reports' }))
    expect(await screen.findByText('2 reports permanently deleted.')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/reports/delete', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ reportIds: [SUMMARY.id, SECOND.id] }),
    }))
    expect(screen.getByRole('button', { name: 'Delete reports' })).toBeInTheDocument()
  })

  it('preserves delete mode and selection when atomic deletion fails, then clears on cancel', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const url = String(input)
      if (url.startsWith('/api/reports?')) {
        return response({ items: [SUMMARY], total: 1, page: 1, pageSize: 25 })
      }
      if (url === '/api/reports/delete' && init?.method === 'POST') {
        return response({ error: 'The selected reports changed and were not deleted' }, 409)
      }
      return response({ report: DETAIL })
    })
    const user = userEvent.setup()
    render(<ReportsPage />)

    await user.click(await screen.findByRole('button', { name: 'Delete reports' }))
    const checkbox = screen.getByRole('checkbox', { name: /Morning.*Cardiac arrest/ })
    await user.click(checkbox)
    await user.click(screen.getByRole('button', { name: 'Delete selected (1)' }))
    await user.click(screen.getByRole('button', { name: 'Delete 1 reports' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('not deleted')
    expect(checkbox).toBeChecked()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('checkbox')).toBeNull()
  })

  it('clears page-scoped selection when filters are applied', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input)
      if (url.startsWith('/api/reports?')) {
        return response({ items: [SUMMARY], total: 1, page: 1, pageSize: 25 })
      }
      return response({ report: DETAIL })
    })
    const user = userEvent.setup()
    render(<ReportsPage />)

    await user.click(await screen.findByRole('button', { name: 'Delete reports' }))
    await user.click(screen.getByRole('checkbox', { name: /Morning.*Cardiac arrest/ }))
    expect(screen.getByRole('button', { name: 'Delete selected (1)' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Apply' }))
    expect(screen.getByRole('button', { name: 'Delete selected (0)' })).toBeDisabled()
  })
})
