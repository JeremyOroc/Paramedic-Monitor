import { describe, expect, it, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { useMonitorStore } from '@/store/monitorStore'

import { CallerInfoForm } from '../CallerInfoForm'

describe('CallerInfoForm', () => {
  beforeEach(() => {
    useMonitorStore.getState().reset()
  })

  it('renders all caller info fields', () => {
    render(<CallerInfoForm />)

    expect(screen.getByRole('heading', { name: 'Caller Info' })).toBeInTheDocument()
    expect(screen.getByLabelText('Auto-sort caller info')).toBeInTheDocument()
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
  })

  it('renders dispatch countdown before Call / Priority / MPDS', () => {
    render(<CallerInfoForm />)

    const formText = screen.getByRole('heading', { name: 'Caller Info' })
      .closest('section')?.textContent ?? ''
    expect(formText.indexOf('Dispatch countdown')).toBeGreaterThan(-1)
    expect(formText.indexOf('Call / Priority / MPDS')).toBeGreaterThan(-1)
    expect(formText.indexOf('Dispatch countdown')).toBeLessThan(
      formText.indexOf('Call / Priority / MPDS'),
    )
  })

  it('updates caller info draft values', async () => {
    const user = userEvent.setup()
    render(<CallerInfoForm />)

    await user.type(screen.getByLabelText('Adresse'), '123 Rue Principale')
    await user.type(screen.getByLabelText('Probleme'), 'Douleur thoracique')

    expect(useMonitorStore.getState().callerInfoDraft.address).toBe('123 Rue Principale')
    expect(useMonitorStore.getState().callerInfoDraft.problem).toBe('Douleur thoracique')
  })

  it('auto-sorts labelled paste text into the main caller info draft fields', () => {
    render(<CallerInfoForm />)

    fireEvent.change(screen.getByLabelText('Auto-sort caller info'), {
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
    render(<CallerInfoForm />)

    fireEvent.change(screen.getByLabelText('Auto-sort caller info'), {
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
        'DETAILS: Sitting upright',
        'UNITS ASSIGNED: Medic 421',
      ].join('\n'),
    )
    expect(draft.update).toBe('Police on scene')
    expect(draft.time).toBe('14:35')
  })

  it('auto-sort leaves draft fields unchanged when their labels are missing', () => {
    useMonitorStore.getState().setCallerInfoDraft('callNumber', 'Existing call')
    useMonitorStore.getState().setCallerInfoDraft('priority', 'Existing priority')
    useMonitorStore.getState().setCallerInfoDraft('address', 'Existing address')
    render(<CallerInfoForm />)

    fireEvent.change(screen.getByLabelText('Auto-sort caller info'), {
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
    render(<CallerInfoForm />)

    fireEvent.change(screen.getByLabelText('Auto-sort caller info'), {
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
    render(<CallerInfoForm />)

    fireEvent.change(screen.getByLabelText('Auto-sort caller info'), {
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
    render(<CallerInfoForm />)

    fireEvent.change(screen.getByLabelText('Auto-sort caller info'), {
      target: { value: 'Adresse: 123 Rue Principale' },
    })

    const state = useMonitorStore.getState()
    expect(state.callerInfoDraft.address).toBe('123 Rue Principale')
    expect(state.callerInfoSaved.address).toBe('')
    expect(state.callerInfoConfirmed.address).toBe('')
  })

  it('lets the instructor name the extra caller info rows', async () => {
    const user = userEvent.setup()
    render(<CallerInfoForm />)

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
    render(<CallerInfoForm />)

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

    render(<CallerInfoForm />)

    expect(screen.getByLabelText('Extra 1 title')).toBeInTheDocument()
    expect(screen.getByLabelText('Extra 2 title')).toBeInTheDocument()
    expect(screen.queryByLabelText('Extra 3 title')).toBeNull()
    expect(screen.getByRole('button', { name: 'Add extra' })).toBeEnabled()
  })
})
