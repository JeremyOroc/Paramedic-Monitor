import type { CallerInfoField } from '@/types/callerInfo'

export type ParsedCallerInfo = Partial<Record<CallerInfoField, string>>

export const CALLER_INFO_AUTO_SORT_FIELDS: ReadonlyArray<CallerInfoField> = [
  'callNumber',
  'priority',
  'mpdsCode',
  'address',
  'problem',
  'information',
  'update',
  'time',
]

type LabelTarget = {
  field: CallerInfoField
  heading?: string
  append?: boolean
}

const LABEL_TO_TARGET: Readonly<Record<string, LabelTarget>> = {
  call: { field: 'callNumber' },
  callnumber: { field: 'callNumber' },
  nodappel: { field: 'callNumber' },
  numerodappel: { field: 'callNumber' },
  priority: { field: 'priority' },
  priorite: { field: 'priority' },
  mpdscode: { field: 'mpdsCode' },
  codempds: { field: 'mpdsCode' },
  adresse: { field: 'address' },
  addresse: { field: 'address' },
  address: { field: 'address' },
  chiefcomplaint: { field: 'problem' },
  plainteprincipale: { field: 'problem' },
  probleme: { field: 'problem' },
  problem: { field: 'problem' },
  details: { field: 'information', append: true },
  information: { field: 'information' },
  info: { field: 'information' },
  patient: { field: 'information', heading: 'PATIENT' },
  unitsassigned: { field: 'information', heading: 'UNITS ASSIGNED' },
  unitesassignees: { field: 'information', heading: 'UNITES ASSIGNEES' },
  status: { field: 'update' },
  statut: { field: 'update' },
  miseajour: { field: 'update' },
  update: { field: 'update' },
  timereceived: { field: 'time' },
  heurerecue: { field: 'time' },
  heure: { field: 'time' },
  time: { field: 'time' },
}

function normalizeLabel(label: string) {
  return label
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function detectLabelOnly(line: string): LabelTarget | undefined {
  return LABEL_TO_TARGET[normalizeLabel(line)]
}

function detectInlineLabel(line: string) {
  const match = /^(.+?)\s*([:\-])\s*(.*)$/.exec(line)
  if (!match) return null
  if (!/[a-zA-Z]/.test(match[1].normalize('NFD').replace(/[\u0300-\u036f]/g, ''))) return null

  const target = LABEL_TO_TARGET[normalizeLabel(match[1])]
  if (!target && match[2] === '-') return null

  return {
    target,
    value: match[3].trim(),
  }
}

function isSectionBoundary(line: string) {
  if (/^#{1,6}\s+/.test(line) || /^-{3,}$/.test(line)) return true

  return [
    'patientpresentation',
    'vitalsorigin',
    'originvitals',
    'sample',
    'opqrst',
    'patientfindings',
    'patientfindingsorganizedbybodyarea',
    'serialvitals',
    'treated',
    'untreated',
  ].includes(normalizeLabel(line))
}

export function parseCallerInfoAutoSort(text: string): ParsedCallerInfo {
  const parsed: ParsedCallerInfo = {}
  let currentTarget: LabelTarget | null = null
  let currentValueLines: string[] = []

  const commitCurrentField = () => {
    if (!currentTarget) return
    const value = currentValueLines.join('\n').trim()
    if (currentTarget.heading) {
      const formattedValue = `${currentTarget.heading}: ${value}`
      parsed[currentTarget.field] = [parsed[currentTarget.field], formattedValue]
        .filter((part): part is string => part !== undefined && part !== '')
        .join('\n')
      return
    }
    if (currentTarget.append) {
      parsed[currentTarget.field] = [parsed[currentTarget.field], value]
        .filter((part): part is string => part !== undefined && part !== '')
        .join('\n')
      return
    }
    parsed[currentTarget.field] = value
  }

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (line === '') continue
    if (isSectionBoundary(line)) {
      commitCurrentField()
      currentTarget = null
      currentValueLines = []
      continue
    }

    const inlineLabel = detectInlineLabel(line)
    if (inlineLabel) {
      commitCurrentField()
      currentTarget = inlineLabel.target ?? null
      currentValueLines =
        inlineLabel.target && inlineLabel.value !== '' ? [inlineLabel.value] : []
      continue
    }

    const labelOnly = detectLabelOnly(line)
    if (labelOnly) {
      commitCurrentField()
      currentTarget = labelOnly
      currentValueLines = []
      continue
    }

    if (currentTarget) {
      if (currentTarget.field === 'time' && currentValueLines.length > 0) {
        commitCurrentField()
        currentTarget = null
        currentValueLines = []
        continue
      }
      currentValueLines.push(line)
    }
  }

  commitCurrentField()

  return parsed
}
