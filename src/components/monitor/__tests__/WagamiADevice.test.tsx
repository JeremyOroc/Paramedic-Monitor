import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DEFAULT_VITALS } from '@/types/vitals'
import type { WagamiADisplayState } from '@/lib/wagamiAPreviewState'
import { WagamiADevice } from '../WagamiADevice'

vi.mock('../WagamiAScreen', () => ({ WagamiAScreen: () => <div data-testid="a-screen-mock" /> }))

const display: WagamiADisplayState = {
  vitals: { ...DEFAULT_VITALS },
  active: { hr: true, bp_sys: true, bp_dia: true, etco2: true, spo2: true },
  simulated: true,
  alarms: [],
}

describe('Wagami A original shell affordances', () => {
  it('puts Power, Charge, Shock and shell LED outside the screen', () => {
    const onPowerToggle = vi.fn()
    render(<WagamiADevice display={display} energy={120} poweredOn onPowerToggle={onPowerToggle} />)

    const shell = screen.getByTestId('wagami-a-shell')
    expect(shell).toContainElement(screen.getByRole('button', { name: 'Alimentation WAGAMI A' }))
    expect(shell).toContainElement(screen.getByRole('button', { name: 'Charge WAGAMI A' }))
    expect(shell).toContainElement(screen.getByRole('button', { name: 'Choc WAGAMI A' }))
    expect(screen.getByTestId('wagami-a-shell-led')).toHaveAttribute('data-alarming', 'false')
    expect(screen.getByRole('button', { name: 'Charge WAGAMI A' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Choc WAGAMI A' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Alimentation WAGAMI A' }))
    expect(onPowerToggle).toHaveBeenCalledTimes(1)
  })

  it('shows an alarm LED state and a genuine powered-off screen', () => {
    const { rerender } = render(<WagamiADevice display={{ ...display, alarms: ['hr'] }} energy={120} poweredOn onPowerToggle={() => {}} />)
    expect(screen.getByTestId('wagami-a-shell-led')).toHaveAttribute('data-alarming', 'true')

    rerender(<WagamiADevice display={{ ...display, alarms: ['hr'] }} energy={120} poweredOn={false} onPowerToggle={() => {}} />)
    expect(screen.getByTestId('wagami-a-screen-off')).toHaveTextContent('ALIMENTATION COUPÉE')
    expect(screen.getByTestId('wagami-a-shell-led')).toHaveAttribute('data-alarming', 'false')
  })
})
