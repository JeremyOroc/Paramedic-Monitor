import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { PatientPhysicalFindings } from '@/lib/patientPhysicalAutoSort'
import {
  PatientPhysicalPanel,
  type PatientPhysicalSelection,
} from '../PatientPhysicalPanel'

type PatientPhysicalIconGroupId =
  | 'respiratory'
  | 'pulse'
  | 'skin-extremities'
  | 'scene-environment'

function renderPanel({ findings = {} }: { findings?: PatientPhysicalFindings } = {}) {
  function PanelHarness() {
    const [selected, setSelected] = useState<Set<PatientPhysicalSelection>>(new Set())
    const [activeIconGroup, setActiveIconGroup] =
      useState<PatientPhysicalIconGroupId | null>(null)

    return (
      <PatientPhysicalPanel
        selected={selected}
        findings={findings}
        activeIconGroup={activeIconGroup}
        onToggle={(selection) =>
          setSelected((current) => {
            const next = new Set(current)
            if (next.has(selection)) {
              next.delete(selection)
            } else {
              next.add(selection)
            }
            return next
          })
        }
        onIconGroupClick={(selection) => {
          setSelected((current) => {
            if (current.has(selection)) return current
            const next = new Set(current)
            next.add(selection)
            return next
          })
          setActiveIconGroup((current) => (current === selection ? null : selection))
        }}
      />
    )
  }

  return render(<PanelHarness />)
}

describe('PatientPhysicalPanel', () => {
  it('renders the body outline image and selectable front and rear body regions', () => {
    renderPanel()

    expect(screen.getByRole('heading', { name: 'Patient Physical' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Auto-sort patient physical')).toBeNull()
    expect(screen.getByAltText('Front and back body outline')).toHaveAttribute(
      'src',
      '/images/patient-physical-outline.png',
    )

    for (const name of [
      'Front head',
      'Front neck',
      'Front chest',
      'Front trunk',
      'Front abdomen',
      'Front patient left shoulder',
      'Front patient right shoulder',
      'Front patient left upper arm',
      'Front patient right upper arm',
      'Front patient left lower arm',
      'Front patient right lower arm',
      'Front patient left hand',
      'Front patient right hand',
      'Front patient left upper leg',
      'Front patient right upper leg',
      'Front patient left lower leg',
      'Front patient right lower leg',
      'Front patient left foot',
      'Front patient right foot',
      'Rear head',
      'Rear neck',
      'Rear trunk',
      'Rear back',
      'Rear patient left shoulder',
      'Rear patient right shoulder',
      'Rear patient left upper arm',
      'Rear patient right upper arm',
      'Rear patient left lower arm',
      'Rear patient right lower arm',
      'Rear patient left hand',
      'Rear patient right hand',
      'Rear patient left upper leg',
      'Rear patient right upper leg',
      'Rear patient left lower leg',
      'Rear patient right lower leg',
      'Rear patient left foot',
      'Rear patient right foot',
    ]) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    }
  })

  it('renders the body map on a dark fixed container', () => {
    renderPanel()

    expect(screen.getByAltText('Front and back body outline').parentElement).not.toHaveClass(
      'bg-white',
    )
    expect(screen.getByAltText('Front and back body outline').parentElement).toHaveClass(
      'bg-neutral-950',
      'aspect-square',
      'self-start',
    )
    expect(screen.getByAltText('Front and back body outline')).toHaveClass(
      'absolute',
      'h-full',
      'w-full',
      'object-contain',
    )
  })

  it('renders pulse, respiratory, skin extremities, and scene environment icon toggle cards on the left', () => {
    renderPanel()

    expect(screen.getByRole('region', { name: 'Pulse icon findings' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Respiratory icon findings' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Skin/Extremities icon findings' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Scene/Environment icon findings' })).toBeInTheDocument()
    expect(screen.getByAltText('Pulse findings')).toHaveAttribute(
      'src',
      '/images/patient-physical-pulse.png',
    )
    expect(screen.getByAltText('Respiratory findings')).toHaveAttribute(
      'src',
      '/images/patient-physical-lung.png',
    )
    expect(screen.getByAltText('Skin and extremities findings')).toHaveAttribute(
      'src',
      '/images/patient-physical-skin-extremities.png',
    )
    expect(screen.getByAltText('Scene and environment findings')).toHaveAttribute(
      'src',
      '/images/patient-physical-scene-environment.png',
    )
    const pulse = screen.getByRole('button', { name: 'Pulse' })
    const respiratory = screen.getByRole('button', { name: 'Respiratory' })
    const skinExtremities = screen.getByRole('button', { name: 'Skin/Extremities' })
    const sceneEnvironment = screen.getByRole('button', { name: 'Scene/Environment' })

    expect(pulse.compareDocumentPosition(respiratory)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(respiratory.compareDocumentPosition(skinExtremities)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(skinExtremities.compareDocumentPosition(sceneEnvironment)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
  })

  it('toggles selected body regions with green highlighting and click order', async () => {
    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByRole('button', { name: 'Rear back' }))
    await user.click(screen.getByRole('button', { name: 'Front head' }))
    await user.click(screen.getByRole('button', { name: 'Front abdomen' }))

    const selectedBodyParts = screen.getByLabelText('Selected body parts')
    const selectedLabels = within(selectedBodyParts)
      .getAllByText(/Rear back|Front head|Front abdomen/)
      .map((node) => node.textContent)

    expect(screen.getByRole('button', { name: 'Rear back' })).toHaveClass(
      'bg-ecg-green/45',
      'border-ecg-green',
    )
    expect(selectedLabels).toEqual(['Rear back', 'Front head', 'Front abdomen'])
  })

  it('shows provided physical findings as review markers without selected-panel text', () => {
    renderPanel({
      findings: {
        'front-chest': 'Left anterior chest tenderness\nEqual chest rise',
        'front-abdomen': 'Soft',
      },
    })

    const frontChest = screen.getByRole('button', { name: 'Front chest' })
    const frontAbdomen = screen.getByRole('button', { name: 'Front abdomen' })

    expect(frontChest).toHaveClass('border-pending-amber', 'bg-pending-amber/30')
    expect(within(frontChest).getByText('!')).toBeInTheDocument()
    expect(frontAbdomen).toHaveClass('border-pending-amber', 'bg-pending-amber/30')
    expect(screen.getByLabelText('Selected body parts')).toHaveTextContent('None')
    expect(screen.getByLabelText('Selected body parts')).not.toHaveTextContent(
      'Left anterior chest tenderness',
    )
  })

  it('turns a provided review marker green when clicked while keeping its text visible', async () => {
    const user = userEvent.setup()
    renderPanel({
      findings: {
        'front-chest': 'Left anterior chest tenderness',
      },
    })

    const frontChest = screen.getByRole('button', { name: 'Front chest' })
    await user.click(frontChest)

    expect(frontChest).toHaveAttribute('aria-pressed', 'true')
    expect(frontChest).toHaveClass('border-ecg-green', 'bg-ecg-green/45')
    expect(within(frontChest).queryByText('!')).toBeNull()
    expect(screen.getByLabelText('Selected body parts')).toHaveTextContent(
      'Left anterior chest tenderness',
    )
  })

  it('shows body findings on the intended regions only', () => {
    renderPanel({
      findings: {
        'front-patient-left-upper-leg': 'Swelling',
        'front-patient-left-lower-leg': 'Swelling',
        'front-patient-left-foot': 'Swelling',
        'back-back': 'Midline lumbar tenderness',
        'front-chest': 'Right rib tenderness',
      },
    })

    expect(screen.getByRole('button', { name: 'Front patient left upper leg' })).toHaveClass(
      'border-pending-amber',
    )
    expect(screen.getByRole('button', { name: 'Rear back' })).toHaveClass(
      'border-pending-amber',
    )
    expect(screen.getByRole('button', { name: 'Front chest' })).toHaveClass(
      'border-pending-amber',
    )
    expect(screen.getByRole('button', { name: 'Rear patient left upper leg' })).not.toHaveClass(
      'border-pending-amber',
    )
  })

  it('clicks icon cards to turn them green and open combined sliders', async () => {
    const user = userEvent.setup()
    renderPanel({
      findings: {
        'respiratory-rate': '24 breaths/min',
        'respiratory-rhythm': 'Regular',
        'pulse-rate': '112 bpm',
      },
    })

    const respiratory = screen.getByRole('button', { name: 'Respiratory' })
    const pulse = screen.getByRole('button', { name: 'Pulse' })

    expect(respiratory).toHaveClass('border-pending-amber')
    await user.click(respiratory)

    expect(respiratory).toHaveAttribute('aria-pressed', 'true')
    expect(respiratory).toHaveClass('border-ecg-green', 'bg-ecg-green')
    const respiratorySlider = screen.getByRole('region', { name: 'Respiratory finding slider' })
    expect(respiratorySlider).toHaveTextContent('Rate: 24 breaths/min')
    expect(respiratorySlider).toHaveTextContent('Rhythm: Regular')
    expect(respiratorySlider).toHaveTextContent('Missing: Strength')

    await user.click(respiratory)
    expect(screen.queryByRole('region', { name: 'Respiratory finding slider' })).toBeNull()

    await user.click(pulse)
    const pulseSlider = screen.getByRole('region', { name: 'Pulse finding slider' })
    expect(pulseSlider).toHaveTextContent('Rate: 112 bpm')
    expect(pulseSlider).toHaveTextContent('Missing: Rhythm, Strength')
  })

  it('shows skin and scene icon findings as one-note sliders without missing-field warnings', async () => {
    const user = userEvent.setup()
    renderPanel({
      findings: {
        'skin-extremities-note': 'Pale\nCool',
        'scene-environment-note': 'Witnessed fall\nNo environmental hazards',
      },
    })

    const skinExtremities = screen.getByRole('button', { name: 'Skin/Extremities' })
    const sceneEnvironment = screen.getByRole('button', { name: 'Scene/Environment' })

    expect(skinExtremities).toHaveClass('border-pending-amber')
    expect(sceneEnvironment).toHaveClass('border-pending-amber')

    await user.click(skinExtremities)
    const skinSlider = screen.getByRole('region', { name: 'Skin/Extremities finding slider' })
    expect(skinSlider).toHaveTextContent('Pale')
    expect(skinSlider).toHaveTextContent('Cool')
    expect(skinSlider).not.toHaveTextContent('Missing:')
    expect(skinSlider).not.toHaveTextContent('Skin/Extremities:')

    await user.click(sceneEnvironment)
    const sceneSlider = screen.getByRole('region', { name: 'Scene/Environment finding slider' })
    expect(sceneSlider).toHaveTextContent('Witnessed fall')
    expect(sceneSlider).toHaveTextContent('No environmental hazards')
    expect(sceneSlider).not.toHaveTextContent('Missing:')
    expect(sceneSlider).not.toHaveTextContent('Scene/Environment:')
  })

  it('wraps long confirmed finding text without letting the selected panel stretch the map', async () => {
    const user = userEvent.setup()
    renderPanel({
      findings: {
        'front-chest':
          'Very long chest assessment finding with multiple details that should wrap inside the selected panel instead of stretching the body map container out of shape',
      },
    })

    await user.click(screen.getByRole('button', { name: 'Front chest' }))

    expect(screen.getByAltText('Front and back body outline').parentElement).toHaveClass(
      'aspect-square',
      'self-start',
    )
    expect(screen.getByLabelText('Selected body parts')).toHaveClass('grid', 'min-w-0')
    expect(
      screen.getByText(
        'Very long chest assessment finding with multiple details that should wrap inside the selected panel instead of stretching the body map container out of shape',
      ),
    ).toHaveClass('whitespace-pre-wrap', 'break-words')
  })

  it('keeps representative region coordinates aligned to the body outline', () => {
    renderPanel()

    expect(screen.getByRole('button', { name: 'Front chest' })).toHaveClass(
      'left-[26.1%]',
      'top-[23.4%]',
      'h-[7.6%]',
      'w-[16.4%]',
    )
    expect(screen.getByRole('button', { name: 'Front abdomen' })).toHaveClass(
      'top-[36.6%]',
      'h-[10.3%]',
    )
    expect(screen.getByRole('button', { name: 'Front trunk' })).toHaveClass(
      'top-[48.6%]',
      'h-[8.4%]',
    )
    expect(screen.getByRole('button', { name: 'Front patient right upper arm' })).toHaveClass(
      'top-[27.1%]',
      'h-[14.7%]',
    )
    expect(screen.getByRole('button', { name: 'Front patient right upper leg' })).toHaveClass(
      'top-[58.6%]',
      'h-[15.7%]',
    )
  })
})
