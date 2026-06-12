import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
  PatientInformationPanel,
  type PatientInfoChecklist,
} from '../PatientInformationPanel'

const emptySelected: Record<PatientInfoChecklist, ReadonlySet<string>> = {
  sample: new Set<string>(),
  opqrst: new Set<string>(),
}

describe('PatientInformationPanel', () => {
  it('renders Sample and OPQRST checklist sections', () => {
    render(<PatientInformationPanel selected={emptySelected} onToggle={vi.fn()} />)

    const sample = screen.getByRole('region', { name: 'Sample' })
    const opqrst = screen.getByRole('region', { name: 'OPQRST' })

    for (const letter of ['S', 'A', 'M', 'P', 'L', 'E']) {
      expect(within(sample).getByRole('button', { name: letter })).toBeInTheDocument()
    }
    for (const letter of ['O', 'P', 'Q', 'R', 'S', 'T']) {
      expect(within(opqrst).getByRole('button', { name: letter })).toBeInTheDocument()
    }
  })

  it('renders each checklist as a compact left-aligned vertical column', () => {
    render(<PatientInformationPanel selected={emptySelected} onToggle={vi.fn()} />)

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

  it('calls onToggle with the checklist and letter when clicked', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(<PatientInformationPanel selected={emptySelected} onToggle={onToggle} />)

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
    render(
      <PatientInformationPanel
        selected={{
          sample: new Set(['S']),
          opqrst: new Set(['O']),
        }}
        onToggle={vi.fn()}
      />,
    )

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
