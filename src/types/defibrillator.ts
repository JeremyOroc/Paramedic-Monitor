export type DefibrillatorModel = 'wagamiX' | 'wagamiZ' | 'wagamiA'

export const DEFAULT_DEFIBRILLATOR_MODEL: DefibrillatorModel = 'wagamiX'

export function normalizeDefibrillatorModel(value: unknown): DefibrillatorModel {
  return value === 'wagamiZ' || value === 'wagamiA'
    ? value
    : DEFAULT_DEFIBRILLATOR_MODEL
}
