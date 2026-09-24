import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { WagamiADefibPanel } from '../WagamiADefibPanel'

describe('Wagami A separate defib panel', () => {
  it('shows passive charge progress without the permanent readiness row', () => {
    render(<WagamiADefibPanel state="idle" energy={120} chargeProgress={0} canAdjustEnergy={false} />)

    expect(screen.getByRole('region', { name: 'Wagami A defibrillation status' })).not.toHaveTextContent('PRÊT À CHOC')
    expect(screen.queryByText('NON PRÊT')).not.toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Charge progress' })).toHaveValue(0)
    expect(screen.getByTestId('wagami-a-cpr-timer')).toHaveTextContent('--:--')
    expect(screen.queryByRole('button', { name: 'ANALYSER' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Augmenter l’énergie' })).toBeDisabled()
  })

  it('shows contextual ready status and keeps charged energy locked', () => {
    const onEnergyUp = vi.fn()
    render(<WagamiADefibPanel state="charged" energy={200} chargeProgress={1} canAdjustEnergy={false} onEnergyUp={onEnergyUp} onEnergyDown={() => {}} selectedAction="energyUp" />)

    expect(screen.getByRole('status')).toHaveTextContent('PRÊT À CHOC')
    expect(screen.getByRole('progressbar', { name: 'Charge progress' })).toHaveValue(100)
    fireEvent.click(screen.getByRole('button', { name: 'Augmenter l’énergie' }))
    expect(onEnergyUp).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Augmenter l’énergie' })).toHaveAttribute('data-navigation-selected', 'true')
  })

  it('distinguishes automatic advised charging and centers the active CPR timer', () => {
    const { rerender } = render(<WagamiADefibPanel state="charging" energy={120} chargeProgress={0.4} chargeOrigin="automatic_advised" canAdjustEnergy={false} />)
    expect(screen.getByRole('status')).toHaveTextContent('CHOC CONSEILLÉ · CHARGE EN COURS')
    expect(screen.getByRole('progressbar', { name: 'Charge progress' })).toHaveValue(40)
    expect(screen.queryByRole('button', { name: 'Choc WAGAMI A' })).not.toBeInTheDocument()
    rerender(<WagamiADefibPanel state="cpr" energy={120} chargeProgress={0.8} canAdjustEnergy cprTime="1:36" />)
    expect(screen.getByRole('status')).toHaveTextContent('RCP EN COURS')
    expect(screen.getByTestId('wagami-a-cpr-timer')).toHaveTextContent('1:36')
    expect(screen.getByTestId('wagami-a-cpr-timer').querySelector('strong')).toHaveClass('text-wagami-a-pni')
    expect(screen.getByRole('progressbar', { name: 'Charge progress' })).toHaveValue(0)
  })

  it('shows the automatic advised charging status in English', () => {
    render(<WagamiADefibPanel state="charging" energy={120} chargeProgress={0.25} chargeOrigin="automatic_advised" canAdjustEnergy={false} locale="en" />)
    expect(screen.getByRole('status')).toHaveTextContent('SHOCK ADVISED · CHARGING')
  })

  it('shows the localized halted-analysis result without charge progress', () => {
    const { rerender } = render(<WagamiADefibPanel state="analyzing_halted" energy={120} chargeProgress={0.8} canAdjustEnergy={false} />)
    expect(screen.getByRole('status')).toHaveTextContent('ANALYSE INTERROMPUE')
    expect(screen.getByRole('progressbar', { name: 'Charge progress' })).toHaveValue(0)

    rerender(<WagamiADefibPanel state="analyzing_halted" energy={120} chargeProgress={0.8} canAdjustEnergy={false} locale="en" />)
    expect(screen.getByRole('status')).toHaveTextContent('ANALYSIS HALTED')
  })
})
