import { getTimedVitalsSectionText, type TimedVitalsSlot } from '@/lib/vitalsAutoSort'

export type PatientPhysicalFindings = Record<string, string>
export type PatientPhysicalIconFindingId =
  | 'respiratory-rate'
  | 'respiratory-rhythm'
  | 'respiratory-strength'
  | 'pulse-rate'
  | 'pulse-rhythm'
  | 'pulse-strength'
  | 'skin-extremities-note'
  | 'scene-environment-note'

const SECTION_TO_REGIONS: Record<string, string[]> = {
  head: ['front-head'],
  face: ['front-head'],
  neck: ['front-neck'],
  'head face neck': ['front-head', 'front-neck'],
  'head neck': ['front-head', 'front-neck'],
  back: ['back-back'],
  spine: ['back-back'],
  'back spine': ['back-back'],
  lumbar: ['back-back'],
  'cervical spine': ['back-back'],
  'thoracic spine': ['back-back'],
  'posterior torso': ['back-back'],
  dorsal: ['back-back'],
  chest: ['front-chest'],
  'chest respiratory': ['front-chest'],
  thoracic: ['front-chest'],
  'thoracic area': ['front-chest'],
  'anterior chest': ['front-chest'],
  'rib cage': ['front-chest'],
  abdomen: ['front-abdomen'],
  pelvis: ['front-trunk'],
  'left upper extremity': [
    'front-patient-left-shoulder',
    'front-patient-left-upper-arm',
    'front-patient-left-lower-arm',
    'front-patient-left-hand',
  ],
  'right upper extremity': [
    'front-patient-right-shoulder',
    'front-patient-right-upper-arm',
    'front-patient-right-lower-arm',
    'front-patient-right-hand',
  ],
  'left lower extremity': [
    'front-patient-left-upper-leg',
    'front-patient-left-lower-leg',
    'front-patient-left-foot',
  ],
  'right lower extremity': [
    'front-patient-right-upper-leg',
    'front-patient-right-lower-leg',
    'front-patient-right-foot',
  ],
}

const ICON_LABEL_TO_TARGET: Record<string, PatientPhysicalIconFindingId> = {
  'respiratory rate': 'respiratory-rate',
  'respiratory rhythm': 'respiratory-rhythm',
  'respiratory strength': 'respiratory-strength',
  'respiration rate': 'respiratory-rate',
  'respiration rhythm': 'respiratory-rhythm',
  'respiration strength': 'respiratory-strength',
  'pulse rate': 'pulse-rate',
  'pulse rhythm': 'pulse-rhythm',
  'pulse strength': 'pulse-strength',
}

const BROAD_ICON_SECTIONS: Record<string, 'respiratory' | 'pulse'> = {
  respiratory: 'respiratory',
  respirations: 'respiratory',
  breathing: 'respiratory',
  pulse: 'pulse',
}

const SKIN_EXTREMITIES_SECTIONS = new Set([
  'skin',
  'extremities',
  'skin extremities',
])

const SCENE_ENVIRONMENT_SECTIONS = new Set([
  'scene',
  'environment',
  'scene environment',
])

function normalizeHeading(line: string) {
  return line
    .trim()
    .replace(/^#+\s*/, '')
    .replace(/\*\*/g, '')
    .replace(/:$/, '')
    .replace(/[/-]/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

function cleanFindingLine(line: string) {
  return line.trim().replace(/^(?:[-*\u2022]|\d+[.)])\s*/, '')
}

function appendFinding(
  findings: PatientPhysicalFindings,
  target: PatientPhysicalIconFindingId,
  line: string,
) {
  findings[target] = findings[target] ? `${findings[target]}\n${line}` : line
}

function getBroadIconTargets(group: 'respiratory' | 'pulse') {
  return group === 'respiratory'
    ? (['respiratory-rate', 'respiratory-rhythm', 'respiratory-strength'] as const)
    : (['pulse-rate', 'pulse-rhythm', 'pulse-strength'] as const)
}

function applyIconSummaryLine(
  findings: PatientPhysicalFindings,
  group: 'respiratory' | 'pulse',
  value: string,
) {
  const targets = getBroadIconTargets(group)
  const parts = value
    .split(',')
    .map((part) => cleanFindingLine(part))
    .filter(Boolean)

  parts.slice(0, targets.length).forEach((part, index) => {
    findings[targets[index]] = part
  })
}

function classifyBroadIconLine(
  group: 'respiratory' | 'pulse',
  line: string,
): PatientPhysicalIconFindingId | null {
  const normalized = normalizeHeading(line)

  if (group === 'respiratory') {
    if (/\b(rate|rr|breaths per minute|breaths min|bpm)\b/.test(normalized)) {
      return 'respiratory-rate'
    }
    if (/\b(rhythm|regular|irregular)\b/.test(normalized)) {
      return 'respiratory-rhythm'
    }
    if (/\b(strength|effort|depth|shallow|deep|labored|laboured|unlabored|unlaboured|strong|weak|chest rise)\b/.test(normalized)) {
      return 'respiratory-strength'
    }
    return null
  }

  if (/\b(rate|pr|bpm|beats per minute|beats min)\b/.test(normalized)) {
    return 'pulse-rate'
  }
  if (/\b(rhythm|regular|irregular)\b/.test(normalized)) {
    return 'pulse-rhythm'
  }
  if (/\b(strength|strong|weak|thready|bounding|present|absent)\b/.test(normalized)) {
    return 'pulse-strength'
  }
  return null
}

export function parsePatientPhysicalAutoSort(text: string): PatientPhysicalFindings {
  const findings: PatientPhysicalFindings = {}
  let currentRegions: string[] | null = null
  let currentIconTarget: PatientPhysicalIconFindingId | null = null
  let currentBroadIconSection: 'respiratory' | 'pulse' | null = null
  let currentLines: string[] = []

  const commitCurrentSection = () => {
    if ((!currentRegions && !currentIconTarget) || currentLines.length === 0) return

    const finding = currentLines.join('\n').trim()
    if (!finding) return

    if (currentIconTarget) {
      findings[currentIconTarget] = finding
      return
    }

    for (const region of currentRegions ?? []) {
      findings[region] = finding
    }
  }

  for (const rawLine of text.split(/\r?\n/)) {
    const labelMatch = /^\s*([^:-]+?)\s*[:-]\s*(.*)\s*$/.exec(rawLine)
    if (labelMatch) {
      const normalizedLabel = normalizeHeading(labelMatch[1])
      const broadIconSection = BROAD_ICON_SECTIONS[normalizedLabel]
      if (broadIconSection) {
        commitCurrentSection()
        currentRegions = null
        currentIconTarget = null
        currentBroadIconSection = null
        currentLines = []

        const value = cleanFindingLine(labelMatch[2])
        if (value) {
          applyIconSummaryLine(findings, broadIconSection, value)
        } else {
          currentBroadIconSection = broadIconSection
        }
        continue
      }

      if (SKIN_EXTREMITIES_SECTIONS.has(normalizedLabel)) {
        commitCurrentSection()
        currentRegions = null
        currentIconTarget = null
        currentBroadIconSection = null
        currentLines = []

        const value = cleanFindingLine(labelMatch[2])
        if (value) {
          findings['skin-extremities-note'] = value
        } else {
          currentIconTarget = 'skin-extremities-note'
        }
        continue
      }

      if (SCENE_ENVIRONMENT_SECTIONS.has(normalizedLabel)) {
        commitCurrentSection()
        currentRegions = null
        currentIconTarget = null
        currentBroadIconSection = null
        currentLines = []

        const value = cleanFindingLine(labelMatch[2])
        if (value) {
          findings['scene-environment-note'] = value
        } else {
          currentIconTarget = 'scene-environment-note'
        }
        continue
      }

      const iconTarget = ICON_LABEL_TO_TARGET[normalizedLabel]
      if (iconTarget) {
        commitCurrentSection()
        currentRegions = null
        currentIconTarget = null
        currentBroadIconSection = null
        currentLines = []

        const value = cleanFindingLine(labelMatch[2])
        if (value) {
          findings[iconTarget] = value
        } else {
          currentIconTarget = iconTarget
        }
        continue
      }
    }

    const normalizedHeading = normalizeHeading(rawLine)
    const iconHeadingTarget = ICON_LABEL_TO_TARGET[normalizedHeading]
    if (iconHeadingTarget) {
      commitCurrentSection()
      currentRegions = null
      currentIconTarget = iconHeadingTarget
      currentBroadIconSection = null
      currentLines = []
      continue
    }

    const nextRegions = SECTION_TO_REGIONS[normalizedHeading]

    if (nextRegions) {
      commitCurrentSection()
      currentRegions = nextRegions
      currentIconTarget = null
      currentBroadIconSection = null
      currentLines = []
      continue
    }

    const nextBroadIconSection = BROAD_ICON_SECTIONS[normalizedHeading]
    if (nextBroadIconSection) {
      commitCurrentSection()
      currentRegions = null
      currentIconTarget = null
      currentBroadIconSection = nextBroadIconSection
      currentLines = []
      continue
    }

    if (SKIN_EXTREMITIES_SECTIONS.has(normalizedHeading)) {
      commitCurrentSection()
      currentRegions = null
      currentIconTarget = 'skin-extremities-note'
      currentBroadIconSection = null
      currentLines = []
      continue
    }

    if (SCENE_ENVIRONMENT_SECTIONS.has(normalizedHeading)) {
      commitCurrentSection()
      currentRegions = null
      currentIconTarget = 'scene-environment-note'
      currentBroadIconSection = null
      currentLines = []
      continue
    }

    const line = cleanFindingLine(rawLine)
    if (!line) continue

    if (currentBroadIconSection) {
      const target = classifyBroadIconLine(currentBroadIconSection, line)
      if (target) appendFinding(findings, target, line)
      continue
    }

    if (currentRegions || currentIconTarget) currentLines.push(line)
  }

  commitCurrentSection()

  return findings
}

export function parseTimedPatientPhysicalAutoSort(
  text: string,
  slot: TimedVitalsSlot,
): PatientPhysicalFindings {
  const sectionText = getTimedVitalsSectionText(text, slot)
  if (!sectionText) return {}
  return parsePatientPhysicalAutoSort(sectionText)
}
