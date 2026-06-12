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

function detectLabelOnly(line: string): CallerInfoField | undefined {
  return LABEL_TO_FIELD[normalizeLabel(line)]
}

function detectInlineLabel(line: string) {
  const match = /^(.+?)\s*[:\-–—]\s*(.*)$/.exec(line)
  if (!match) return null
  if (!/[a-zA-ZÀ-ÿ]/.test(match[1])) return null

  const field = LABEL_TO_FIELD[normalizeLabel(match[1])]

  return {
    field,
    value: match[2].trim(),
  }
}

export function parseCallerInfoAutoSort(text: string): ParsedCallerInfo {
  const parsed: ParsedCallerInfo = {}
  let currentField: CallerInfoField | null = null
  let currentValueLines: string[] = []

  const commitCurrentField = () => {
    if (!currentField) return
    parsed[currentField] = currentValueLines.join('\n').trim()
  }

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (line === '') continue

    const inlineLabel = detectInlineLabel(line)
    if (inlineLabel) {
      commitCurrentField()
      currentField = inlineLabel.field ?? null
      currentValueLines =
        inlineLabel.field && inlineLabel.value !== '' ? [inlineLabel.value] : []
      continue
    }

    const labelOnly = detectLabelOnly(line)
    if (labelOnly) {
      commitCurrentField()
      currentField = labelOnly
      currentValueLines = []
      continue
    }

    if (currentField) {
      currentValueLines.push(line)
    }
  }

  commitCurrentField()

  return parsed
}
