import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

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
      />
    )
  }

  return render(<ControlsHarness />)
}

describe('PatientSnsControls', () => {
  it('renders the three clinical controls in the required horizontal order', () => {
    renderControls()

    const controls = screen.getByTestId('patient-sns-controls')
    const pulse = within(controls).getByRole('button', { name: 'Pulse' })
    const respiratory = within(controls).getByRole('button', { name: 'Respiratory' })
    const skinExtremities = within(controls).getByRole('button', {
      name: 'Skin/Extremities',
    })

    expect(controls).toHaveClass('grid-cols-3')
    expect(pulse.compareDocumentPosition(respiratory)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(respiratory.compareDocumentPosition(skinExtremities)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(screen.queryByRole('button', { name: 'Scene/Environment' })).toBeNull()
  })

  it('shows pending Pulse and Respiratory summaries with missing fields', async () => {
    const user = userEvent.setup()
    renderControls({
      'pulse-rate': '112 bpm',
      'respiratory-rate': '24 breaths/min',
      'respiratory-rhythm': 'Regular',
    })

    const pulse = screen.getByRole('button', { name: 'Pulse' })
    const respiratory = screen.getByRole('button', { name: 'Respiratory' })
    expect(pulse).toHaveClass('border-pending-amber')
    expect(respiratory).toHaveClass('border-pending-amber')

    await user.click(respiratory)
    expect(respiratory).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('region', { name: 'Respiratory finding slider' }))
      .toHaveTextContent('Rate: 24 breaths/min')
    expect(screen.getByRole('region', { name: 'Respiratory finding slider' }))
      .toHaveTextContent('Missing: Strength')

    await user.click(pulse)
    expect(screen.queryByRole('region', { name: 'Respiratory finding slider' })).toBeNull()
    expect(screen.getByRole('region', { name: 'Pulse finding slider' }))
      .toHaveTextContent('Rate: 112 bpm')
    expect(screen.getByRole('region', { name: 'Pulse finding slider' }))
      .toHaveTextContent('Missing: Rhythm, Strength')
  })

  it('keeps a confirmed control selected when its slider is closed', async () => {
    const user = userEvent.setup()
    renderControls({ 'pulse-rate': '90 bpm' })

    const pulse = screen.getByRole('button', { name: 'Pulse' })
    await user.click(pulse)
    await user.click(pulse)

    expect(pulse).toHaveAttribute('aria-pressed', 'true')
    expect(pulse).toHaveClass('border-ecg-green', 'bg-black', 'text-ecg-green')
    expect(pulse).not.toHaveClass('bg-ecg-green')
    expect(screen.queryByRole('region', { name: 'Pulse finding slider' })).toBeNull()
  })

  it('uses green icons and labels on black for every confirmed SNS control', async () => {
    const user = userEvent.setup()
    renderControls()

    for (const name of ['Pulse', 'Respiratory', 'Skin/Extremities']) {
      const control = screen.getByRole('button', { name })
      await user.click(control)

      expect(control).toHaveClass('border-ecg-green', 'bg-black', 'text-ecg-green')
      expect(control).not.toHaveClass('bg-ecg-green')
      expect(within(control).getByRole('img')).toHaveClass('bg-current', 'text-ecg-green')
      expect(within(control).getByRole('heading', { name })).toHaveClass('text-ecg-green')
    }
  })

  it('shows Skin/Extremities as a one-note slider without field labels', async () => {
    const user = userEvent.setup()
    renderControls({ 'skin-extremities-note': 'Pale\nCool' })

    await user.click(screen.getByRole('button', { name: 'Skin/Extremities' }))
    const slider = screen.getByRole('region', { name: 'Skin/Extremities finding slider' })
    expect(slider).toHaveTextContent('Pale')
    expect(slider).toHaveTextContent('Cool')
    expect(slider).not.toHaveTextContent('Missing:')
    expect(slider).not.toHaveTextContent('Skin/Extremities:')
  })
})
