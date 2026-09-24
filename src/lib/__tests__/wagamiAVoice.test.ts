import { beforeEach, describe, expect, it, vi } from 'vitest'

import { playWagamiACprPrompt, playWagamiADefibPrompt } from '../wagamiAVoice'
import * as audio from '../audio'

vi.mock('../audio', () => ({
  playSystemAudio: vi.fn(),
  playCprAudioSequence: vi.fn(),
  playCprMetronome: vi.fn(),
}))

class UtteranceMock {
  lang = ''
  rate = 1
  onend: (() => void) | null = null
  onerror: (() => void) | null = null
  constructor(public text: string) {}
}

describe('Wagami A voice prompt selection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('SpeechSynthesisUtterance', UtteranceMock)
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { speak: vi.fn((utterance: UtteranceMock) => utterance.onend?.()), cancel: vi.fn() },
    })
  })

  it('keeps the existing recordings for English prompts', () => {
    playWagamiADefibPrompt('en', 'standClear')
    expect(audio.playSystemAudio).toHaveBeenCalledWith('stand_clear.mp3')
    playWagamiADefibPrompt('en', 'analysisHalted')
    expect(audio.playSystemAudio).toHaveBeenCalledWith('analysis_halted.mp3')
  })

  it('speaks deterministic fr-CA text and starts the CPR metronome after the prompt', () => {
    const ended = vi.fn()
    playWagamiACprPrompt('fr', ended)
    const speak = vi.mocked(window.speechSynthesis.speak)
    const utterance = speak.mock.calls[0][0] as unknown as UtteranceMock
    expect(utterance.lang).toBe('fr-CA')
    expect(utterance.text).toContain('réanimation')
    expect(audio.playCprMetronome).toHaveBeenCalledOnce()
    expect(ended).toHaveBeenCalledOnce()
  })
})
