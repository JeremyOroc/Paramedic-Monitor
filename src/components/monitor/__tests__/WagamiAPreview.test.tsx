import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useMonitorStore } from '@/store/monitorStore'
import { WagamiAPreview } from '../WagamiAPreview'

describe('Wagami A Room-free live-display preview', () => {
  it('shows powered-on simulated normal data, six visible tasks, and no inert actuation', () => {
    useMonitorStore.getState().reset()
    render(<WagamiAPreview />)

    expect(screen.getByTestId('wagami-a-preview')).toBeInTheDocument()
    expect(screen.getByText('PREVIEW · DONNÉES SIMULÉES')).toBeInTheDocument()
    expect(screen.getByTestId('wagami-a-vital-fc')).toHaveTextContent('80')
    expect(screen.getByText('Info appel')).toBeInTheDocument()
    const dock = screen.getByRole('navigation', { name: 'Wagami A task dock' })
    expect(within(dock).getAllByRole('button')).toHaveLength(6)
    expect(screen.getByRole('button', { name: 'Charge WAGAMI A' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Choc WAGAMI A' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Analyser WAGAMI A' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Mesurer la pression artérielle' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Droite' })).toBeDisabled()
  })

  it('toggles only the shell Power action at this stage', () => {
    useMonitorStore.getState().reset()
    render(<WagamiAPreview />)

    fireEvent.click(screen.getByRole('button', { name: 'Alimentation WAGAMI A' }))
    expect(screen.getByTestId('wagami-a-screen-off')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Alimentation WAGAMI A' }))
    expect(screen.getByRole('region', { name: 'Wagami A live display' })).toBeInTheDocument()
  })
})
