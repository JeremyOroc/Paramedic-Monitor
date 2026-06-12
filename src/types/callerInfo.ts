export type CallerInfo = {
  callNumber: string
  priority: string
  mpdsCode: string
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
  callNumber: '',
  priority: '',
  mpdsCode: '',
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
  { field: 'callNumber', label: 'Call #' },
  { field: 'priority', label: 'Priority' },
  { field: 'mpdsCode', label: 'MPDS Code' },
  { field: 'address', label: 'Adresse' },
  { field: 'problem', label: 'Probleme', multiline: true },
  { field: 'information', label: 'Information', multiline: true },
  { field: 'update', label: 'Mise a jour', multiline: true },
  { field: 'time', label: 'Heure' },
  { field: 'extra1Label', label: 'Extra 1 name' },
  { field: 'extra1', label: 'Extra 1' },
  { field: 'extra2Label', label: 'Extra 2 name' },
  { field: 'extra2', label: 'Extra 2' },
  { field: 'extra3Label', label: 'Extra 3 name' },
  { field: 'extra3', label: 'Extra 3' },
]

export const CALLER_INFO_DISPLAY_FIELDS: ReadonlyArray<{
  field: CallerInfoField
  label: string
  labelField?: CallerInfoField
}> = [
  { field: 'callNumber', label: 'Call #' },
  { field: 'priority', label: 'Priority' },
  { field: 'mpdsCode', label: 'MPDS Code' },
  { field: 'address', label: 'Adresse' },
  { field: 'problem', label: 'Probleme' },
  { field: 'information', label: 'Information' },
  { field: 'update', label: 'Mise a jour' },
  { field: 'time', label: 'Heure' },
  { field: 'extra1', label: 'Extra 1', labelField: 'extra1Label' },
  { field: 'extra2', label: 'Extra 2', labelField: 'extra2Label' },
  { field: 'extra3', label: 'Extra 3', labelField: 'extra3Label' },
]

export function normalizeCallerInfo(info: Partial<CallerInfo> | null | undefined): CallerInfo {
  const normalized = { ...DEFAULT_CALLER_INFO }
  if (!info) return normalized

  for (const field of Object.keys(DEFAULT_CALLER_INFO) as CallerInfoField[]) {
    const value = info[field]
    if (typeof value === 'string') {
      normalized[field] = value
    }
  }

  return normalized
}

export function hasCallerInfo(info: CallerInfo): boolean {
  return CALLER_INFO_FIELDS.some(({ field }) => info[field].trim() !== '')
}
