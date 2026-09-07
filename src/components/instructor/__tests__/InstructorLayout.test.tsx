import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { InstructorLayout } from '../InstructorLayout'

const push = vi.fn()
const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }))

describe('InstructorLayout', () => {
  beforeEach(() => {
    push.mockReset()
    refresh.mockReset()
    vi.restoreAllMocks()
  })

  it('uses the canonical heading without the removed local-only guidance', () => {
    render(
      <InstructorLayout>
        <p>Console content</p>
      </InstructorLayout>,
    )

    expect(screen.getByRole('heading', { name: 'Instructor Console' })).toBeInTheDocument()
    expect(screen.queryByText('Dev Console')).toBeNull()
    expect(screen.queryByText(/Local-only\. Edits go through/)).toBeNull()
    expect(screen.getByRole('link', { name: 'Console' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Reports' })).toHaveAttribute('href', '/instructor/reports')
    expect(screen.getByRole('link', { name: 'Account' })).toHaveAttribute('href', '/instructor/account')
    expect(screen.getByRole('button', { name: 'Sign Out' })).toHaveClass('col-start-3')
    expect(screen.getByText('Console content')).toBeInTheDocument()
    expect(screen.getByText('Console content').parentElement).toHaveClass(
      'w-full',
      'p-6',
      'gap-6',
      '[@media(max-height:900px)]:gap-2',
      '[@media(max-height:900px)]:py-2',
    )
  })

  it('uses the Console heading and navigation layout for another active area', () => {
    render(
      <InstructorLayout active="reports" title="Reports">
        <p>Report content</p>
      </InstructorLayout>,
    )

    expect(screen.getByRole('heading', { name: 'Reports' })).toHaveClass(
      'text-2xl',
      'font-bold',
      'text-ecg-green',
    )
    expect(screen.getByRole('link', { name: 'Reports' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('heading', { name: 'Reports' }).closest('header')).toContainElement(
      screen.getByRole('navigation', { name: 'Instructor' }),
    )
  })

  it('signs out the current device from the shared header', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }))
    render(<InstructorLayout><p>Console content</p></InstructorLayout>)

    await user.click(screen.getByRole('button', { name: 'Sign Out' }))

    expect(fetch).toHaveBeenCalledWith('/api/auth/signout', { method: 'POST' })
    expect(push).toHaveBeenCalledWith('/instructor/login')
    expect(refresh).toHaveBeenCalledOnce()
  })

  it('shows a shared navigation error when sign out fails', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 503 }))
    render(<InstructorLayout><p>Console content</p></InstructorLayout>)

    await user.click(screen.getByRole('button', { name: 'Sign Out' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to sign out. Please try again.')
    expect(push).not.toHaveBeenCalled()
  })
})
