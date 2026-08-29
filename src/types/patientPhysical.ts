export type PatientSnsIconGroupId =
  | 'pulse'
  | 'respiratory'
  | 'skin-extremities'

export type PatientSnsMeasurementGroupId = 'pulse' | 'respiratory'

export type PatientSnsMeasurementDurationSeconds = 15 | 30

export type PatientPhysicalIconGroupId =
  | PatientSnsIconGroupId
  | 'scene-environment'
