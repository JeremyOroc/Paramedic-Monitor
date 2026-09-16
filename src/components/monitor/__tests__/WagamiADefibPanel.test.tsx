import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { WagamiADefibPanel } from '../WagamiADefibPanel'

describe('Wagami A separate defib panel', () => {
  it('shows passive progress/readiness but no preview-active actuation', () => {
    render(<WagamiADefibPanel state="idle" energy={120} progress={0} canAdjustEnergy={false} />)

    expect(screen.getByRole('region', { name: 'Wagami A defibrillation status' })).toHaveTextContent('NON PRÊT')
    expect(screen.getByRole('progressbar', { name: 'Charge progress' })).toHaveValue(0)
    expect(screen.queryByRole('button', { name: 'ANALYSER' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Augmenter l’énergie' })).toBeDisabled()
  })

  it('retains energy callbacks and readiness language for the A4 connection', () => {
    const onEnergyUp = vi.fn()
    render(<WagamiADefibPanel state="charged" energy={200} progress={1} canAdjustEnergy onEnergyUp={onEnergyUp} onEnergyDown={() => {}} selectedAction="energyUp" />)

    expect(screen.getByText('PRÊT')).toHaveClass('text-wagami-a-alarm')
    fireEvent.click(screen.getByRole('button', { name: 'Augmenter l’énergie' }))
    expect(onEnergyUp).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Augmenter l’énergie' })).toHaveAttribute('data-navigation-selected', 'true')
  })
})
