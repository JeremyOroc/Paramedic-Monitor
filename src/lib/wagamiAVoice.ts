import type { DefibPrompt } from '@/hooks/useDefibSequence'
import { playCprAudioSequence, playCprMetronome, playSystemAudio } from '@/lib/audio'
import type { WagamiALocale } from '@/types/wagamiA'

const ENGLISH_AUDIO: Record<DefibPrompt, string> = {
  standClear: 'stand_clear.mp3',
  pressShock: 'press_shock.mp3',
  shockNotAdvised: 'shock_not_advised.mp3',
  analysisHalted: 'analysis_halted.mp3',
}

const FRENCH_PROMPTS: Record<DefibPrompt | 'performCpr', string> = {
  standClear: 'Dégagez le patient.',
  pressShock: 'Appuyez sur le bouton de choc.',
  shockNotAdvised: 'Choc non conseillé.',
  analysisHalted: 'Analyse interrompue.',
  performCpr: 'Commencez la réanimation cardio-respiratoire.',
}

function speakFrench(text: string, onEnded?: () => void): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onEnded?.()
    return
  }
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'fr-CA'
  utterance.rate = 0.92
  utterance.onend = () => onEnded?.()
  utterance.onerror = () => onEnded?.()
  window.speechSynthesis.speak(utterance)
}

export function playWagamiADefibPrompt(locale: WagamiALocale, prompt: DefibPrompt): void {
  if (locale === 'en') {
    playSystemAudio(ENGLISH_AUDIO[prompt])
    return
  }
  speakFrench(FRENCH_PROMPTS[prompt])
}

export function playWagamiACprPrompt(
  locale: WagamiALocale,
  onEnded?: () => void,
): void {
  if (locale === 'en') {
    playCprAudioSequence(onEnded)
    return
  }
  speakFrench(FRENCH_PROMPTS.performCpr, () => {
    playCprMetronome()
    onEnded?.()
  })
}
