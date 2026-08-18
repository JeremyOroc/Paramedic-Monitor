export type NibpMode = 'manual' | 'automatic'

export type NibpFocusSide = 'label' | 'value'

export const NIBP_AUTO_INTERVALS = [1, 2, 5, 15, 30, 60] as const

export type NibpAutoInterval = (typeof NIBP_AUTO_INTERVALS)[number]

export const NIBP_MODAL_ROWS = [
  'systolicAlarm',
  'diastolicAlarm',
  'mapAlarm',
  'mode',
  'autoInterval',
  'smartCuf',
  'exit',
] as const

export type NibpModalRow = (typeof NIBP_MODAL_ROWS)[number]
