import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { WagamiAClinicalStatusLine } from '../WagamiAClinicalStatusLine'

describe('WagamiAClinicalStatusLine', () => {
  it('shows only the dynamic patient mode when no alarm is active', () => {
    render(<WagamiAClinicalStatusLine patientMode="pediatric" alarms={[]} />)

    const status = screen.getByTestId('wagami-a-clinical-status-line')
    expect(status).toHaveTextContent('MODE PÉDIATRIQUE')
    expect(status).not.toHaveTextContent('ALARME')
    expect(status).not.toHaveTextContent('AUCUNE')
    expect(within(status).getByText('MODE')).toHaveClass('mr-2')
  })

  it('orders active French alarm labels as FC, SpO₂, then PNI and colors only the alarm segment red', () => {
    render(<WagamiAClinicalStatusLine patientMode="neonate" alarms={['bp', 'hr', 'spo2', 'hr']} />)

    const status = screen.getByTestId('wagami-a-clinical-status-line')
    expect(status).toHaveTextContent('MODE NÉONATAL · ALARME · FC / SpO₂ / PNI')
    expect(within(status).getByText('NÉONATAL')).toHaveClass('border-wagami-a-border', 'bg-wagami-a-surface-raised')
    expect(within(status).getByText('ALARME · FC / SpO₂ / PNI')).toHaveClass('text-wagami-a-alarm')
  })

  it('uses the approved English patient mode and alarm abbreviations', () => {
    render(<WagamiAClinicalStatusLine patientMode="adult" alarms={['bp', 'spo2', 'hr']} locale="en" />)

    expect(screen.getByRole('status')).toHaveTextContent('MODE ADULT · ALARM · HR / SpO₂ / BP')
    expect(screen.getByTestId('wagami-a-current-mode')).toHaveTextContent('ADULT')
  })
})
