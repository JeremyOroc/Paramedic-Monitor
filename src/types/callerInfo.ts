export type CallerInfo = {
  interventionPriorityCode: string
  address: string
  problem: string
  information: string
  update: string
  extra1Label: string
  extra1: string
  extra2Label: string
  extra2: string
  extra3Label: string
  extra3: string
  time: string
}

export type CallerInfoField = keyof CallerInfo

export const DEFAULT_CALLER_INFO: CallerInfo = {
  interventionPriorityCode: '',
  address: '',
  problem: '',
  information: '',
  update: '',
  extra1Label: '',
  extra1: '',
  extra2Label: '',
  extra2: '',
  extra3Label: '',
  extra3: '',
  time: '',
}

export const CALLER_INFO_FIELDS: ReadonlyArray<{
  field: CallerInfoField
  label: string
  multiline?: boolean
}> = [
  { field: 'interventionPriorityCode', label: 'Intervention prioritaire code' },
  { field: 'address', label: 'Adresse' },
  { field: 'problem', label: 'Probleme', multiline: true },
  { field: 'information', label: 'Information', multiline: true },
  { field: 'update', label: 'Mise a jour', multiline: true },
  { field: 'extra1Label', label: 'Extra 1 name' },
  { field: 'extra1', label: 'Extra 1' },
  { field: 'extra2Label', label: 'Extra 2 name' },
  { field: 'extra2', label: 'Extra 2' },
  { field: 'extra3Label', label: 'Extra 3 name' },
  { field: 'extra3', label: 'Extra 3' },
  { field: 'time', label: 'Heure' },
]

export const CALLER_INFO_DISPLAY_FIELDS: ReadonlyArray<{
  field: CallerInfoField
  label: string
  labelField?: CallerInfoField
}> = [
  { field: 'interventionPriorityCode', label: 'Intervention prioritaire code' },
  { field: 'address', label: 'Adresse' },
  { field: 'problem', label: 'Probleme' },
  { field: 'information', label: 'Information' },
  { field: 'update', label: 'Mise a jour' },
  { field: 'extra1', label: 'Extra 1', labelField: 'extra1Label' },
  { field: 'extra2', label: 'Extra 2', labelField: 'extra2Label' },
  { field: 'extra3', label: 'Extra 3', labelField: 'extra3Label' },
  { field: 'time', label: 'Heure' },
]

export function hasCallerInfo(info: CallerInfo): boolean {
  return CALLER_INFO_FIELDS.some(({ field }) => info[field].trim() !== '')
}
