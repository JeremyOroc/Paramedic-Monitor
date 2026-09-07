import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { InstructorNavigation } from '@/components/instructor/InstructorNavigation'

describe('InstructorNavigation', () => {
  it('links every authenticated area and identifies the current one', () => {
    render(<InstructorNavigation active="reports" />)

    expect(screen.getByRole('navigation', { name: 'Instructor' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Console' })).toHaveAttribute('href', '/instructor')
    expect(screen.getByRole('link', { name: 'Reports' })).toHaveAttribute('href', '/instructor/reports')
    expect(screen.getByRole('link', { name: 'Account' })).toHaveAttribute('href', '/instructor/account')
    expect(screen.getByRole('link', { name: 'Reports' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Console' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('link', { name: 'Account' })).not.toHaveAttribute('aria-current')
  })
})
