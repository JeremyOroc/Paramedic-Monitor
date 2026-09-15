import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { WagamiAVitalCard } from '../WagamiAVitalCard'

describe('Wagami A vital cards', () => {
  it('shows an A-colored confirmed FC reading with its unit', () => {
    render(<WagamiAVitalCard channel="fc" label="FC" value="78" unit="bpm" />)

    expect(screen.getByTestId('wagami-a-vital-fc')).toHaveTextContent('78')
    expect(screen.getByText('FC')).toHaveClass('text-wagami-a-ecg')
    expect(screen.getByText('bpm')).toBeInTheDocument()
  })

  it('reserves the whole PNI card as the reading control without an inert click', () => {
    const onReading = vi.fn()
    const { rerender } = render(<WagamiAVitalCard channel="pni" label="PNI" value="118/76" unit="mmHg" />)
    expect(screen.getByRole('button', { name: 'Démarrer une mesure PNI' })).toBeDisabled()

    rerender(<WagamiAVitalCard channel="pni" label="PNI" value="118/76" unit="mmHg" onReading={onReading} />)
    fireEvent.click(screen.getByRole('button', { name: 'Démarrer une mesure PNI' }))
    expect(onReading).toHaveBeenCalledTimes(1)
  })
})
