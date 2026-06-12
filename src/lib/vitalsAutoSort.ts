import type { NumericVitalField } from '@/types/vitals'

export type ParsedVitalsAutoSort = Partial<Record<NumericVitalField, number>>

type VitalTarget =
  | { field: NumericVitalField }
  | { field: 'bp_combined' }

const LABEL_TO_TARGET: Readonly<Record<string, VitalTarget>> = {
  fc: { field: 'hr' },
  hr: { field: 'hr' },
  heartrate: { field: 'hr' },
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

function normalizeLabel(label: string) {
  return label
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function parseWholeNumber(value: string) {
  const match = /^\s*(\d+)\s*$/.exec(value)
  if (!match) return null
  const parsed = Number(match[1])
  return Number.isFinite(parsed) ? parsed : null
}

function parseBloodPressure(value: string) {
  const match = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(value)
  if (!match) return null
  const systolic = Number(match[1])
  const diastolic = Number(match[2])
  if (!Number.isFinite(systolic) || !Number.isFinite(diastolic)) return null
  return { systolic, diastolic }
}

export function parseVitalsAutoSort(text: string): ParsedVitalsAutoSort {
  const parsed: ParsedVitalsAutoSort = {}

  for (const rawLine of text.split(/\r?\n/)) {
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
      parsed.bp_sys = bp.systolic
      parsed.bp_dia = bp.diastolic
      continue
    }

    const value = parseWholeNumber(match[2])
    if (value === null) continue
    parsed[target.field] = value
  }

  return parsed
}
