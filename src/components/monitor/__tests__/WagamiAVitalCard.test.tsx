import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { WagamiAVitalCard } from '../WagamiAVitalCard'

describe('Wagami A vital cards', () => {
  it('shows an A-colored confirmed FC reading with its unit', () => {
    render(<WagamiAVitalCard channel="fc" label="FC" value="78" unit="bpm" />)

    expect(screen.getByTestId('wagami-a-vital-fc')).toHaveTextContent('78')
    expect(screen.getByText('FC')).toHaveClass('text-wagami-a-ecg')
    expect(screen.getByText('bpm')).toBeInTheDocument()
  })

  it('keeps the PNI card read-only after moving BP reading to the shell', () => {
    render(<WagamiAVitalCard channel="pni" label="PNI" value="118/76" unit="mmHg" />)
    expect(screen.getByTestId('wagami-a-vital-pni')).toHaveTextContent('118/76')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows the cuff progress detail without turning it into a second action', () => {
    render(<WagamiAVitalCard channel="pni" label="PNI" value="118/76" unit="mmHg" detail="Mesure en cours · 72" />)
    expect(screen.getByTestId('wagami-a-vital-pni')).toHaveTextContent('Mesure en cours · 72')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
