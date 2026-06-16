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
})
