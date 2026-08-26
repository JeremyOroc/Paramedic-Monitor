export type DefibrillatorModel = 'wagamiX' | 'wagamiZ'

export const DEFAULT_DEFIBRILLATOR_MODEL: DefibrillatorModel = 'wagamiX'

export function normalizeDefibrillatorModel(value: unknown): DefibrillatorModel {
  return value === 'wagamiZ' ? 'wagamiZ' : DEFAULT_DEFIBRILLATOR_MODEL
}
