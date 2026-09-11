import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { HospitalDirectoryPanel } from '@/components/monitor/HospitalDirectoryPanel'

describe('HospitalDirectoryPanel', () => {
  it('uses the approved readable ten-row fullscreen directory geometry', () => {
    render(
      <HospitalDirectoryPanel
        distances={{ 'montreal-general': 1000 }}
        distanceStatus="loading"
        selectedHospitalId={null}
        pendingHospitalId="montreal-general"
        failedHospitalId="chum"
        disabled={false}
        onSelectHospital={() => {}}
      />,
    )

    const directory = screen.getByRole('complementary', { name: 'Receiving Hospital Directory' })
    expect(directory).toHaveClass('w-[30%]')
    expect(screen.getByText('Receiving Hospital Directory')).toHaveClass('text-base')
    expect(screen.getByText('Calculating driving distances…')).toHaveClass('text-xs')

    const scrollWindow = screen.getByTestId('hospital-directory-scroll')
    expect(scrollWindow).toHaveAttribute('data-visible-row-capacity', '10')
    expect(scrollWindow).toHaveClass('hospital-directory-scroll')

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

    const adultHeading = screen.getByRole('heading', { name: 'Adult Hospitals (Urgences-santé)' })
    expect(adultHeading).toHaveClass('text-sm', 'sticky')
    expect(screen.getAllByRole('columnheader')[0]?.parentElement?.parentElement).toHaveClass(
      'text-[11px]',
    )

    const hospitalRow = screen.getByTestId('hospital-row-montreal-general')
    expect(hospitalRow).toHaveClass('hospital-directory-row')
    expect(hospitalRow.closest('table')).toHaveClass('text-sm')
    expect(within(hospitalRow).getByRole('button', { name: 'Montreal General Hospital' })).toHaveClass(
      'hospital-directory-clamp',
    )
    expect(within(hospitalRow).getByRole('cell', { name: 'Tertiary' })).toHaveTextContent('Tertiary')
    expect(
      within(hospitalRow).getByRole('cell', {
        name: 'Major adult trauma, neurosurgery, ortho trauma',
      }),
    ).toHaveTextContent('Major adult trauma, neurosurgery, ortho trauma')
    expect(within(hospitalRow).getByText('1.0 km')).toHaveClass('text-xs')
    expect(within(hospitalRow).getByText('Routing…')).toHaveClass('text-sm')
    expect(within(screen.getByTestId('hospital-row-chum')).getByText('Route unavailable')).toHaveClass(
      'text-sm',
    )

    const pediatricRow = screen.getByTestId('hospital-row-sainte-justine')
    expect(pediatricRow.closest('table')).toHaveClass('text-sm')
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
    expect(
      screen.queryByText('Ordered by driving distance from current scene origin'),
    ).not.toBeInTheDocument()
    expect(rows[1]).toHaveTextContent('Montreal General Hospital')
    fireEvent.click(within(rows[1]).getByRole('button', { name: 'Montreal General Hospital' }))
    expect(onSelectHospital).toHaveBeenCalledWith('montreal-general')
    fireEvent.keyDown(rows[1], { key: 'Enter' })
    expect(onSelectHospital).toHaveBeenCalledTimes(2)
  })
})
