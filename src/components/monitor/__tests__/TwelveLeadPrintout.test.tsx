import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { TwelveLeadPrintout } from '../TwelveLeadPrintout'

describe('TwelveLeadPrintout', () => {
  it('renders the static ECG capture image', () => {
    render(<TwelveLeadPrintout rhythm="nsr" hr={80} />)

    expect(screen.getByTestId('twelve-lead-printout')).toBeInTheDocument()
    expect(
      screen
        .getByRole('img', { name: '12-lead ECG capture' })
        .getAttribute('src'),
    ).toContain('twelve-lead-capture.svg')
  })
})
