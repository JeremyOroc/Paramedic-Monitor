'use client'

import type {
  PatientPhysicalFindings,
  PatientPhysicalIconFindingId,
} from '@/lib/patientPhysicalAutoSort'
import { getPatientSnsMeasurementResult } from '@/lib/patientSnsMeasurement'
import { cn } from '@/lib/utils'
import type { PatientSnsMeasurementState } from '@/hooks/usePatientSnsMeasurements'
import type {
  PatientPhysicalIconGroupId,
  PatientSnsIconGroupId,
  PatientSnsMeasurementDurationSeconds,
  PatientSnsMeasurementGroupId,
} from '@/types/patientPhysical'

type IconFinding = {
  id: PatientPhysicalIconFindingId
  label: string
}

type PatientSnsGroup = {
  id: PatientSnsIconGroupId
  label: string
  iconMaskClass: string
  iconAlt: string
  findings: ReadonlyArray<IconFinding>
  showFindingLabels?: boolean
  showMissingFields?: boolean
}

export type PatientSnsControlsProps = {
  selected: ReadonlySet<string>
  findings: PatientPhysicalFindings
  activeIconGroup: PatientPhysicalIconGroupId | null
  onIconGroupClick: (selection: PatientSnsIconGroupId) => void
  measurements: PatientSnsMeasurementState
  onMeasurementStart: (
    group: PatientSnsMeasurementGroupId,
    durationSeconds: PatientSnsMeasurementDurationSeconds,
  ) => void
  onMeasurementTap: (group: PatientSnsMeasurementGroupId) => void
  onMeasurementCancel: (group: PatientSnsMeasurementGroupId) => void
}

const PATIENT_SNS_GROUPS: ReadonlyArray<PatientSnsGroup> = [
  {
    id: 'pulse',
    label: 'Pulse',
    iconMaskClass: "[mask-image:url('/images/patient-physical-pulse.png')]",
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
    iconMaskClass: "[mask-image:url('/images/patient-physical-lung.png')]",
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
    iconMaskClass: "[mask-image:url('/images/patient-physical-skin-extremities.png')]",
    iconAlt: 'Skin and extremities findings',
    findings: [{ id: 'skin-extremities-note', label: 'Skin/Extremities' }],
  },
]

function getFindingSummary(group: PatientSnsGroup, findings: PatientPhysicalFindings) {
  return group.findings
    .map((finding) => {
      const value = findings[finding.id]
      if (!value) return null
      return group.showFindingLabels ? `${finding.label}: ${value}` : value
    })
    .filter((value): value is string => Boolean(value))
    .join(' ')
}

function getMissingFindingLabels(
  group: PatientSnsGroup,
  findings: PatientPhysicalFindings,
) {
  return group.findings
    .filter((finding) => !findings[finding.id])
    .map((finding) => finding.label)
}

function isMeasurementGroup(
  group: PatientSnsIconGroupId,
): group is PatientSnsMeasurementGroupId {
  return group === 'pulse' || group === 'respiratory'
}

interface PatientSnsIconProps {
  group: PatientSnsGroup
  active: boolean
  hasFinding: boolean
}

function PatientSnsIcon({ group, active, hasFinding }: PatientSnsIconProps) {
  return (
    <>
      {hasFinding && !active ? (
        <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center border border-pending-amber bg-black text-[0.65rem] font-black leading-none text-pending-amber">
          !
        </span>
      ) : null}
      <span
        role="img"
        aria-label={group.iconAlt}
        className={cn(
          'h-14 w-14 bg-current [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain] transition-opacity',
          group.iconMaskClass,
          active
            ? 'text-ecg-green opacity-100'
            : hasFinding
              ? 'text-pending-amber opacity-90'
              : 'text-neutral-300 opacity-70',
        )}
      />
      <h3
        className={cn(
          'text-xs font-semibold uppercase tracking-wider',
          active ? 'text-ecg-green' : 'text-neutral-300',
        )}
      >
        {group.label}
      </h3>
    </>
  )
}

export function PatientSnsControls({
  selected,
  findings,
  activeIconGroup,
  onIconGroupClick,
  measurements,
  onMeasurementStart,
  onMeasurementTap,
  onMeasurementCancel,
}: PatientSnsControlsProps) {
  return (
    <div
      data-testid="patient-sns-controls"
      className="grid grid-cols-3 items-start gap-3 border-t border-neutral-800 pt-3"
    >
      {PATIENT_SNS_GROUPS.map((group) => {
        const active = selected.has(group.id)
        const hasFinding = group.findings.some((finding) => Boolean(findings[finding.id]))
        const summary = getFindingSummary(group, findings)
        const missingLabels = group.showMissingFields
          ? getMissingFindingLabels(group, findings)
          : []
        const measurementGroup = isMeasurementGroup(group.id) ? group.id : null
        const measurement = measurementGroup ? measurements[measurementGroup] : null
        const measurementResult =
          measurementGroup && measurement?.resultSnapshot
            ? getPatientSnsMeasurementResult(
                measurementGroup,
                measurement.resultSnapshot,
              )
            : null

        return (
          <section
            key={group.id}
            aria-label={`${group.label} icon findings`}
            className={cn(
              'grid min-w-0 gap-3 border bg-neutral-900/40 p-3',
              active ? 'border-ecg-green/60' : 'border-neutral-800',
            )}
          >
            {measurementGroup && measurement ? (
              <>
                <div
                  className={cn(
                    'relative grid justify-items-center gap-2 border bg-black p-2 transition-colors',
                    active
                      ? 'border-ecg-green text-ecg-green'
                      : hasFinding
                        ? 'border-pending-amber bg-pending-amber/20 text-pending-amber'
                        : 'border-neutral-700 text-neutral-300',
                  )}
                >
                  <PatientSnsIcon group={group} active={active} hasFinding={hasFinding} />
                </div>
                {measurement.endsAt !== null ? (
                  <button
                    type="button"
                    aria-label={`Cancel ${group.label} ${measurement.durationSeconds}-second measurement`}
                    onClick={() => onMeasurementCancel(measurementGroup)}
                    className="flex h-11 w-full items-center justify-center border border-pending-amber bg-pending-amber/15 px-3 font-mono text-sm font-black uppercase tracking-wider text-pending-amber transition-colors hover:bg-pending-amber/25 focus:outline-none focus:ring-2 focus:ring-pending-amber"
                  >
                    <span aria-live="polite">{measurement.secondsLeft}s</span>
                  </button>
                ) : (
                  <div
                    role="group"
                    aria-label={`${group.label} measurement options`}
                    className="grid grid-cols-3 gap-2"
                  >
                    {([15, 30] as const).map((durationSeconds) => (
                      <button
                        key={durationSeconds}
                        type="button"
                        aria-label={`${group.label} ${durationSeconds}s`}
                        onClick={() => onMeasurementStart(measurementGroup, durationSeconds)}
                        className="flex h-11 items-center justify-center border border-neutral-600 bg-neutral-900 px-2 font-mono text-xs font-bold uppercase tracking-wider text-neutral-200 transition-colors hover:border-ecg-green hover:bg-ecg-green/10 hover:text-ecg-green focus:outline-none focus:ring-2 focus:ring-ecg-green"
                      >
                        {durationSeconds}s
                      </button>
                    ))}
                    <button
                      type="button"
                      aria-label={`${group.label} Tap`}
                      onClick={() => onMeasurementTap(measurementGroup)}
                      className="flex h-11 items-center justify-center border border-neutral-600 bg-neutral-900 px-2 font-mono text-xs font-bold uppercase tracking-wider text-neutral-200 transition-colors hover:border-ecg-green hover:bg-ecg-green/10 hover:text-ecg-green focus:outline-none focus:ring-2 focus:ring-ecg-green"
                    >
                      Tap
                    </button>
                  </div>
                )}
                {measurementResult ? (
                  <div
                    role="region"
                    aria-label={`${group.label} measurement result`}
                    aria-live="polite"
                    className="grid min-w-0 gap-1 border border-ecg-green bg-black p-2 font-mono text-xs"
                  >
                    {measurementResult.lines.map((line) => (
                      <p key={line} className="whitespace-pre-wrap break-words text-ecg-green">
                        {line}
                      </p>
                    ))}
                    {measurementResult.missingLabels.length > 0 ? (
                      <p className="text-pending-amber">
                        Missing: {measurementResult.missingLabels.join(', ')}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <button
                  type="button"
                  aria-label={group.label}
                  aria-pressed={active}
                  onClick={() => onIconGroupClick(group.id)}
                  className={cn(
                    'relative grid justify-items-center gap-2 border p-2 transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-ecg-green focus:ring-offset-2 focus:ring-offset-black',
                    active
                      ? 'border-ecg-green bg-black text-ecg-green'
                      : hasFinding
                        ? 'border-pending-amber bg-pending-amber/20 text-pending-amber'
                        : 'border-neutral-700 bg-black text-neutral-300 hover:border-ecg-green hover:text-ecg-green',
                  )}
                >
                  <PatientSnsIcon group={group} active={active} hasFinding={hasFinding} />
                </button>
                {activeIconGroup === group.id ? (
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
              </>
            )}
          </section>
        )
      })}
    </div>
  )
}
