import type { NumericVitalField } from '@/types/vitals'

export type ParsedVitalsAutoSort = Partial<Record<NumericVitalField, number>>
export type TimedVitalsSlot = 'T1' | 'T2' | 'T3' | 'U1' | 'U2' | 'U3'

type VitalTarget =
  | { field: NumericVitalField }
  | { field: 'bp_combined' }

const LABEL_TO_TARGET: Readonly<Record<string, VitalTarget>> = {
  fc: { field: 'hr' },
  hr: { field: 'hr' },
  heartrate: { field: 'hr' },
  pulse: { field: 'hr' },
  pulserate: { field: 'hr' },
  spo2: { field: 'spo2' },
  saturation: { field: 'spo2' },
  sat: { field: 'spo2' },
  bp: { field: 'bp_combined' },
  ta: { field: 'bp_combined' },
  bloodpressure: { field: 'bp_combined' },
  bpsys: { field: 'bp_sys' },
  bpsystolic: { field: 'bp_sys' },
  systolic: { field: 'bp_sys' },
  bpdia: { field: 'bp_dia' },
  bpdiastolic: { field: 'bp_dia' },
  diastolic: { field: 'bp_dia' },
  etco2: { field: 'etco2' },
  co2: { field: 'etco2' },
}

const TIMED_SLOT_TO_HEADING: Readonly<Record<TimedVitalsSlot, string>> = {
  T1: 'treated5min',
  T2: 'treated10min',
  T3: 'treated15min',
  U1: 'untreated5min',
  U2: 'untreated10min',
  U3: 'untreated15min',
}

function normalizeLabel(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[₀０]/g, '0')
    .replace(/[₁１]/g, '1')
    .replace(/[₂２]/g, '2')
    .replace(/[₃３]/g, '3')
    .replace(/[₄４]/g, '4')
    .replace(/[₅５]/g, '5')
    .replace(/[₆６]/g, '6')
    .replace(/[₇７]/g, '7')
    .replace(/[₈８]/g, '8')
    .replace(/[₉９]/g, '9')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function parseWholeNumber(value: string) {
  const match = /^\s*(\d+)/.exec(value)
  if (!match) return null
  const parsed = Number(match[1])
  return Number.isFinite(parsed) ? parsed : null
}

function parseBloodPressure(value: string) {
  const match = /^\s*(\d+)\s*\/\s*(\d+)/.exec(value)
  if (!match) return null
  const systolic = Number(match[1])
  const diastolic = Number(match[2])
  if (!Number.isFinite(systolic) || !Number.isFinite(diastolic)) return null
  return { systolic, diastolic }
}

function isOriginVitalsHeading(line: string) {
  const normalized = normalizeLabel(line)
  return normalized === 'vitalsorigin' || normalized === 'originvitals'
}

function isSectionBoundary(line: string) {
  const trimmed = line.trim()
  if (!trimmed) return false
  if (/^#{1,6}\s+/.test(trimmed) || /^-{3,}$/.test(trimmed)) return true

  const normalized = normalizeLabel(trimmed)
  return [
    'dispatchinformation',
    'patientpresentation',
    'sample',
    'opqrst',
    'patientfindings',
    'patientfindingsorganizedbybodyarea',
    'serialvitals',
    'treated',
    'untreated',
  ].includes(normalized)
}

export function isTimedVitalsHeading(line: string) {
  return Object.values(TIMED_SLOT_TO_HEADING).includes(normalizeLabel(line))
}

function getVitalsSourceText(text: string) {
  const lines = text.split(/\r?\n/)
  const originStart = lines.findIndex(isOriginVitalsHeading)

  if (originStart === -1) return text

  const sectionLines: string[] = []
  for (const line of lines.slice(originStart + 1)) {
    if (isSectionBoundary(line)) break
    sectionLines.push(line)
  }

  return sectionLines.join('\n')
}

export function parseVitalsAutoSort(text: string): ParsedVitalsAutoSort {
  const parsed: ParsedVitalsAutoSort = {}

  for (const rawLine of getVitalsSourceText(text).split(/\r?\n/)) {
    const match = /^(.+?)\s*[:\-]\s*(.*?)\s*$/.exec(rawLine)
    if (!match) continue
    if (!/[a-zA-Z]/.test(match[1].normalize('NFD').replace(/[\u0300-\u036f]/g, ''))) {
      continue
    }

    const target = LABEL_TO_TARGET[normalizeLabel(match[1])]
    if (!target) continue

    if (target.field === 'bp_combined') {
      const bp = parseBloodPressure(match[2])
      if (!bp) continue
      if (parsed.bp_sys === undefined) parsed.bp_sys = bp.systolic
      if (parsed.bp_dia === undefined) parsed.bp_dia = bp.diastolic
      continue
    }

    const value = parseWholeNumber(match[2])
    if (value === null) continue
    if (parsed[target.field] === undefined) parsed[target.field] = value
  }

  return parsed
}

export function parseTimedVitalsAutoSort(
  text: string,
  slot: TimedVitalsSlot,
): ParsedVitalsAutoSort {
  const sectionText = getTimedVitalsSectionText(text, slot)
  if (!sectionText) return {}

  return parseVitalsAutoSort(sectionText)
}

export function getTimedVitalsSectionText(text: string, slot: TimedVitalsSlot): string {
  const lines = text.split(/\r?\n/)
  const targetHeading = TIMED_SLOT_TO_HEADING[slot]
  const sectionStart = lines.findIndex((line) => normalizeLabel(line) === targetHeading)

  if (sectionStart === -1) return ''

  const sectionLines: string[] = []
  for (const line of lines.slice(sectionStart + 1)) {
    if (isTimedVitalsHeading(line) || isSectionBoundary(line)) break
    sectionLines.push(line)
  }

  return sectionLines.join('\n')
}
