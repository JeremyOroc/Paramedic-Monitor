import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { useMonitorStore } from '@/store/monitorStore'

import AdminPage from '../admin/page'

describe('AdminPage', () => {
  beforeEach(() => {
    useMonitorStore.getState().reset()
  })

  it('shows monitor controls by default and keeps caller info in its own tab', async () => {
    const user = userEvent.setup()
    render(<AdminPage />)

    expect(screen.getByRole('button', { name: 'Monitor' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Vitals')).toBeInTheDocument()
    expect(screen.queryByLabelText('Adresse')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Caller Info' }))

    expect(screen.getByRole('button', { name: 'Caller Info' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Adresse')).toBeInTheDocument()
    expect(screen.queryByText('Vitals')).toBeNull()
  })
})
