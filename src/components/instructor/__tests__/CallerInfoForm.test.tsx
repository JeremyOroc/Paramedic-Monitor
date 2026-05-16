import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
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
    expect(screen.getByLabelText('Intervention prioritaire code')).toBeInTheDocument()
    expect(screen.getByLabelText('Adresse')).toBeInTheDocument()
    expect(screen.getByLabelText('Probleme')).toBeInTheDocument()
    expect(screen.getByLabelText('Information')).toBeInTheDocument()
    expect(screen.getByLabelText('Mise a jour')).toBeInTheDocument()
    expect(screen.getByLabelText('Heure')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Extra' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Extra 1 title')).toBeNull()
  })

  it('updates caller info draft values', async () => {
    const user = userEvent.setup()
    render(<CallerInfoForm />)

    await user.type(screen.getByLabelText('Adresse'), '123 Rue Principale')
    await user.type(screen.getByLabelText('Probleme'), 'Douleur thoracique')

    expect(useMonitorStore.getState().callerInfoDraft.address).toBe('123 Rue Principale')
    expect(useMonitorStore.getState().callerInfoDraft.problem).toBe('Douleur thoracique')
  })

  it('lets the instructor name the extra caller info rows', async () => {
    const user = userEvent.setup()
    render(<CallerInfoForm />)

    await user.click(screen.getByRole('button', { name: 'Add Extra' }))
    await user.type(screen.getByLabelText('Extra 1 title'), 'Acces')
    await user.type(screen.getByLabelText('Extra 1 input'), 'Porte cote nord')

    expect(useMonitorStore.getState().callerInfoDraft.extra1Label).toBe('Acces')
    expect(useMonitorStore.getState().callerInfoDraft.extra1).toBe('Porte cote nord')
    expect(screen.queryByText('Acces')).toBeNull()
    expect(screen.getByPlaceholderText('Title')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Input')).toBeInTheDocument()
  })

  it('adds extra rows one at a time up to three rows', async () => {
    const user = userEvent.setup()
    render(<CallerInfoForm />)

    await user.click(screen.getByRole('button', { name: 'Add Extra' }))
    expect(screen.getByLabelText('Extra 1 title')).toBeInTheDocument()
    expect(screen.queryByLabelText('Extra 2 title')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Add Extra' }))
    expect(screen.getByLabelText('Extra 2 title')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add Extra' }))
    expect(screen.getByLabelText('Extra 3 title')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add Extra' })).toBeNull()
  })

  it('shows existing extra rows when draft data already exists', () => {
    useMonitorStore.getState().setCallerInfoDraft('extra2Label', 'Contact')
    render(<CallerInfoForm />)

    expect(screen.getByLabelText('Extra 1 title')).toBeInTheDocument()
    expect(screen.getByLabelText('Extra 2 title')).toBeInTheDocument()
  })
})
