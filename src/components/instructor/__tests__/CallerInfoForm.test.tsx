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
    expect(screen.queryByLabelText('Extra 1 title')).toBeNull()
    expect(screen.getByRole('button', { name: 'Add extra' })).toBeEnabled()
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
