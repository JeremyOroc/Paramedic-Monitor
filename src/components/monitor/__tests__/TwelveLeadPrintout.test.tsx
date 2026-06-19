import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { TwelveLeadPrintout } from '../TwelveLeadPrintout'

describe('TwelveLeadPrintout', () => {
  it('renders the Regular Sinus strip for NSR captures', () => {
    render(<TwelveLeadPrintout rhythm="nsr" hr={80} />)

    expect(screen.getByTestId('twelve-lead-printout')).toBeInTheDocument()
    expect(
      screen
        .getByRole('img', { name: '12-lead ECG capture' })
        .getAttribute('src'),
    ).toContain('regular-sinus-strip.png')
  })

  it('renders the Anterior MI strip for Anterior MI captures', () => {
    render(<TwelveLeadPrintout rhythm="anterior-mi" hr={80} />)

    expect(
      screen
        .getByRole('img', { name: '12-lead ECG capture' })
        .getAttribute('src'),
    ).toContain('anterior-mi-strip.jpg')
  })

  it('renders the Inferior MI strip for Inferior MI captures', () => {
    render(<TwelveLeadPrintout rhythm="inferior-mi" hr={80} />)

    expect(
      screen
        .getByRole('img', { name: '12-lead ECG capture' })
        .getAttribute('src'),
    ).toContain('inferior-mi-strip.jpeg')
  })

  it('renders the VFib strip for VF captures', () => {
    render(<TwelveLeadPrintout rhythm="vf" hr={80} />)

    expect(
      screen
        .getByRole('img', { name: '12-lead ECG capture' })
        .getAttribute('src'),
    ).toContain('vfib-12-lead-strip.png')
  })

  it('renders the 1st Degree strip for first-degree captures', () => {
    render(<TwelveLeadPrintout rhythm="first-degree" hr={80} />)

    expect(
      screen
        .getByRole('img', { name: '12-lead ECG capture' })
        .getAttribute('src'),
    ).toContain('first-degree-block-strip.png')
  })

  it('renders the 2nd Degree Type 1 strip for second-degree type 1 captures', () => {
    render(<TwelveLeadPrintout rhythm="second-degree-type-1" hr={80} />)

    expect(
      screen
        .getByRole('img', { name: '12-lead ECG capture' })
        .getAttribute('src'),
    ).toContain('second-degree-type-1-strip.png')
  })

  it('renders the 2nd Degree Type 2 strip for second-degree type 2 captures', () => {
    render(<TwelveLeadPrintout rhythm="second-degree-type-2" hr={80} />)

    expect(
      screen
        .getByRole('img', { name: '12-lead ECG capture' })
        .getAttribute('src'),
    ).toContain('second-degree-type-2-strip.png')
  })

  it('renders the 3rd Degree strip for third-degree captures', () => {
    render(<TwelveLeadPrintout rhythm="third-degree" hr={80} />)

    expect(
      screen
        .getByRole('img', { name: '12-lead ECG capture' })
        .getAttribute('src'),
    ).toContain('third-degree-block-strip.png')
  })
})
