import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SpectatorAvailabilityOverlay } from '@/components/instructor/SpectatorAvailabilityOverlay'
import { resolveSpectatorAvailability } from '@/lib/spectatorAvailability'

function availability(overrides: Partial<Parameters<typeof resolveSpectatorAvailability>[0]> = {}) {
  return resolveSpectatorAvailability({
    sessionStatus: 'active',
    connecting: false,
    connectionLost: true,
    traineeConnected: true,
    hasProjection: true,
    traineeName: 'Alice',
    ...overrides,
  })
}

describe('SpectatorAvailabilityOverlay', () => {
  it('covers and strongly dims a retained frame with degraded-state styling', () => {
    render(
      <SpectatorAvailabilityOverlay
        availability={availability()}
        hasProjection
      />,
    )

    const overlay = screen.getByTestId('spectator-availability-overlay')
    expect(overlay).toHaveClass('absolute', 'inset-0', 'bg-black/85')
    expect(overlay).toHaveAttribute('data-availability-kind', 'connection-lost')
    expect(screen.getByText('SPECTATOR CONNECTION LOST')).toHaveClass('text-pending-amber')
    expect(screen.getByText('Trying to reconnect…')).toBeInTheDocument()
  })

  it('uses an opaque black screen before a projection exists', () => {
    render(
      <SpectatorAvailabilityOverlay
        availability={availability({
          connectionLost: false,
          traineeConnected: false,
          hasProjection: false,
        })}
        hasProjection={false}
      />,
    )

    expect(screen.getByTestId('spectator-availability-overlay')).toHaveClass('bg-black')
    expect(screen.getByText('No monitor received')).toBeInTheDocument()
  })

  it('renders no veil while Live', () => {
    const live = availability({ connectionLost: false })
    const { container } = render(
      <SpectatorAvailabilityOverlay availability={live} hasProjection />,
    )

    expect(container).toBeEmptyDOMElement()
  })
})
