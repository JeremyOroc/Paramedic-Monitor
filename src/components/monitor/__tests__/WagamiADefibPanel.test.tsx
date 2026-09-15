import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { WagamiADefibPanel } from '../WagamiADefibPanel'

describe('Wagami A separate defib panel', () => {
  it('shows passive progress/readiness but no preview-active actuation', () => {
    render(<WagamiADefibPanel state="idle" energy={120} progress={0} canAnalyse={false} canAdjustEnergy={false} />)

    expect(screen.getByRole('region', { name: 'Wagami A defibrillation status' })).toHaveTextContent('NON PRÊT')
    expect(screen.getByRole('progressbar', { name: 'Charge progress' })).toHaveValue(0)
    expect(screen.getByRole('button', { name: 'ANALYSER' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Augmenter l’énergie' })).toBeDisabled()
  })

  it('retains callbacks and readiness language for the A4 connection', () => {
    const onAnalyse = vi.fn()
    render(<WagamiADefibPanel state="charged" energy={200} progress={1} canAnalyse canAdjustEnergy onAnalyse={onAnalyse} onEnergyUp={() => {}} onEnergyDown={() => {}} />)

    expect(screen.getByText('PRÊT')).toHaveClass('text-wagami-a-alarm')
    fireEvent.click(screen.getByRole('button', { name: 'ANALYSER' }))
    expect(onAnalyse).toHaveBeenCalledTimes(1)
  })
})
