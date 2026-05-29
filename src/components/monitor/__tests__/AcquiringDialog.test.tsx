import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { AcquiringDialog } from '../AcquiringDialog'

describe('AcquiringDialog', () => {
  it('renders the title and a progress bar', () => {
    render(<AcquiringDialog durationMs={4000} />)

    expect(screen.getByText('Acquiring 12-Lead')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })
})
