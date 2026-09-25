import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DEFAULT_VITALS } from '@/types/vitals'
import type { WagamiADisplayState } from '@/lib/wagamiAPreviewState'
import { WagamiADevice } from '../WagamiADevice'

vi.mock('../WagamiAScreen', () => ({ WagamiAScreen: ({ selectedAction }: { selectedAction: string | null }) => <div data-testid="a-screen-mock" data-selection={selectedAction ?? ''} /> }))

const display: WagamiADisplayState = {
  vitals: { ...DEFAULT_VITALS },
  active: { hr: true, bp_sys: true, bp_dia: true, etco2: true, spo2: true },
  simulated: true,
  alarms: [],
}

describe('Wagami A approved v3 shell controls', () => {
  it('shows sound waves when audio is on and a crossed speaker when muted', () => {
    const onMute = vi.fn()
    const props = { display, energy: 120, poweredOn: true, onPowerToggle: vi.fn(), onMute }
    const { rerender } = render(<WagamiADevice {...props} />)

    const muteButton = screen.getByRole('button', { name: 'Couper tous les sons' })
    const iconPaths = () => Array.from(muteButton.querySelectorAll('svg path')).map((path) => path.getAttribute('d'))
    expect(muteButton).toHaveAttribute('aria-pressed', 'false')
    expect(muteButton).toHaveTextContent('')
    expect(iconPaths()).toEqual([
      'M3 9h4l5-4v14l-5-4H3z',
      'M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11',
    ])

    fireEvent.click(muteButton)
    expect(onMute).toHaveBeenCalledOnce()
    rerender(<WagamiADevice {...props} muted />)
    expect(screen.getByRole('button', { name: 'Réactiver tous les sons' })).toBe(muteButton)
    expect(muteButton).toHaveAttribute('aria-pressed', 'true')
    expect(muteButton).toHaveTextContent('')
    expect(iconPaths()).toEqual([
      'M3 9h4l5-4v14l-5-4H3z',
      'M5 20 20 4',
    ])

    rerender(<WagamiADevice {...props} locale="en" muted />)
    expect(screen.getByRole('button', { name: 'Restore all audio' })).toHaveAttribute('aria-pressed', 'true')
    rerender(<WagamiADevice {...props} locale="en" />)
    expect(screen.getByRole('button', { name: 'Mute all audio' })).toHaveAttribute('aria-pressed', 'false')
    expect(iconPaths()[1]).toBe('M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11')
  })

  it('places right Analyze, Charge, Shock, left Mute, Patient mode, BP and lower navigation outside the screen', () => {
    const onPowerToggle = vi.fn()
    render(<WagamiADevice display={display} energy={120} poweredOn onPowerToggle={onPowerToggle} />)

    const shell = screen.getByTestId('wagami-a-shell')
    expect(shell).toContainElement(screen.getByRole('button', { name: 'Alimentation WAGAMI A' }))
    expect(shell).toContainElement(screen.getByRole('button', { name: 'Charge WAGAMI A' }))
    expect(shell).toContainElement(screen.getByRole('button', { name: 'Analyser WAGAMI A' }))
    expect(shell).toContainElement(screen.getByRole('button', { name: 'Choc WAGAMI A' }))
    expect(shell).toContainElement(screen.getByRole('button', { name: 'Couper tous les sons' }))
    expect(shell).toContainElement(screen.getByRole('button', { name: /Changer le mode patient/ }))
    expect(shell).toContainElement(screen.getByRole('button', { name: 'Mesurer la pression artérielle' }))
    expect(screen.getByRole('navigation', { name: 'Navigation physique Wagami A' })).toContainElement(screen.getByRole('button', { name: 'Entrée' }))
    const right = screen.getByLabelText('Wagami A right clinical shell controls')
    expect(right.querySelectorAll('button')).toHaveLength(3)
    expect(Array.from(right.querySelectorAll('button')).map((button) => button.getAttribute('aria-label'))).toEqual(['Analyser WAGAMI A', 'Charge WAGAMI A', 'Choc WAGAMI A'])
    expect(screen.getByRole('button', { name: 'Analyser WAGAMI A' })).toHaveClass('right-[2%]', 'top-[27%]', 'wagami-a-shell-control')
    expect(screen.getByRole('button', { name: 'Charge WAGAMI A' })).toHaveClass('right-[2%]', 'top-[41%]')
    expect(screen.getByRole('button', { name: 'Choc WAGAMI A' })).toHaveClass('right-[2%]', 'top-[57%]')
    expect(screen.getByRole('button', { name: 'Couper tous les sons' })).toHaveClass('left-[2%]', 'wagami-a-shell-control')
    expect(screen.getByTestId('wagami-a-inner-display')).toHaveClass('wagami-a-inner-display')
    expect(shell.querySelector('.wagami-a-navigation-well')).toBeInTheDocument()
    expect(screen.getByTestId('wagami-a-shell-led')).toHaveAttribute('data-alarming', 'false')
    expect(screen.getByRole('button', { name: 'Charge WAGAMI A' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Choc WAGAMI A' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Droite' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Alimentation WAGAMI A' }))
    expect(onPowerToggle).toHaveBeenCalledTimes(1)
  })

  it('cycles enabled task focus and Enter activates the selected task once', () => {
    const onTask = vi.fn()
    render(<WagamiADevice display={display} energy={120} poweredOn onPowerToggle={() => {}} onTask={onTask} />)
    fireEvent.click(screen.getByRole('button', { name: 'Droite' }))
    expect(screen.getByTestId('a-screen-mock')).toHaveAttribute('data-selection', 'twelveLead')
    fireEvent.click(screen.getByRole('button', { name: 'Gauche' }))
    expect(screen.getByTestId('a-screen-mock')).toHaveAttribute('data-selection', 'configure')
    fireEvent.click(screen.getByRole('button', { name: 'Entrée' }))
    expect(onTask).toHaveBeenCalledTimes(1)
    expect(onTask).toHaveBeenCalledWith('configure')
  })

  it('removes Call Info from the physical navigation ring during a charge', () => {
    const onTask = vi.fn()
    render(<WagamiADevice display={display} energy={120} defibState="charging" poweredOn onPowerToggle={() => {}} onTask={onTask} />)
    for (let index = 0; index < 4; index += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Droite' }))
    }
    expect(screen.getByTestId('a-screen-mock')).toHaveAttribute('data-selection', 'vitalLog')
    fireEvent.click(screen.getByRole('button', { name: 'Entrée' }))
    expect(onTask).toHaveBeenCalledExactlyOnceWith('vitalLog')
  })

  it('guards patient mode and keeps shell controls available in a secondary inner view', () => {
    const onPatientModeCycle = vi.fn()
    const onAnalyse = vi.fn()
    const { rerender } = render(<WagamiADevice display={display} energy={120} poweredOn onPowerToggle={() => {}} patientMode="pediatric" patientModeLocked onPatientModeCycle={onPatientModeCycle} canAnalyse onAnalyse={onAnalyse} navigationView="callInfo" secondaryActions={[{ id: 'back', enabled: true, activate: vi.fn() }]} screenContent={<div data-testid="secondary-view">Info appel</div>} />)
    expect(screen.getByRole('button', { name: 'Changer le mode patient, mode actuel PÉDIATRIQUE' })).toHaveTextContent('MODE')
    expect(screen.getByRole('button', { name: 'Changer le mode patient, mode actuel PÉDIATRIQUE' })).not.toHaveTextContent('PÉDIATRIQUE')
    expect(screen.getByRole('button', { name: 'Changer le mode patient, mode actuel PÉDIATRIQUE' })).toBeDisabled()
    expect(screen.getByTestId('secondary-view')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Analyser WAGAMI A' }))
    expect(onAnalyse).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Droite' }))
    expect(screen.getByRole('button', { name: 'Entrée' })).toBeEnabled()
    rerender(<WagamiADevice display={display} energy={120} poweredOn onPowerToggle={() => {}} onPatientModeCycle={onPatientModeCycle} />)
    fireEvent.click(screen.getByRole('button', { name: 'Changer le mode patient, mode actuel ADULTE' }))
    expect(onPatientModeCycle).toHaveBeenCalledTimes(1)
  })

  it('shows an alarm LED state, a bilingual startup, and a blank powered-off screen', () => {
    const { rerender } = render(<WagamiADevice display={{ ...display, alarms: ['hr'] }} energy={120} poweredOn onPowerToggle={() => {}} />)
    expect(screen.getByTestId('wagami-a-shell-led')).toHaveAttribute('data-alarming', 'true')

    rerender(<WagamiADevice display={{ ...display, alarms: ['hr'] }} energy={120} poweredOn onPowerToggle={() => {}} shellAlarmLedEnabled={false} />)
    expect(screen.getByTestId('wagami-a-shell-led')).toHaveAttribute('data-enabled', 'false')
    expect(screen.getByTestId('wagami-a-shell-led')).toHaveAttribute('data-alarming', 'false')

    rerender(<WagamiADevice display={{ ...display, alarms: ['hr'] }} energy={120} poweredOn={false} onPowerToggle={() => {}} />)
    expect(screen.getByTestId('wagami-a-screen-off')).toHaveAccessibleName('Wagami A powered off')
    expect(screen.getByTestId('wagami-a-screen-off')).toBeEmptyDOMElement()
    expect(screen.getByTestId('wagami-a-shell-led')).toHaveAttribute('data-alarming', 'false')

    rerender(<WagamiADevice display={{ ...display, alarms: ['hr'] }} energy={120} powerState="booting" onPowerToggle={() => {}} canAnalyse onAnalyse={() => {}} />)
    expect(screen.getByRole('status', { name: 'Wagami A starting. For simulation purposes only.' })).toBeInTheDocument()
    expect(screen.getByText('WAGAMI A', { selector: '[aria-hidden="true"]' })).toBeInTheDocument()
    expect(screen.getByText('For simulation purposes only')).toBeInTheDocument()
    expect(screen.getByText('À des fins de simulation seulement')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Analyser WAGAMI A' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Alimentation WAGAMI A' })).toBeEnabled()
    expect(screen.getByTestId('wagami-a-shell-led')).toHaveAttribute('data-alarming', 'false')
  })

  it('labels the shell BP action as cancellation during a cuff cycle', () => {
    const onReadBP = vi.fn()
    render(<WagamiADevice display={display} energy={120} poweredOn onPowerToggle={() => {}} canReadBP onReadBP={onReadBP} bpReadingActive />)
    fireEvent.click(screen.getByRole('button', { name: 'Annuler la mesure de pression artérielle' }))
    expect(onReadBP).toHaveBeenCalledOnce()
    expect(screen.queryByRole('button', { name: 'Mesurer la pression artérielle' })).not.toBeInTheDocument()
  })

  it('localizes the physical navigation labels in English', () => {
    render(<WagamiADevice display={display} energy={120} poweredOn onPowerToggle={() => {}} locale="en" onTask={() => {}} />)
    expect(screen.getByRole('navigation', { name: 'Wagami A physical navigation' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Left' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Change patient mode, current mode ADULT' })).toHaveTextContent('MODE')
    expect(screen.getByRole('button', { name: 'Measure blood pressure' })).toHaveTextContent('BP')
  })
})
