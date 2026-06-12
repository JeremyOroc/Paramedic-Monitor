import type { CallerInfoField } from '@/types/callerInfo'

export type ParsedCallerInfo = Partial<Record<CallerInfoField, string>>

export const CALLER_INFO_AUTO_SORT_FIELDS: ReadonlyArray<CallerInfoField> = [
  'interventionPriorityCode',
  'address',
  'problem',
  'information',
  'update',
  'time',
]

const LABEL_TO_FIELD: Readonly<Record<string, CallerInfoField>> = {
  adresse: 'address',
  address: 'address',
  probleme: 'problem',
  problem: 'problem',
  information: 'information',
  info: 'information',
  miseajour: 'update',
  update: 'update',
  heure: 'time',
  time: 'time',
  interventionprioritairecode: 'interventionPriorityCode',
  code: 'interventionPriorityCode',
}

function normalizeLabel(label: string) {
  return label
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

export function parseCallerInfoAutoSort(text: string): ParsedCallerInfo {
  const parsed: ParsedCallerInfo = {}

  for (const line of text.split(/\r?\n/)) {
    const match = /^([^:]+):(.*)$/.exec(line)
    if (!match) continue

    const field = LABEL_TO_FIELD[normalizeLabel(match[1])]
    if (!field) continue

    parsed[field] = match[2].trim()
  }

  return parsed
}
