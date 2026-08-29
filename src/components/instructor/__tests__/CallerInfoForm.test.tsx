import { describe, expect, it, beforeEach, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { useMonitorStore } from '@/store/monitorStore'
import { JOHN_ABBOTT_ADDRESS } from '@/types/dispatchRoute'
import {
  CALLER_INFO_AUTO_SORT_FIELDS,
  parseCallerInfoAutoSort,
} from '@/lib/callerInfoAutoSort'

import { CallerInfoForm } from '../CallerInfoForm'

function renderCallerInfoForm({ expand = true }: { expand?: boolean } = {}) {
  const handleAutoSortChange = (value: string) => {
    const parsed = parseCallerInfoAutoSort(value)

    for (const field of CALLER_INFO_AUTO_SORT_FIELDS) {
      const parsedValue = parsed[field]
      if (parsedValue !== undefined) {
        useMonitorStore.getState().setCallerInfoDraft(field, parsedValue)
      }
    }
  }

  const rendered = render(
    <CallerInfoForm
      autoSortText=""
      onAutoSortChange={handleAutoSortChange}
      scenarioTitle=""
      onScenarioTitleChange={vi.fn()}
    />,
  )

  if (expand) {
    fireEvent.click(screen.getByRole('button', { name: 'Expand Caller Info' }))
  }

  return rendered
}

describe('CallerInfoForm', () => {
  beforeEach(() => {
    useMonitorStore.getState().reset()
  })

  it('renders all caller info fields', () => {
    renderCallerInfoForm()

    expect(screen.getByRole('heading', { name: 'Caller Info' })).toBeInTheDocument()
    expect(screen.getByLabelText('Scenario title')).toBeInTheDocument()
    expect(screen.getByLabelText('Auto-sort scenario')).toBeInTheDocument()
    expect(screen.getByText('Call / Priority / MPDS')).toBeInTheDocument()
    expect(screen.getByLabelText('Call #')).toBeInTheDocument()
    expect(screen.getByLabelText('Priority')).toBeInTheDocument()
    expect(screen.getByLabelText('MPDS Code')).toBeInTheDocument()
    expect(screen.queryByLabelText('Intervention prioritaire code')).toBeNull()
    expect(screen.getByLabelText('Adresse')).toBeInTheDocument()
    expect(screen.getByLabelText('Probleme')).toBeInTheDocument()
    expect(screen.getByLabelText('Information')).toBeInTheDocument()
    expect(screen.getByLabelText('Mise a jour')).toBeInTheDocument()
    expect(screen.getByLabelText('Heure')).toBeInTheDocument()
    expect(screen.queryByLabelText('Extra 1 title')).toBeNull()
    expect(screen.getByRole('button', { name: 'Add extra' })).toBeEnabled()
    expect(screen.queryByText('Analyse')).toBeNull()
    expect(screen.queryByRole('button', { name: /Save Scenario/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Delete Scenario/ })).toBeNull()
  })

  it('starts collapsed and expands the complete editor from the header control', async () => {
    const user = userEvent.setup()
    renderCallerInfoForm({ expand: false })

    const expand = screen.getByRole('button', { name: 'Expand Caller Info' })
    expect(expand).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(screen.queryByLabelText('Scenario title')).toBeNull()
    expect(screen.queryByRole('button', { name: /Save Scenario/ })).toBeNull()

    await user.click(expand)
    expect(screen.getByRole('button', { name: 'Collapse Caller Info' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(screen.getByLabelText('Scenario title')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Save Scenario/ })).toBeNull()
  })

  it('renders dispatch countdown before Call / Priority / MPDS', () => {
    renderCallerInfoForm()

    const formText = screen.getByRole('heading', { name: 'Caller Info' })
      .closest('section')?.textContent ?? ''
    expect(formText.indexOf('Dispatch countdown')).toBeGreaterThan(-1)
    expect(formText.indexOf('Call / Priority / MPDS')).toBeGreaterThan(-1)
    expect(formText.indexOf('Dispatch countdown')).toBeLessThan(
      formText.indexOf('Call / Priority / MPDS'),
    )
  })

  it('renders response route controls with John Abbott as the default start', () => {
    renderCallerInfoForm()

    expect(screen.getByText('Response route')).toBeInTheDocument()
    expect(screen.getByLabelText('Start address')).toHaveValue(JOHN_ABBOTT_ADDRESS)
    expect(useMonitorStore.getState().dispatchRouteDraft.originAddress).toBe(
      JOHN_ABBOTT_ADDRESS,
    )
  })

  it('bases the route ETA preview on the dispatch countdown', () => {
    useMonitorStore.getState().setDispatchMinutes(2)
    useMonitorStore.getState().setDispatchSeconds(15)
    renderCallerInfoForm()

    const routeSection = screen.getByText('Response route').closest('div')
    expect(routeSection).toHaveTextContent('ETA 3 min')
  })

  it('shows the route ETA as at scene when no dispatch countdown is set', () => {
    renderCallerInfoForm()

    const routeSection = screen.getByText('Response route').closest('div')
    expect(routeSection).toHaveTextContent('ETA At scene')
  })

  it('updates caller info draft values', async () => {
    const user = userEvent.setup()
    renderCallerInfoForm()

    await user.type(screen.getByLabelText('Adresse'), '123 Rue Principale')
    await user.type(screen.getByLabelText('Probleme'), 'Douleur thoracique')

    expect(useMonitorStore.getState().callerInfoDraft.address).toBe('123 Rue Principale')
    expect(useMonitorStore.getState().callerInfoDraft.problem).toBe('Douleur thoracique')
  })

  it('auto-sorts labelled paste text into the main caller info draft fields', () => {
    renderCallerInfoForm()

    fireEvent.change(screen.getByLabelText('Auto-sort scenario'), {
      target: {
        value: [
          'Adresse: 123 Rue Principale',
          'Probleme: Douleur thoracique',
          'Information: Patient conscient',
          'Mise a jour: Police sur place',
          'Heure: 14:35',
        ].join('\n'),
      },
    })

    const draft = useMonitorStore.getState().callerInfoDraft
    expect(draft.address).toBe('123 Rue Principale')
    expect(draft.problem).toBe('Douleur thoracique')
    expect(draft.information).toBe('Patient conscient')
    expect(draft.update).toBe('Police sur place')
    expect(draft.time).toBe('14:35')
  })

  it('auto-sorts dispatch labels into call, priority and MPDS fields', () => {
    renderCallerInfoForm()

    fireEvent.change(screen.getByLabelText('Auto-sort scenario'), {
      target: {
        value: [
          'CALL #: C-2026-15',
          'PRIORITY: P1',
          'MPDS CODE: 06D02',
          'ADDRESS: 123 Rue Principale',
          'PATIENT: Jean Tremblay',
          'CHIEF COMPLAINT: Difficulty breathing',
          'DETAILS: Sitting upright',
          'STATUS: Police on scene',
          'UNITS ASSIGNED: Medic 421',
          'TIME RECEIVED: 14:35',
        ].join('\n'),
      },
    })

    const draft = useMonitorStore.getState().callerInfoDraft
    expect(draft.callNumber).toBe('C-2026-15')
    expect(draft.priority).toBe('P1')
    expect(draft.mpdsCode).toBe('06D02')
    expect(draft.address).toBe('123 Rue Principale')
    expect(draft.problem).toBe('Difficulty breathing')
    expect(draft.information).toBe(
      [
        'PATIENT: Jean Tremblay',
        'Sitting upright',
        'UNITS ASSIGNED: Medic 421',
      ].join('\n'),
    )
    expect(draft.update).toBe('Police on scene')
    expect(draft.time).toBe('14:35')
  })

  it('auto-sorts dispatch labels with address values on following lines', () => {
    renderCallerInfoForm()

    fireEvent.change(screen.getByLabelText('Auto-sort scenario'), {
      target: {
        value: [
          'CALL #: 2026-0612-1712',
          'PRIORITY: P1 / DELTA',
          'MPDS CODE: 26-D-1',
          'ADDRESS:',
          '4480 Boulevard Saint-Jean, Dollard-des-Ormeaux, QC',
          'CHIEF COMPLAINT:',
          'Male, 67 years old, fever and difficulty breathing',
          'STATUS:',
          '10-100 Unstable',
          'TIME RECEIVED:',
          '17:12',
        ].join('\n'),
      },
    })

    const draft = useMonitorStore.getState().callerInfoDraft
    expect(draft.callNumber).toBe('2026-0612-1712')
    expect(draft.priority).toBe('P1 / DELTA')
    expect(draft.mpdsCode).toBe('26-D-1')
    expect(draft.address).toBe('4480 Boulevard Saint-Jean, Dollard-des-Ormeaux, QC')
    expect(draft.problem).toBe('Male, 67 years old, fever and difficulty breathing')
    expect(draft.update).toBe('10-100 Unstable')
    expect(draft.time).toBe('17:12')
  })

  it('auto-sorts only the time value from Time Received before later sections', () => {
    renderCallerInfoForm()

    fireEvent.change(screen.getByLabelText('Auto-sort scenario'), {
      target: {
        value: [
          'TIME RECEIVED:',
          '17:12',
          '',
          '### Patient Presentation',
          '',
          'Age/Sex: 67-year-old male',
          'Appearance: confused and short of breath',
        ].join('\n'),
      },
    })

    expect(useMonitorStore.getState().callerInfoDraft.time).toBe('17:12')
  })

  it('auto-sort leaves draft fields unchanged when their labels are missing', () => {
    useMonitorStore.getState().setCallerInfoDraft('callNumber', 'Existing call')
    useMonitorStore.getState().setCallerInfoDraft('priority', 'Existing priority')
    useMonitorStore.getState().setCallerInfoDraft('address', 'Existing address')
    renderCallerInfoForm()

    fireEvent.change(screen.getByLabelText('Auto-sort scenario'), {
      target: {
        value: [
          'MPDS CODE: 31D03',
          'CHIEF COMPLAINT: Chest pain',
        ].join('\n'),
      },
    })

    const draft = useMonitorStore.getState().callerInfoDraft
    expect(draft.callNumber).toBe('Existing call')
    expect(draft.priority).toBe('Existing priority')
    expect(draft.address).toBe('Existing address')
    expect(draft.mpdsCode).toBe('31D03')
    expect(draft.problem).toBe('Chest pain')
  })

  it('auto-sorts pasted labels whose values are on following lines', () => {
    renderCallerInfoForm()

    fireEvent.change(screen.getByLabelText('Auto-sort scenario'), {
      target: {
        value: [
          'Adresse',
          '789 Rue du Parc',
          'Probleme',
          'Syncope',
          'Heure',
          '17:20',
        ].join('\n'),
      },
    })

    const draft = useMonitorStore.getState().callerInfoDraft
    expect(draft.address).toBe('789 Rue du Parc')
    expect(draft.problem).toBe('Syncope')
    expect(draft.time).toBe('17:20')
  })

  it('auto-sort overwrites matching fields without creating extra rows', () => {
    useMonitorStore.getState().setCallerInfoDraft('address', 'Old address')
    useMonitorStore.getState().setCallerInfoDraft('problem', 'Old problem')
    renderCallerInfoForm()

    fireEvent.change(screen.getByLabelText('Auto-sort scenario'), {
      target: {
        value: [
          'Address: 456 Avenue Centrale',
          'Problem: Difficult breathing',
          'Access: Side door',
        ].join('\n'),
      },
    })

    const draft = useMonitorStore.getState().callerInfoDraft
    expect(draft.address).toBe('456 Avenue Centrale')
    expect(draft.problem).toBe('Difficult breathing')
    expect(draft.extra1Label).toBe('')
    expect(draft.extra1).toBe('')
    expect(screen.queryByLabelText('Extra 1 title')).toBeNull()
  })

  it('auto-sort updates draft only before Save', () => {
    renderCallerInfoForm()

    fireEvent.change(screen.getByLabelText('Auto-sort scenario'), {
      target: { value: 'Adresse: 123 Rue Principale' },
    })

    const state = useMonitorStore.getState()
    expect(state.callerInfoDraft.address).toBe('123 Rue Principale')
    expect(state.callerInfoSaved.address).toBe('')
    expect(state.callerInfoConfirmed.address).toBe('')
  })

  it('lets the instructor name the extra caller info rows', async () => {
    const user = userEvent.setup()
    renderCallerInfoForm()

    await user.click(screen.getByRole('button', { name: 'Add extra' }))
    await user.type(screen.getByLabelText('Extra 1 title'), 'Acces')
    await user.type(screen.getByLabelText('Extra 1 input'), 'Porte cote nord')

    expect(useMonitorStore.getState().callerInfoDraft.extra1Label).toBe('Acces')
    expect(useMonitorStore.getState().callerInfoDraft.extra1).toBe('Porte cote nord')
    expect(screen.queryByText('Acces')).toBeNull()
    expect(screen.getByPlaceholderText('Title')).toBeInTheDocument()
    expect(screen.getByLabelText('Extra 1 input')).toHaveAttribute('placeholder', 'Input')
  })

  it('adds extra rows one at a time and caps at three', async () => {
    const user = userEvent.setup()
    renderCallerInfoForm()

    const addExtra = screen.getByRole('button', { name: 'Add extra' })

    await user.click(addExtra)
    expect(screen.getByLabelText('Extra 1 title')).toBeInTheDocument()
    expect(screen.queryByLabelText('Extra 2 title')).toBeNull()
    expect(addExtra).toBeEnabled()

    await user.click(addExtra)
    expect(screen.getByLabelText('Extra 2 title')).toBeInTheDocument()
    expect(screen.queryByLabelText('Extra 3 title')).toBeNull()
    expect(addExtra).toBeEnabled()

    await user.click(addExtra)
    expect(screen.getByLabelText('Extra 3 title')).toBeInTheDocument()
    expect(addExtra).toBeDisabled()
  })

  it('reopens saved extra rows when caller info already has values', () => {
    useMonitorStore.getState().setCallerInfoDraft('extra2Label', 'Code porte')

    renderCallerInfoForm()

    expect(screen.getByLabelText('Extra 1 title')).toBeInTheDocument()
    expect(screen.getByLabelText('Extra 2 title')).toBeInTheDocument()
    expect(screen.queryByLabelText('Extra 3 title')).toBeNull()
    expect(screen.getByRole('button', { name: 'Add extra' })).toBeEnabled()
  })
})
