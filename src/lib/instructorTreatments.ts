export const TRAUMA_TREATMENTS = [
  'BVM',
  'OPA',
  'NPA',
  'Suction',
  'Intubation',
  'Direct Pressure',
  'Tourniquet',
  'Wound Packing',
  'Dressing',
  'Saline',
  'Chest Seal',
  'C-Collar',
  'Splint',
  'Vac Mat',
  'CombiCarrier',
  'Scoop',
  'Backboard',
  'KED',
] as const

export type TreatmentCategory = 'medication' | 'trauma'
