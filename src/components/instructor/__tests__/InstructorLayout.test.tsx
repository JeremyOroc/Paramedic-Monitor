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
    expect(screen.getByText('Console content').parentElement).toHaveClass(
      'max-w-5xl',
      '[@media(max-height:900px)]:gap-2',
      '[@media(max-height:900px)]:px-4',
      '[@media(max-height:900px)]:py-2',
    )
  })
})
