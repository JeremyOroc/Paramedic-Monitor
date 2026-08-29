import { useState } from 'react'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { usePatientSnsMeasurements } from '@/hooks/usePatientSnsMeasurements'
import type { PatientPhysicalFindings } from '@/lib/patientPhysicalAutoSort'
import type {
  PatientPhysicalIconGroupId,
  PatientSnsIconGroupId,
} from '@/types/patientPhysical'

import { PatientSnsControls } from '../PatientSnsControls'

function renderControls(findings: PatientPhysicalFindings = {}) {
  function ControlsHarness() {
    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [activeIconGroup, setActiveIconGroup] =
      useState<PatientPhysicalIconGroupId | null>(null)
    const handleMeasurementResult = (group: 'pulse' | 'respiratory') => {
      setSelected((current) => {
        if (current.has(group)) return current
        const next = new Set(current)
        next.add(group)
        return next
      })
    }
    const {
      measurements,
      startMeasurement,
      revealMeasurement,
      cancelMeasurement,
    } = usePatientSnsMeasurements(handleMeasurementResult)

    const handleIconGroupClick = (selection: PatientSnsIconGroupId) => {
      setSelected((current) => {
        if (current.has(selection)) return current
        const next = new Set(current)
        next.add(selection)
        return next
      })
      setActiveIconGroup((current) => (current === selection ? null : selection))
    }

    return (
      <PatientSnsControls
        selected={selected}
        findings={findings}
        activeIconGroup={activeIconGroup}
        onIconGroupClick={handleIconGroupClick}
        measurements={measurements}
        onMeasurementStart={(group, durationSeconds) =>
          startMeasurement(group, durationSeconds, findings)
        }
        onMeasurementTap={(group) => revealMeasurement(group, findings)}
        onMeasurementCancel={cancelMeasurement}
      />
    )
  }

  return render(<ControlsHarness />)
}

afterEach(() => {
  vi.useRealTimers()
})

describe('PatientSnsControls', () => {
  it('renders icon context and three measurement options in the required order', () => {
    renderControls()

    const controls = screen.getByTestId('patient-sns-controls')
    const pulse = within(controls).getByRole('heading', { name: 'Pulse' })
    const respiratory = within(controls).getByRole('heading', {
      name: 'Respiratory',
    })
    const skinExtremities = within(controls).getByRole('button', {
      name: 'Skin/Extremities',
    })

    expect(controls).toHaveClass('grid-cols-3')
    expect(pulse.compareDocumentPosition(respiratory)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(respiratory.compareDocumentPosition(skinExtremities)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(
      within(screen.getByRole('group', { name: 'Pulse measurement options' }))
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['15s', '30s', 'Tap'])
    expect(
      within(screen.getByRole('group', { name: 'Respiratory measurement options' }))
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['15s', '30s', 'Tap'])
  })

  it('reveals exact independent Tap results and canonical missing fields', async () => {
    const user = userEvent.setup()
    renderControls({
      'pulse-rate': '98 bpm',
      'pulse-rhythm': 'Regular',
      'pulse-strength': 'Moderate',
      'respiratory-rate': '22 breaths/min',
      'respiratory-rhythm': 'Regular',
    })

    await user.click(screen.getByRole('button', { name: 'Pulse Tap' }))
    await user.click(screen.getByRole('button', { name: 'Respiratory Tap' }))

    const pulseResult = screen.getByRole('region', { name: 'Pulse measurement result' })
    expect(pulseResult).toHaveTextContent('Rate: 98 bpm')
    expect(pulseResult).toHaveTextContent('15 sec = 25 beats')
    expect(pulseResult).toHaveTextContent('30 sec = 49 beats')
    expect(pulseResult).toHaveTextContent('Rhythm: Regular')
    expect(pulseResult).toHaveTextContent('Strength: Moderate')

    const respiratoryResult = screen.getByRole('region', {
      name: 'Respiratory measurement result',
    })
    expect(respiratoryResult).toHaveTextContent('Respiratory: 22 breaths/min')
    expect(respiratoryResult).toHaveTextContent('15 sec = 6 breaths')
    expect(respiratoryResult).toHaveTextContent('30 sec = 11 breaths')
    expect(respiratoryResult).toHaveTextContent('Regular')
    expect(respiratoryResult).toHaveTextContent('Missing: Effort')
  })

  it('replaces one option row with a cancellable countdown and restores it without a result', () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    renderControls({ 'pulse-rate': '98 bpm' })

    fireEvent.click(screen.getByRole('button', { name: 'Pulse 15s' }))

    expect(screen.queryByRole('group', { name: 'Pulse measurement options' })).toBeNull()
    const cancel = screen.getByRole('button', {
      name: 'Cancel Pulse 15-second measurement',
    })
    expect(cancel).toHaveTextContent('15s')
    expect(screen.getByRole('group', { name: 'Respiratory measurement options' }))
      .toBeInTheDocument()

    fireEvent.click(cancel)

    expect(screen.getByRole('group', { name: 'Pulse measurement options' }))
      .toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Pulse measurement result' })).toBeNull()
    expect(screen.getByRole('img', { name: 'Pulse findings' })).not.toHaveClass(
      'text-ecg-green',
    )
  })

  it('completes simultaneous countdowns independently without rendering zero', () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    renderControls({
      'pulse-rate': '98 bpm',
      'pulse-rhythm': 'Regular',
      'pulse-strength': 'Moderate',
      'respiratory-rate': '22 breaths/min',
      'respiratory-rhythm': 'Regular',
      'respiratory-strength': 'Mildly labored',
    })

    fireEvent.click(screen.getByRole('button', { name: 'Pulse 15s' }))
    fireEvent.click(screen.getByRole('button', { name: 'Respiratory 30s' }))

    act(() => {
      vi.advanceTimersByTime(14_999)
    })
    expect(screen.getByRole('button', {
      name: 'Cancel Pulse 15-second measurement',
    })).toHaveTextContent('1s')
    expect(screen.queryByText('0s')).toBeNull()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(screen.getByRole('region', { name: 'Pulse measurement result' }))
      .toBeInTheDocument()
    expect(screen.getByRole('button', {
      name: 'Cancel Respiratory 30-second measurement',
    })).toHaveTextContent('15s')

    act(() => {
      vi.advanceTimersByTime(15_000)
    })
    expect(screen.getByRole('region', { name: 'Pulse measurement result' }))
      .toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Respiratory measurement result' }))
      .toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Pulse findings' })).toHaveClass(
      'text-ecg-green',
    )
    expect(screen.getByRole('img', { name: 'Respiratory findings' })).toHaveClass(
      'text-ecg-green',
    )
  })

  it('preserves the Skin/Extremities single-toggle behavior', async () => {
    const user = userEvent.setup()
    renderControls({ 'skin-extremities-note': 'Pale\nCool' })

    const control = screen.getByRole('button', { name: 'Skin/Extremities' })
    await user.click(control)
    expect(control).toHaveAttribute('aria-pressed', 'true')
    expect(control).toHaveClass('border-ecg-green', 'bg-black', 'text-ecg-green')
    expect(screen.getByRole('region', { name: 'Skin/Extremities finding slider' }))
      .toHaveTextContent('Pale')

    await user.click(control)
    expect(screen.queryByRole('region', { name: 'Skin/Extremities finding slider' }))
      .toBeNull()
    expect(control).toHaveAttribute('aria-pressed', 'true')
  })
})
