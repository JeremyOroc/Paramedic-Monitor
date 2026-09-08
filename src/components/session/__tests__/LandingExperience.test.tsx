import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'

import { LandingExperience } from '@/components/session/LandingExperience'
import { CinematicAudio } from '@/lib/cinematicAudio'

vi.mock('@/lib/cinematicAudio', () => ({ CinematicAudio: vi.fn(class {
  unlock = vi.fn()
  stop = vi.fn()
  dispose = vi.fn()
}) }))
vi.mock('@/components/session/OpeningCinematic', () => ({
  OpeningCinematic: ({ replay, onComplete }: { replay: boolean; onComplete: (manual: boolean, replay: boolean) => void }) => (
    <section aria-label="Opening cinematic">
      <button onClick={() => onComplete(false, replay)}>Timer end</button>
      <button onClick={() => onComplete(true, replay)}>Skip</button>
    </section>
  ),
}))

describe('LandingExperience', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks() })
  afterEach(() => { cleanup(); vi.useRealTimers() })
  it('makes Room access inert until completion without stealing focus on auto-complete', () => {
    render(<LandingExperience />)
    act(() => vi.advanceTimersByTime(0))
    expect(screen.queryByRole('heading', { name: 'Join Room' })).toBeNull()
    expect(screen.getByLabelText('Room code').closest('[inert]')).toBeTruthy()
    fireEvent.click(screen.getByText('Timer end'))
    expect(screen.getByRole('heading', { name: 'Join Room' })).toBeInTheDocument()
    expect(screen.getByLabelText('Room code')).not.toHaveFocus()
  })
  it('focuses Room code after manual skip and preserves typed values through replay', () => {
    render(<LandingExperience />)
    act(() => vi.advanceTimersByTime(0))
    fireEvent.click(screen.getByText('Skip'))
    const input = screen.getByLabelText('Room code')
    expect(input).toHaveFocus()
    fireEvent.change(input, { target: { value: 'ABC234' } })
    fireEvent.click(screen.getByRole('button', { name: 'Replay with sound' }))
    const instance = vi.mocked(CinematicAudio).mock.results[0].value
    expect(instance.unlock).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByText('Timer end'))
    expect(input).toHaveValue('ABC234')
    expect(input).toHaveFocus()
  })
  it('replays on a browser-cache restoration and fresh mount', () => {
    const { unmount } = render(<LandingExperience />)
    act(() => vi.advanceTimersByTime(0))
    fireEvent.click(screen.getByText('Skip'))
    const event = new Event('pageshow')
    Object.defineProperty(event, 'persisted', { value: true })
    act(() => window.dispatchEvent(event))
    expect(screen.getByRole('region', { name: 'Opening cinematic' })).toBeInTheDocument()
    unmount()
    render(<LandingExperience />)
    expect(screen.getByRole('region', { name: 'Opening cinematic' })).toBeInTheDocument()
  })
})
