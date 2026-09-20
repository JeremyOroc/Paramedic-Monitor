import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { WagamiAVitalCard } from '../WagamiAVitalCard'

describe('Wagami A vital cards', () => {
  it('shows an A-colored confirmed FC reading with its unit', () => {
    render(<WagamiAVitalCard channel="fc" label="FC" value="78" unit="bpm" />)

    expect(screen.getByTestId('wagami-a-vital-fc')).toHaveTextContent('78')
    expect(screen.getByText('FC')).toHaveClass('text-wagami-a-ecg')
    expect(screen.getByText('bpm')).toBeInTheDocument()
  })

  it('uses the complete PNI card as an accessible settings action when enabled', () => {
    const onClick = vi.fn()
    render(<WagamiAVitalCard channel="pni" label="PNI" value="118/76" unit="mmHg" actionLabel="Ouvrir les réglages PNI" onClick={onClick} />)
    expect(screen.getByTestId('wagami-a-vital-pni')).toHaveTextContent('118/76')
    expect(screen.getByText('118/76')).toHaveAttribute('data-value-layout', 'inline-bp')
    screen.getByRole('button', { name: 'Ouvrir les réglages PNI' }).click()
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('remains a read-only card when no settings action is supplied', () => {
    render(<WagamiAVitalCard channel="pni" label="PNI" value="118/76" unit="mmHg" />)
    expect(screen.getByTestId('wagami-a-vital-pni').tagName).toBe('DIV')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('uses the full single-vital scale for the cuff-pressure count-up without a detail message', () => {
    render(<WagamiAVitalCard channel="pni" label="PNI" value="72" unit="mmHg" />)
    expect(screen.getByText('72')).toHaveAttribute('data-value-layout', 'single')
    expect(screen.getByText('72')).toHaveClass('text-[clamp(26px,3.5cqw,62px)]')
    expect(screen.queryByText(/mesure|patient|reading/i)).not.toBeInTheDocument()
  })
})
