import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const redirect = vi.hoisted(() => vi.fn((destination: string) => {
  throw new Error(`redirect:${destination}`)
}))
const connection = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))

vi.mock('next/navigation', () => ({ redirect }))
vi.mock('next/server', () => ({ connection }))

import MaintenancePage from '@/app/maintenance/page'

describe('MaintenancePage', () => {
  afterEach(() => {
    delete process.env.MAINTENANCE_MODE
    vi.clearAllMocks()
  })

  it('renders a clear operational hold when maintenance is enabled', async () => {
    process.env.MAINTENANCE_MODE = 'true'
    render(await MaintenancePage())

    expect(connection).toHaveBeenCalledOnce()
    expect(screen.getByRole('heading', { name: /temporarily unavailable/i })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Existing data is being preserved')
  })

  it('does not expose a stale maintenance page during normal operation', async () => {
    await expect(MaintenancePage()).rejects.toThrow('redirect:/')
  })
})
