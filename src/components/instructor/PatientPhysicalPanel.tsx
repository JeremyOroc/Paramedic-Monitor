'use client'

import { cn } from '@/lib/utils'
import type {
  PatientPhysicalFindings,
  PatientPhysicalIconFindingId,
} from '@/lib/patientPhysicalAutoSort'

export type PatientPhysicalSelection = string

type PatientPhysicalPanelProps = {
  selected: ReadonlySet<PatientPhysicalSelection>
  findings: PatientPhysicalFindings
  activeIconGroup: PatientPhysicalIconGroupId | null
  onToggle: (selection: PatientPhysicalSelection) => void
  onIconGroupClick: (selection: PatientPhysicalIconGroupId) => void
}

type PhysicalRegion = {
  id: PatientPhysicalSelection
  label: string
  className: string
}

const REGIONS: ReadonlyArray<PhysicalRegion> = [
  { id: 'front-head', label: 'Front head', className: 'left-[30.5%] top-[5.7%] h-[12.1%] w-[7.9%] rounded-full' },
  { id: 'front-neck', label: 'Front neck', className: 'left-[31.9%] top-[17.7%] h-[5.1%] w-[5.1%] rounded-[40%]' },
  { id: 'front-chest', label: 'Front chest', className: 'left-[26.1%] top-[23.4%] h-[7.6%] w-[16.4%] rounded-[45%]' },
  { id: 'front-abdomen', label: 'Front abdomen', className: 'left-[31.1%] top-[36.6%] h-[10.3%] w-[7.4%] rounded-[40%]' },
  { id: 'front-trunk', label: 'Front trunk', className: 'left-[28.3%] top-[48.6%] h-[8.4%] w-[13.4%] rounded-[35%]' },
  { id: 'front-patient-right-shoulder', label: 'Front patient right shoulder', className: 'left-[21.7%] top-[22%] h-[5.5%] w-[6%] rounded-full' },
  { id: 'front-patient-left-shoulder', label: 'Front patient left shoulder', className: 'left-[40%] top-[22%] h-[5.5%] w-[6%] rounded-full' },
  { id: 'front-patient-right-upper-arm', label: 'Front patient right upper arm', className: 'left-[20.9%] top-[27.1%] h-[14.7%] w-[4%] rounded-full' },
  { id: 'front-patient-left-upper-arm', label: 'Front patient left upper arm', className: 'left-[43.7%] top-[27.1%] h-[14.7%] w-[4%] rounded-full' },
  { id: 'front-patient-right-lower-arm', label: 'Front patient right lower arm', className: 'left-[19.9%] top-[42.1%] h-[13.7%] w-[3.7%] rounded-full' },
  { id: 'front-patient-left-lower-arm', label: 'Front patient left lower arm', className: 'left-[45%] top-[42.1%] h-[13.7%] w-[3.7%] rounded-full' },
  { id: 'front-patient-right-hand', label: 'Front patient right hand', className: 'left-[20.7%] top-[55.6%] h-[6.4%] w-[3.7%] rounded-full' },
  { id: 'front-patient-left-hand', label: 'Front patient left hand', className: 'left-[44.1%] top-[55.6%] h-[6.4%] w-[3.7%] rounded-full' },
  { id: 'front-patient-right-upper-leg', label: 'Front patient right upper leg', className: 'left-[27.9%] top-[58.6%] h-[15.7%] w-[5.3%] rounded-[40%]' },
  { id: 'front-patient-left-upper-leg', label: 'Front patient left upper leg', className: 'left-[35.4%] top-[58.6%] h-[15.7%] w-[5.3%] rounded-[40%]' },
  { id: 'front-patient-right-lower-leg', label: 'Front patient right lower leg', className: 'left-[28.1%] top-[77.6%] h-[12.9%] w-[4.7%] rounded-[40%]' },
  { id: 'front-patient-left-lower-leg', label: 'Front patient left lower leg', className: 'left-[36%] top-[77.6%] h-[12.9%] w-[4.7%] rounded-[40%]' },
  { id: 'front-patient-right-foot', label: 'Front patient right foot', className: 'left-[24.9%] top-[92.3%] h-[4.4%] w-[8.3%] rounded-full' },
  { id: 'front-patient-left-foot', label: 'Front patient left foot', className: 'left-[35.4%] top-[92.3%] h-[4.4%] w-[8.3%] rounded-full' },
  { id: 'back-head', label: 'Rear head', className: 'left-[61.9%] top-[5.7%] h-[12.1%] w-[7.9%] rounded-full' },
  { id: 'back-neck', label: 'Rear neck', className: 'left-[63.4%] top-[17.7%] h-[5.1%] w-[5.1%] rounded-[40%]' },
  { id: 'back-back', label: 'Rear back', className: 'left-[57.7%] top-[26.4%] h-[23.6%] w-[15.6%] rounded-[35%]' },
  { id: 'back-trunk', label: 'Rear trunk', className: 'left-[59.3%] top-[48.9%] h-[9.3%] w-[12.9%] rounded-[35%]' },
  { id: 'back-patient-left-shoulder', label: 'Rear patient left shoulder', className: 'left-[53.3%] top-[22%] h-[5.5%] w-[6%] rounded-full' },
  { id: 'back-patient-right-shoulder', label: 'Rear patient right shoulder', className: 'left-[72.1%] top-[22%] h-[5.5%] w-[6%] rounded-full' },
  { id: 'back-patient-left-upper-arm', label: 'Rear patient left upper arm', className: 'left-[52.3%] top-[27.1%] h-[14.7%] w-[3.7%] rounded-full' },
  { id: 'back-patient-right-upper-arm', label: 'Rear patient right upper arm', className: 'left-[75.3%] top-[27.1%] h-[14.7%] w-[3.7%] rounded-full' },
  { id: 'back-patient-left-lower-arm', label: 'Rear patient left lower arm', className: 'left-[51.4%] top-[42.1%] h-[13.7%] w-[3.7%] rounded-full' },
  { id: 'back-patient-right-lower-arm', label: 'Rear patient right lower arm', className: 'left-[76.1%] top-[42.1%] h-[13.7%] w-[3.7%] rounded-full' },
  { id: 'back-patient-left-hand', label: 'Rear patient left hand', className: 'left-[51.9%] top-[55.6%] h-[6.4%] w-[3.9%] rounded-full' },
  { id: 'back-patient-right-hand', label: 'Rear patient right hand', className: 'left-[75.9%] top-[55.6%] h-[6.4%] w-[3.9%] rounded-full' },
  { id: 'back-patient-left-upper-leg', label: 'Rear patient left upper leg', className: 'left-[59.3%] top-[58.6%] h-[15.7%] w-[5.3%] rounded-[40%]' },
  { id: 'back-patient-right-upper-leg', label: 'Rear patient right upper leg', className: 'left-[66.9%] top-[58.6%] h-[15.7%] w-[5.3%] rounded-[40%]' },
  { id: 'back-patient-left-lower-leg', label: 'Rear patient left lower leg', className: 'left-[59.3%] top-[77.6%] h-[12.9%] w-[4.7%] rounded-[40%]' },
  { id: 'back-patient-right-lower-leg', label: 'Rear patient right lower leg', className: 'left-[67.4%] top-[77.6%] h-[12.9%] w-[4.7%] rounded-[40%]' },
  { id: 'back-patient-left-foot', label: 'Rear patient left foot', className: 'left-[56.1%] top-[92.3%] h-[4.4%] w-[8.3%] rounded-full' },
  { id: 'back-patient-right-foot', label: 'Rear patient right foot', className: 'left-[66.9%] top-[92.3%] h-[4.4%] w-[8.3%] rounded-full' },
]

type IconFinding = {
  id: PatientPhysicalIconFindingId
  label: string
}

type PatientPhysicalIconGroupId =
  | 'respiratory'
  | 'pulse'
  | 'skin-extremities'
  | 'scene-environment'

type IconGroup = {
  id: PatientPhysicalIconGroupId
  label: string
  iconSrc: string
  iconAlt: string
  findings: ReadonlyArray<IconFinding>
  showFindingLabels?: boolean
  showMissingFields?: boolean
}

const ICON_GROUPS: ReadonlyArray<IconGroup> = [
  {
    id: 'pulse',
    label: 'Pulse',
    iconSrc: '/images/patient-physical-pulse.png',
    iconAlt: 'Pulse findings',
    findings: [
      { id: 'pulse-rate', label: 'Rate' },
      { id: 'pulse-rhythm', label: 'Rhythm' },
      { id: 'pulse-strength', label: 'Strength' },
    ],
    showFindingLabels: true,
    showMissingFields: true,
  },
  {
    id: 'respiratory',
    label: 'Respiratory',
    iconSrc: '/images/patient-physical-lung.png',
    iconAlt: 'Respiratory findings',
    findings: [
      { id: 'respiratory-rate', label: 'Rate' },
      { id: 'respiratory-rhythm', label: 'Rhythm' },
      { id: 'respiratory-strength', label: 'Strength' },
    ],
    showFindingLabels: true,
    showMissingFields: true,
  },
  {
    id: 'skin-extremities',
    label: 'Skin/Extremities',
    iconSrc: '/images/patient-physical-skin-extremities.png',
    iconAlt: 'Skin and extremities findings',
    findings: [
      { id: 'skin-extremities-note', label: 'Skin/Extremities' },
    ],
  },
  {
    id: 'scene-environment',
    label: 'Scene/Environment',
    iconSrc: '/images/patient-physical-scene-environment.png',
    iconAlt: 'Scene and environment findings',
    findings: [
      { id: 'scene-environment-note', label: 'Scene/Environment' },
    ],
  },
]

function getIconFindingSummary(group: IconGroup, findings: PatientPhysicalFindings) {
  return group.findings
    .map((finding) => {
      const value = findings[finding.id]
      if (!value) return null
      return group.showFindingLabels ? `${finding.label}: ${value}` : value
    })
    .filter((value): value is string => Boolean(value))
    .join(' ')
}

function getMissingIconFindingLabels(group: IconGroup, findings: PatientPhysicalFindings) {
  return group.findings
    .filter((finding) => !findings[finding.id])
    .map((finding) => finding.label)
}

export function PatientPhysicalPanel({
  selected,
  findings,
  activeIconGroup,
  onToggle,
  onIconGroupClick,
}: PatientPhysicalPanelProps) {
  const displayedRegions = Array.from(selected)
    .map((selection) => REGIONS.find((region) => region.id === selection))
    .filter((region): region is PhysicalRegion => Boolean(region))

  return (
    <section className="grid gap-4 border border-neutral-800 bg-neutral-950 p-4">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-800 pb-3">
        <h2 className="text-sm uppercase tracking-wider text-neutral-400">
          Patient Physical
        </h2>
        <span className="text-xs uppercase tracking-wider text-neutral-600">Body Map</span>
      </div>
      <div className="grid gap-4 lg:grid-cols-[10rem_minmax(0,38rem)_minmax(14rem,1fr)]">
        <div className="grid self-start gap-3">
          {ICON_GROUPS.map((group) => {
            const active = selected.has(group.id)
            const hasFinding = group.findings.some((finding) => Boolean(findings[finding.id]))
            const showSlider = activeIconGroup === group.id
            const summary = getIconFindingSummary(group, findings)
            const missingLabels = group.showMissingFields
              ? getMissingIconFindingLabels(group, findings)
              : []

            return (
              <section
                key={group.id}
                aria-label={`${group.label} icon findings`}
                className={cn(
                  'grid gap-3 border bg-neutral-900/40 p-3',
                  active ? 'border-ecg-green/60' : 'border-neutral-800',
                )}
              >
                <button
                  type="button"
                  aria-label={group.label}
                  aria-pressed={active}
                  onClick={() => onIconGroupClick(group.id)}
                  className={cn(
                    'relative grid justify-items-center gap-2 border p-2 transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-ecg-green focus:ring-offset-2 focus:ring-offset-black',
                    active
                      ? 'border-ecg-green bg-ecg-green text-black'
                      : hasFinding
                        ? 'border-pending-amber bg-pending-amber/20 text-pending-amber'
                        : 'border-neutral-700 bg-black text-neutral-300 hover:border-ecg-green hover:text-ecg-green',
                  )}
                >
                  {hasFinding && !active ? (
                    <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center border border-pending-amber bg-black text-[0.65rem] font-black leading-none text-pending-amber">
                      !
                    </span>
                  ) : null}
                  <img
                    src={group.iconSrc}
                    alt={group.iconAlt}
                    className={cn(
                      'h-14 w-14 object-contain invert transition-opacity',
                      active ? 'opacity-100' : 'opacity-70',
                    )}
                  />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
                    {group.label}
                  </h3>
                </button>
                {showSlider ? (
                  <div
                    role="region"
                    aria-label={`${group.label} finding slider`}
                    className="grid min-w-0 gap-2 border border-ecg-green bg-black p-2 text-xs"
                  >
                    {summary ? (
                      <p className="whitespace-pre-wrap break-words font-mono text-ecg-green">
                        {summary}
                      </p>
                    ) : null}
                    {missingLabels.length > 0 ? (
                      <p className="font-mono text-pending-amber">
                        Missing: {missingLabels.join(', ')}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </section>
            )
          })}
        </div>
        <div className="relative aspect-square self-start overflow-hidden border border-neutral-800 bg-neutral-950">
          <img
            src="/images/patient-physical-outline.png"
            alt="Front and back body outline"
            className="absolute inset-0 h-full w-full object-contain"
          />
          {REGIONS.map((region) => {
            const active = selected.has(region.id)
            const hasFinding = Boolean(findings[region.id])
            return (
              <button
                key={region.id}
                type="button"
                aria-label={region.label}
                aria-pressed={active}
                onClick={() => onToggle(region.id)}
                className={cn(
                  'absolute border transition-[background-color,border-color,opacity] duration-150',
                  'focus:outline-none focus:ring-2 focus:ring-ecg-green focus:ring-offset-2 focus:ring-offset-black',
                  region.className,
                  active
                    ? 'border-ecg-green bg-ecg-green/45 opacity-100'
                    : hasFinding
                      ? 'border-pending-amber bg-pending-amber/30 opacity-100 hover:border-ecg-green hover:bg-ecg-green/20'
                      : 'border-transparent bg-transparent opacity-70 hover:border-ecg-green hover:bg-ecg-green/20',
                )}
              >
                {hasFinding && !active ? (
                  <span className="absolute right-0 top-0 grid h-4 w-4 place-items-center border border-pending-amber bg-black text-[0.65rem] font-black leading-none text-pending-amber">
                    !
                  </span>
                ) : null}
                <span className="sr-only">{region.label}</span>
              </button>
            )
          })}
        </div>
        <div className="border border-neutral-800 bg-neutral-900/40 p-3">
          <h3 className="text-xs uppercase tracking-wider text-neutral-400">Selected</h3>
          <div className="mt-3 grid min-w-0 gap-2" aria-label="Selected body parts">
            {displayedRegions.length > 0 ? (
              displayedRegions.map((region) => {
                const finding = findings[region.id]

                return (
                  <div
                    key={region.id}
                    className="grid min-w-0 max-w-full gap-1 border border-ecg-green bg-ecg-green px-2 py-1 text-xs text-black"
                  >
                    <span className="font-semibold uppercase tracking-wider">{region.label}</span>
                    {finding ? (
                      <p
                        className="min-w-0 whitespace-pre-wrap break-words font-mono normal-case tracking-normal text-black"
                      >
                        {finding}
                      </p>
                    ) : null}
                  </div>
                )
              })
            ) : (
              <span className="text-sm text-neutral-500">None</span>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
