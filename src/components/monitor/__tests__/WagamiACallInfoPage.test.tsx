import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DEFAULT_CALLER_INFO } from '@/types/callerInfo'
import { WagamiACallInfoPage } from '../WagamiACallInfoPage'

describe('WagamiACallInfoPage', () => {
  it('places return, title, patient mode, and active alarms outside the dispatch dashboard', () => {
    const onBack = vi.fn()
    const onCallerEvent = vi.fn()
    render(
      <WagamiACallInfoPage
        locale="fr"
        patientMode="pediatric"
        alarms={['hr', 'bp']}
        onBack={onBack}
        callerInfo={{
          info: DEFAULT_CALLER_INFO,
          onCallerEvent,
          buttonState: {
            acknowledge: { disabled: false },
            arrival: { disabled: true },
            transport: { disabled: true },
          },
          responseFormatted: '01:23',
          variant: 'assignment',
        }}
      />,
    )

    const page = screen.getByTestId('wagami-a-call-info-page')
    expect(page).toHaveClass('grid-rows-[56px_minmax(0,1fr)]')
    expect(screen.getByTestId('wagami-a-clinical-status-line')).toHaveTextContent('MODE PÉDIATRIQUE · ALARME · FC / PNI')
    expect(screen.getByLabelText('Response timer')).toHaveTextContent('01:23')
    expect(screen.getByTestId('assignment-dashboard')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Accuser réception' }))
    expect(onCallerEvent).toHaveBeenCalledWith('acknowledge')
    fireEvent.click(screen.getByRole('button', { name: /Retour/ }))
    expect(onBack).toHaveBeenCalledOnce()
  })

  it('mirrors the page read-only when no return callback is supplied', () => {
    render(
      <WagamiACallInfoPage
        locale="en"
        patientMode="adult"
        alarms={[]}
        callerInfo={{
          info: DEFAULT_CALLER_INFO,
          onCallerEvent: () => {},
          buttonState: {
            acknowledge: { disabled: true },
            arrival: { disabled: true },
            transport: { disabled: true },
          },
          variant: 'classic',
        }}
      />,
    )
    expect(screen.getByRole('button', { name: /Back/ })).toBeDisabled()
    expect(screen.getByRole('heading', { name: 'Call information' })).toBeInTheDocument()
    expect(screen.getByTestId('dispatch-tablet-frame')).toHaveClass('dispatch-tablet-frame-classic-contained')
  })
})
