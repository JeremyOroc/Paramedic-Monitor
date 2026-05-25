import { describe, expect, it, beforeEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'

import { useMonitorStore } from '@/store/monitorStore'

import { SaveButton } from '../SaveButton'

describe('SaveButton', () => {
  beforeEach(() => {
    useMonitorStore.getState().reset()
  })

  it('is disabled when nothing is dirty', () => {
    render(<SaveButton />)
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('enables when caller info draft changes', () => {
    act(() => {
      useMonitorStore.getState().setCallerInfoDraft('time', '14:45')
    })
    render(<SaveButton />)
    expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled()
  })
})
