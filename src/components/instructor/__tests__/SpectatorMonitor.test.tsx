import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { MonitorProjection } from '@/types/monitorProjection'
import { SpectatorMonitor } from '../SpectatorMonitor'

describe('SpectatorMonitor A2 model boundary', () => {
  it('does not silently display an A projection as Wagami X', () => {
    const projection = {
      model: 'wagamiA',
      defib: { progress: 0, phaseStartedAt: null, phaseEndsAt: null },
    } as unknown as MonitorProjection

    render(<SpectatorMonitor projection={projection} embedded />)

    expect(screen.getByText('WAGAMI A · PREVIEW ONLY')).toBeInTheDocument()
    expect(screen.queryByTestId('device-shell')).not.toBeInTheDocument()
  })
})
