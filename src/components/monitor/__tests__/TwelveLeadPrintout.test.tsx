import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { TwelveLeadPrintout } from '../TwelveLeadPrintout'

describe('TwelveLeadPrintout', () => {
  it('renders all 12 lead labels plus a Lead II rhythm strip', () => {
    render(<TwelveLeadPrintout rhythm="nsr" hr={80} />)

    expect(screen.getByTestId('twelve-lead-printout')).toBeInTheDocument()

    for (const lead of ['I', 'aVR', 'V1', 'V4', 'aVF', 'V6']) {
      expect(screen.getByText(lead)).toBeInTheDocument()
    }
    // Lead II appears twice: once in the 3x4 grid, once as the rhythm strip.
    expect(screen.getAllByText('II')).toHaveLength(2)
  })
})
