import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
  EMPTY_PATIENT_INFORMATION_TEXT,
  parsePatientInformationAutoSort,
  type PatientInformationTextState,
} from '@/lib/patientInformationAutoSort'
import {
  PatientInformationPanel,
  type PatientInfoChecklist,
} from '../PatientInformationPanel'

const emptySelected: Record<PatientInfoChecklist, ReadonlySet<string>> = {
  sample: new Set<string>(),
  opqrst: new Set<string>(),
}

function renderPanel({
  selected = emptySelected,
  onToggle = vi.fn(),
}: {
  selected?: Record<PatientInfoChecklist, ReadonlySet<string>>
  onToggle?: (checklist: PatientInfoChecklist, letter: string) => void
} = {}) {
  function PanelHarness() {
    const [autoSortText, setAutoSortText] = useState('')
    const [values, setValues] = useState<PatientInformationTextState>(
      EMPTY_PATIENT_INFORMATION_TEXT,
    )

    return (
      <PatientInformationPanel
        selected={selected}
        autoSortText={autoSortText}
        values={values}
        onAutoSortChange={(value) => {
          setAutoSortText(value)
          setValues(parsePatientInformationAutoSort(value))
        }}
        onTextChange={(checklist, letter, value) =>
          setValues((current) => ({
            ...current,
            [checklist]: {
              ...current[checklist],
              [letter]: value,
            },
          }))
        }
        onToggle={onToggle}
      />
    )
  }

  return render(<PanelHarness />)
}

describe('PatientInformationPanel', () => {
  it('renders Sample and OPQRST checklist sections', () => {
    renderPanel()

    const sample = screen.getByRole('region', { name: 'Sample' })
    const opqrst = screen.getByRole('region', { name: 'OPQRST' })

    expect(screen.getByLabelText('Auto-sort patient information')).toBeInTheDocument()
    for (const letter of ['S', 'A', 'M', 'P', 'L', 'E']) {
      expect(within(sample).getByRole('button', { name: letter })).toBeInTheDocument()
      expect(
        within(sample).getByLabelText(`Sample ${letter} information`),
      ).toBeInTheDocument()
    }
    for (const letter of ['O', 'P', 'Q', 'R', 'S', 'T']) {
      expect(within(opqrst).getByRole('button', { name: letter })).toBeInTheDocument()
      expect(
        within(opqrst).getByLabelText(`OPQRST ${letter} information`),
      ).toBeInTheDocument()
    }
  })

  it('renders each checklist as a compact left-aligned vertical column', () => {
    renderPanel()

    expect(screen.getByTestId('patient-info-letter-column-sample')).toHaveClass(
      'flex-col',
      'items-start',
    )
    expect(screen.getByTestId('patient-info-letter-column-opqrst')).toHaveClass(
      'flex-col',
      'items-start',
    )
    expect(
      within(screen.getByRole('region', { name: 'Sample' })).getByRole('button', {
        name: 'S',
      }),
    ).toHaveClass('h-12', 'w-12')
  })

  it('updates the matching letter text input when typed manually', async () => {
    const user = userEvent.setup()
    renderPanel()

    await user.type(screen.getByLabelText('Sample S information'), 'Chest pain')

    expect(screen.getByLabelText('Sample S information')).toHaveValue('Chest pain')
    expect(screen.getByLabelText('OPQRST S information')).toHaveValue('')
  })

  it('auto-sorts SAMPLE and OPQRST letter text without selecting green letters', async () => {
    const user = userEvent.setup()
    renderPanel()

    await user.type(
      screen.getByLabelText('Auto-sort patient information'),
      [
        'S: Chest pain',
        'A: Aspirin',
        'P: Asthma',
        'O: 20 minutes',
        'P: Worse breathing',
        'S: 8/10',
      ].join('\n'),
    )

    expect(screen.getByLabelText('Sample S information')).toHaveValue('Chest pain')
    expect(screen.getByLabelText('Sample A information')).toHaveValue('Aspirin')
    expect(screen.getByLabelText('Sample P information')).toHaveValue('Asthma')
    expect(screen.getByLabelText('OPQRST O information')).toHaveValue('20 minutes')
    expect(screen.getByLabelText('OPQRST P information')).toHaveValue('Worse breathing')
    expect(screen.getByLabelText('OPQRST S information')).toHaveValue('8/10')
    expect(
      within(screen.getByRole('region', { name: 'Sample' })).getByRole('button', {
        name: 'S',
      }),
    ).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onToggle with the checklist and letter when clicked', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    renderPanel({ onToggle })

    await user.click(
      within(screen.getByRole('region', { name: 'Sample' })).getByRole('button', {
        name: 'S',
      }),
    )
    await user.click(
      within(screen.getByRole('region', { name: 'OPQRST' })).getByRole('button', {
        name: 'O',
      }),
    )

    expect(onToggle).toHaveBeenCalledWith('sample', 'S')
    expect(onToggle).toHaveBeenCalledWith('opqrst', 'O')
  })

  it('renders active letters with green selected styling', () => {
    renderPanel({
      selected: {
        sample: new Set(['S']),
        opqrst: new Set(['O']),
      },
    })

    expect(
      within(screen.getByRole('region', { name: 'Sample' })).getByRole('button', {
        name: 'S',
      }),
    ).toHaveClass('bg-ecg-green', 'text-black')
    expect(
      within(screen.getByRole('region', { name: 'OPQRST' })).getByRole('button', {
        name: 'O',
      }),
    ).toHaveAttribute('aria-pressed', 'true')
  })
})
