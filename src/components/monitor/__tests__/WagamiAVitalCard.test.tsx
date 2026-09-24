import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { WagamiAVitalCard } from '../WagamiAVitalCard'

describe('Wagami A vital cards', () => {
  it('shows an A-colored confirmed FC reading with its unit', () => {
    render(<WagamiAVitalCard channel="fc" label="FC" value="78" unit="bpm" />)

    expect(screen.getByTestId('wagami-a-vital-fc')).toHaveTextContent('78')
    expect(screen.getByText('FC')).toHaveClass('text-wagami-a-ecg')
    expect(screen.getByText('bpm')).toBeInTheDocument()
    expect(screen.getByTestId('wagami-a-vital-fc')).toHaveAttribute('data-alarming', 'false')
    expect(screen.getByTestId('wagami-a-vital-fc')).not.toHaveClass('wagami-a-vital-alarm-pulse')
  })

  it('keeps alarm content readable while the card carries the dedicated flash state', () => {
    render(<WagamiAVitalCard channel="fc" label="FC" value="142" unit="bpm" alarming />)

    const card = screen.getByTestId('wagami-a-vital-fc')
    expect(card).toHaveAttribute('data-alarming', 'true')
    expect(card).toHaveClass('wagami-a-vital-alarm-pulse')
    expect(screen.getByText('FC')).toHaveClass('text-wagami-a-alarm')
    expect(screen.getByText('142')).toHaveClass('text-wagami-a-alarm')
    expect(screen.getByText('bpm')).toHaveClass('text-wagami-a-alarm')
    expect(screen.getByText('142')).not.toHaveClass('vital-alarm-flash')
  })

  it('uses the complete PNI card as an accessible settings action when enabled', () => {
    const onClick = vi.fn()
    render(<WagamiAVitalCard channel="pni" label="PNI" value="118/76" unit="mmHg" actionLabel="Ouvrir les réglages PNI" onClick={onClick} />)
    expect(screen.getByTestId('wagami-a-vital-pni')).toHaveTextContent('118/76')
    expect(screen.getByText('118/76')).toHaveAttribute('data-value-layout', 'inline-bp')
    screen.getByRole('button', { name: 'Ouvrir les réglages PNI' }).click()
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('preserves the complete PNI settings action while alarming', () => {
    const onClick = vi.fn()
    render(<WagamiAVitalCard channel="pni" label="PNI" value="82/48" unit="mmHg" alarming actionLabel="Ouvrir les réglages PNI" onClick={onClick} />)

    const button = screen.getByRole('button', { name: 'Ouvrir les réglages PNI' })
    expect(button).toHaveClass('wagami-a-vital-alarm-pulse')
    expect(button).toHaveAttribute('data-alarming', 'true')
    button.focus()
    expect(button).toHaveFocus()
    button.click()
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
