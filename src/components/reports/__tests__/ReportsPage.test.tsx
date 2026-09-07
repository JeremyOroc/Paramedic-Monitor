import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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
})
