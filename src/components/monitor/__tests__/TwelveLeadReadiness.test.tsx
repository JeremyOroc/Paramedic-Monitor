import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { TwelveLeadPage } from '../TwelveLeadPage'

vi.mock('../LeadCell', () => ({
  LeadCell: ({
    label,
    occluded,
    onReady,
  }: {
    label: string
    occluded?: boolean
    onReady?: () => void
  }) => (
    <button
      type="button"
      data-testid={`lead-${label}`}
      data-occluded={String(occluded)}
      onClick={onReady}
    >
      {label} ready
    </button>
  ),
}))

const LEADS = ['I', 'V1', 'II', 'V2', 'III', 'V3', 'aVR', 'V4', 'aVL', 'V5', 'aVF', 'V6']

describe('TwelveLeadPage readiness', () => {
  it('reports every re-entry only after all twelve persistent leads are ready', () => {
    const onReady = vi.fn()
    const { rerender } = render(
      <TwelveLeadPage rhythm="nsr" hr={80} occluded onReady={onReady} />,
    )

    rerender(<TwelveLeadPage rhythm="nsr" hr={80} onReady={onReady} />)
    for (const lead of LEADS.slice(0, -1)) {
      fireEvent.click(screen.getByRole('button', { name: `${lead} ready` }))
    }
    expect(onReady).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'V6 ready' }))
    expect(onReady).toHaveBeenCalledTimes(1)

    rerender(
      <TwelveLeadPage rhythm="third-degree" hr={60} occluded onReady={onReady} />,
    )
    for (const lead of LEADS) {
      expect(screen.getByTestId(`lead-${lead}`)).toHaveAttribute(
        'data-occluded',
        'true',
      )
    }

    rerender(
      <TwelveLeadPage rhythm="third-degree" hr={60} onReady={onReady} />,
    )
    for (const lead of LEADS) {
      fireEvent.click(screen.getByRole('button', { name: `${lead} ready` }))
    }
    expect(onReady).toHaveBeenCalledTimes(2)
  })
})
