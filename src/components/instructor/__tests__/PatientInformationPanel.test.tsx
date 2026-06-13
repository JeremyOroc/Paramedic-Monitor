import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
  EMPTY_PATIENT_INFORMATION_TEXT,
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
  initialValues = EMPTY_PATIENT_INFORMATION_TEXT(),
  onToggle = vi.fn(),
}: {
  selected?: Record<PatientInfoChecklist, ReadonlySet<string>>
  initialValues?: PatientInformationTextState
  onToggle?: (checklist: PatientInfoChecklist, letter: string) => void
} = {}) {
  function PanelHarness() {
    const [values, setValues] = useState<PatientInformationTextState>(initialValues)

    return (
      <PatientInformationPanel
        selected={selected}
        values={values}
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
  function expectRowsToBeGreaterThanOne(element: HTMLElement) {
    expect(element.tagName).toBe('TEXTAREA')
    expect(Number(element.getAttribute('rows'))).toBeGreaterThan(1)
  }

  it('renders Sample and OPQRST checklist sections without a local auto-sort textarea', () => {
    renderPanel()

    const sample = screen.getByRole('region', { name: 'Sample' })
    const opqrst = screen.getByRole('region', { name: 'OPQRST' })

    expect(screen.queryByLabelText('Auto-sort patient information')).toBeNull()
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

  it('renders SAMPLE and OPQRST information fields as compact one-row textareas', () => {
    renderPanel()

    const sampleField = screen.getByLabelText('Sample S information')
    const opqrstField = screen.getByLabelText('OPQRST O information')

    expect(sampleField.tagName).toBe('TEXTAREA')
    expect(sampleField).toHaveAttribute('rows', '1')
    expect(opqrstField.tagName).toBe('TEXTAREA')
    expect(opqrstField).toHaveAttribute('rows', '1')
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

  it('auto-grows a manually typed long SAMPLE field', () => {
    renderPanel()

    const sampleField = screen.getByLabelText('Sample S information')
    fireEvent.change(sampleField, {
      target: {
        value:
          'Chest pain that started suddenly while walking upstairs and continues despite resting',
      },
    })

    expect(sampleField).toHaveValue(
      'Chest pain that started suddenly while walking upstairs and continues despite resting',
    )
    expectRowsToBeGreaterThanOne(sampleField)
  })

  it('renders auto-sorted text passed from admin state without selecting green letters', () => {
    renderPanel({
      initialValues: {
        sample: {
          S: 'Chest pain',
          A: 'Aspirin',
          M: '',
          P: 'Asthma',
          L: '',
          E: '',
        },
        opqrst: {
          O: '20 minutes',
          P: 'Worse breathing',
          Q: '',
          R: '',
          S: '8/10',
          T: '',
        },
      },
    })

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

  it('auto-grows long values passed from admin state', () => {
    renderPanel({
      initialValues: {
        sample: {
          ...EMPTY_PATIENT_INFORMATION_TEXT().sample,
          S: 'Severe crushing chest pain radiating into the left arm and jaw with nausea',
        },
        opqrst: {
          ...EMPTY_PATIENT_INFORMATION_TEXT().opqrst,
          O: 'Gradual onset after exertion while walking uphill for several minutes',
        },
      },
    })

    expectRowsToBeGreaterThanOne(screen.getByLabelText('Sample S information'))
    expectRowsToBeGreaterThanOne(screen.getByLabelText('OPQRST O information'))
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
