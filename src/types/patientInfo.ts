export type PatientSex = 'M' | 'F'

export type PatientInfo = {
  age: number
  sex: PatientSex
}

export const PATIENT_AGE_MIN = 0
export const PATIENT_AGE_MAX = 120

export const DEFAULT_PATIENT_INFO: PatientInfo = {
  age: 40,
  sex: 'M',
}

/** Clamp an age into the editable range, rounding to a whole year. */
export function clampAge(age: number): number {
  if (!Number.isFinite(age)) return PATIENT_AGE_MIN
  const rounded = Math.round(age)
  return Math.min(PATIENT_AGE_MAX, Math.max(PATIENT_AGE_MIN, rounded))
}

/** Flip the sex between the two supported values. */
export function toggleSex(sex: PatientSex): PatientSex {
  return sex === 'M' ? 'F' : 'M'
}
