import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { TwelveLeadPage } from '../TwelveLeadPage'

const LEADS = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6']

describe('TwelveLeadPage', () => {
  it('renders the 12-lead grid for Anterior MI', () => {
    render(<TwelveLeadPage rhythm="anterior-mi" hr={80} />)

    for (const lead of LEADS) {
      expect(screen.getByTestId(`lead-cell-${lead}`)).toHaveAttribute(
        'data-rhythm',
        'anterior-mi',
      )
    }
  })

  it('renders the 12-lead grid for Inferior MI', () => {
    render(<TwelveLeadPage rhythm="inferior-mi" hr={80} />)

    for (const lead of LEADS) {
      expect(screen.getByTestId(`lead-cell-${lead}`)).toHaveAttribute(
        'data-rhythm',
        'inferior-mi',
      )
    }
  })

  it('renders the 12-lead grid for 1st Degree', () => {
    render(<TwelveLeadPage rhythm="first-degree" hr={80} />)

    for (const lead of LEADS) {
      expect(screen.getByTestId(`lead-cell-${lead}`)).toHaveAttribute(
        'data-rhythm',
        'first-degree',
      )
    }
  })

  it('renders the 12-lead grid for 2nd Degree Type 1', () => {
    render(<TwelveLeadPage rhythm="second-degree-type-1" hr={80} />)

    for (const lead of LEADS) {
      expect(screen.getByTestId(`lead-cell-${lead}`)).toHaveAttribute(
        'data-rhythm',
        'second-degree-type-1',
      )
    }
  })

  it('renders the 12-lead grid for 2nd Degree Type 2', () => {
    render(<TwelveLeadPage rhythm="second-degree-type-2" hr={80} />)

    for (const lead of LEADS) {
      expect(screen.getByTestId(`lead-cell-${lead}`)).toHaveAttribute(
        'data-rhythm',
        'second-degree-type-2',
      )
    }
  })

  it('renders the 12-lead grid for 3rd Degree', () => {
    render(<TwelveLeadPage rhythm="third-degree" hr={80} />)

    for (const lead of LEADS) {
      expect(screen.getByTestId(`lead-cell-${lead}`)).toHaveAttribute(
        'data-rhythm',
        'third-degree',
      )
    }
  })
})
