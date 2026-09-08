import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import Page from '@/app/page'

vi.mock('next/dynamic', () => ({ default: () => () => <div>Development monitor</div> }))
vi.mock('@/components/session/LandingExperience', () => ({ LandingExperience: () => <div>Landing cinematic</div> }))

describe('public entry routing', () => {
  afterEach(() => { cleanup(); window.history.replaceState({}, '', '/') })
  it('renders the real public landing route under test', () => {
    render(<Page />)
    expect(screen.getByText('Landing cinematic')).toBeInTheDocument()
  })
  it.each(['1', '2'])('bypasses the cinematic for development mode %s', (dev) => {
    window.history.replaceState({}, '', `/?dev=${dev}`)
    render(<Page />)
    expect(screen.getByText('Development monitor')).toBeInTheDocument()
    expect(screen.queryByText('Landing cinematic')).toBeNull()
  })
})
