import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { InstructorLayout } from '../InstructorLayout'

describe('InstructorLayout', () => {
  it('uses the canonical heading without the removed local-only guidance', () => {
    render(
      <InstructorLayout>
        <p>Console content</p>
      </InstructorLayout>,
    )

    expect(screen.getByRole('heading', { name: 'Instructor Console' })).toBeInTheDocument()
    expect(screen.queryByText('Dev Console')).toBeNull()
    expect(screen.queryByText(/Local-only\. Edits go through/)).toBeNull()
    expect(screen.getByText('Console content')).toBeInTheDocument()
  })
})
