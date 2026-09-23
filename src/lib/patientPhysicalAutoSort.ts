import {
  getInitialVitalsSectionText,
  getTimedVitalsSectionText,
  type TimedVitalsSlot,
} from '@/lib/vitalsAutoSort'

export type PatientPhysicalFindings = Record<string, string>
export type PatientPhysicalIconFindingId =
  | 'respiratory-rate'
  | 'respiratory-rhythm'
  | 'respiratory-strength'
  | 'respiratory-speed'
  | 'pulse-rate'
  | 'pulse-rhythm'
  | 'pulse-strength'
  | 'pulse-speed'
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
  'respiratory effort': 'respiratory-strength',
  'respiratory depth': 'respiratory-strength',
  'respiratory speed': 'respiratory-speed',
  'respiration rate': 'respiratory-rate',
  'respiration rhythm': 'respiratory-rhythm',
  'respiration strength': 'respiratory-strength',
  'respiration effort': 'respiratory-strength',
  'respiration depth': 'respiratory-strength',
  'respiration speed': 'respiratory-speed',
  'pulse rate': 'pulse-rate',
  'pulse rhythm': 'pulse-rhythm',
  'pulse strength': 'pulse-strength',
  'pulse speed': 'pulse-speed',
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
    ? (['respiratory-rate', 'respiratory-rhythm', 'respiratory-strength', 'respiratory-speed'] as const)
    : (['pulse-rate', 'pulse-rhythm', 'pulse-strength', 'pulse-speed'] as const)
}

function splitIconSummaryParts(value: string): string[] {
  const parts: string[] = []
  let parenthesisDepth = 0
  let partStart = 0

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]
    if (character === '(') parenthesisDepth += 1
    else if (character === ')') parenthesisDepth = Math.max(0, parenthesisDepth - 1)
    else if (character === ',' && parenthesisDepth === 0) {
      parts.push(value.slice(partStart, index))
      partStart = index + 1
    }
  }

  parts.push(value.slice(partStart))
  return parts
}

function applyIconSummaryLine(
  findings: PatientPhysicalFindings,
  group: 'respiratory' | 'pulse',
  value: string,
) {
  const targets = getBroadIconTargets(group)
  const parts = splitIconSummaryParts(value)
    .map((part) => cleanFindingLine(part))
    .filter(Boolean)

  const [rate, ...descriptors] = parts
  if (rate) findings[targets[0]] = rate

  const descriptorTargets = targets.slice(1)
  const assigned = new Set<PatientPhysicalIconFindingId>()
  const unresolved: string[] = []
  descriptors.forEach((part) => {
    const classifiedTarget = classifyBroadIconLine(group, part)
    if (!classifiedTarget || classifiedTarget === targets[0]) {
      unresolved.push(part)
      return
    }
    if (assigned.has(classifiedTarget)) {
      appendFinding(findings, classifiedTarget, part)
      return
    }
    findings[classifiedTarget] = part
    assigned.add(classifiedTarget)
  })

  unresolved.forEach((part) => {
    const target = descriptorTargets.find((candidate) => !assigned.has(candidate))
    if (!target) return
    findings[target] = part
    assigned.add(target)
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
    if (/\b(speed|fast|slow|rapid|tachypneic|bradypneic)\b/.test(normalized)) {
      return 'respiratory-speed'
    }
    if (/\b(strength|effort|depth|shallow|deep|labored|laboured|unlabored|unlaboured|strong|weak|chest rise)\b/.test(normalized)) {
      return 'respiratory-strength'
    }
    return null
  }

  if (/\b(rate|pr|bpm|beats per minute|beats min)\b/.test(normalized)) {
    return 'pulse-rate'
  }
  if (/\b(speed|fast|slow|rapid|tachycardic|bradycardic)\b/.test(normalized)) {
    return 'pulse-speed'
  }
  if (/\b(rhythm|regular|irregular)\b/.test(normalized)) {
    return 'pulse-rhythm'
  }
  if (/\b(strength|strong|moderate|weak|thready|bounding|present|absent)\b/.test(normalized)) {
    return 'pulse-strength'
  }
  return null
}

function parsePatientPhysicalAutoSortContent(text: string): PatientPhysicalFindings {
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

    if (/^\s*#{1,6}\s+/.test(rawLine) || /^-{3,}$/.test(rawLine.trim())) {
      commitCurrentSection()
      currentRegions = null
      currentIconTarget = null
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

const INITIAL_VITAL_ICON_FINDING_IDS: ReadonlyArray<PatientPhysicalIconFindingId> = [
  'pulse-rate',
  'pulse-rhythm',
  'pulse-strength',
  'pulse-speed',
  'respiratory-rate',
  'respiratory-rhythm',
  'respiratory-strength',
  'respiratory-speed',
]

export function parsePatientPhysicalAutoSort(text: string): PatientPhysicalFindings {
  const findings = parsePatientPhysicalAutoSortContent(text)
  const initialVitalsText = getInitialVitalsSectionText(text)
  if (!initialVitalsText) return findings

  const initialFindings = parsePatientPhysicalAutoSortContent(initialVitalsText)
  for (const findingId of INITIAL_VITAL_ICON_FINDING_IDS) {
    const value = initialFindings[findingId]
    if (value) findings[findingId] = value
    else delete findings[findingId]
  }

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
