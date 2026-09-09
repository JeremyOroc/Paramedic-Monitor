import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { HospitalDirectoryPanel } from '@/components/monitor/HospitalDirectoryPanel'

describe('HospitalDirectoryPanel', () => {
  it('uses the exact three columns, two sections, and 30% overlay width', () => {
    render(
      <HospitalDirectoryPanel
        distances={{}}
        distanceStatus="loading"
        selectedHospitalId={null}
        pendingHospitalId={null}
        failedHospitalId={null}
        disabled={false}
        onSelectHospital={() => {}}
      />,
    )

    const directory = screen.getByRole('complementary', { name: 'Receiving Hospital Directory' })
    expect(directory).toHaveClass('w-[30%]')
    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Hospital',
      'Designation',
      'Key Notes',
      'Hospital',
      'Designation',
      'Key Notes',
    ])
    expect(screen.getByRole('region', { name: 'Adult Hospitals (Urgences-santé)' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Pediatric Hospitals' })).toBeInTheDocument()
    expect(screen.getByText('Calculating driving distances…')).toBeInTheDocument()
  })

  it('orders each section by driving distance and makes a row hospital selectable', () => {
    const onSelectHospital = vi.fn()
    render(
      <HospitalDirectoryPanel
        distances={{ chum: 5000, 'montreal-general': 1000 }}
        distanceStatus="ready"
        selectedHospitalId={null}
        pendingHospitalId={null}
        failedHospitalId={null}
        disabled={false}
        onSelectHospital={onSelectHospital}
      />,
    )

    const adult = screen.getByRole('region', { name: 'Adult Hospitals (Urgences-santé)' })
    const rows = within(adult).getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Montreal General Hospital')
    fireEvent.click(within(rows[1]).getByRole('button', { name: 'Montreal General Hospital' }))
    expect(onSelectHospital).toHaveBeenCalledWith('montreal-general')
    fireEvent.keyDown(rows[1], { key: 'Enter' })
    expect(onSelectHospital).toHaveBeenCalledTimes(2)
  })
})
