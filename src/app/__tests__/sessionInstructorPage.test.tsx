import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

import SessionInstructorPage from '../session/[code]/instructor/page'

const routerReplace = vi.hoisted(() => vi.fn())
const searchParamsRef = vi.hoisted(() => ({ current: new URLSearchParams() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: routerReplace,
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  useParams: () => ({ code: 'abc123' }),
  useSearchParams: () => searchParamsRef.current,
}))

vi.mock('@/components/instructor/AdminPage', () => ({
  default: ({ session }: { session?: { code: string; hostToken: string } }) => (
    <div data-testid="admin-stub">
      {session?.code}:{session?.hostToken}
    </div>
  ),
}))

const STORAGE_KEY = 'paramedic-monitor.host.ABC123'

describe('SessionInstructorPage', () => {
  beforeEach(() => {
    localStorage.clear()
    routerReplace.mockClear()
    searchParamsRef.current = new URLSearchParams()
  })

  it('stores a URL host token and strips it from the address bar', async () => {
    searchParamsRef.current = new URLSearchParams('host=host_secret')

    render(<SessionInstructorPage />)

    await waitFor(() =>
      expect(screen.getByTestId('admin-stub')).toHaveTextContent('ABC123:host_secret'),
    )
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')).toEqual({
      hostToken: 'host_secret',
    })
    expect(routerReplace).toHaveBeenCalledWith('/session/ABC123/instructor')
  })

  it('resumes from the stored host token when the URL is clean', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ hostToken: 'stored_secret' }))

    render(<SessionInstructorPage />)

    await waitFor(() =>
      expect(screen.getByTestId('admin-stub')).toHaveTextContent('ABC123:stored_secret'),
    )
    expect(routerReplace).not.toHaveBeenCalled()
  })

  it('shows the access-required screen without a token anywhere', async () => {
    render(<SessionInstructorPage />)

    await waitFor(() =>
      expect(screen.getByText('Instructor access required')).toBeInTheDocument(),
    )
    expect(screen.queryByTestId('admin-stub')).toBeNull()
  })
})
