'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

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
      <span
        role="img"
        aria-label={group.iconAlt}
        className={cn(
          'h-10 w-10 bg-current [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain] transition-opacity motion-reduce:transition-none xl:[@media(min-height:800px)]:h-12 xl:[@media(min-height:800px)]:w-12',
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
          'text-[10px] font-semibold uppercase tracking-wider xl:[@media(min-height:800px)]:text-xs',
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
  const [hoveredGroup, setHoveredGroup] = useState<PatientSnsMeasurementGroupId | null>(null)
  const [focusedGroup, setFocusedGroup] = useState<PatientSnsMeasurementGroupId | null>(null)
  const [pinnedGroup, setPinnedGroup] = useState<PatientSnsMeasurementGroupId | null>(null)
  const disclosureButtonRefs = useRef<
    Partial<Record<PatientSnsMeasurementGroupId, HTMLButtonElement | null>>
  >({})
  const countdownButtonRefs = useRef<
    Partial<Record<PatientSnsMeasurementGroupId, HTMLButtonElement | null>>
  >({})
  const cardRefs = useRef<
    Partial<Record<PatientSnsMeasurementGroupId, HTMLElement | null>>
  >({})
  const lastPointerTypeRef = useRef<string | null>(null)
  const suppressFocusRevealRef = useRef<PatientSnsMeasurementGroupId | null>(null)
  const previousRunningRef = useRef<Record<PatientSnsMeasurementGroupId, boolean>>({
    pulse: measurements.pulse.endsAt !== null,
    respiratory: measurements.respiratory.endsAt !== null,
  })
  const pulseRunning = measurements.pulse.endsAt !== null
  const respiratoryRunning = measurements.respiratory.endsAt !== null

  const focusDisclosureWithoutReveal = useCallback((group: PatientSnsMeasurementGroupId) => {
    suppressFocusRevealRef.current = group
    disclosureButtonRefs.current[group]?.focus()
  }, [])

  useEffect(() => {
    if (pinnedGroup === null) return

    const handlePointerDown = (event: PointerEvent) => {
      const card = cardRefs.current[pinnedGroup]
      if (event.target instanceof Node && card?.contains(event.target)) return
      setPinnedGroup(null)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      const group = pinnedGroup
      setPinnedGroup(null)
      setFocusedGroup((current) => (current === group ? null : current))
      setHoveredGroup((current) => (current === group ? null : current))
      focusDisclosureWithoutReveal(group)
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [focusDisclosureWithoutReveal, pinnedGroup])

  useEffect(() => {
    const running: Record<PatientSnsMeasurementGroupId, boolean> = {
      pulse: pulseRunning,
      respiratory: respiratoryRunning,
    }
    for (const group of ['pulse', 'respiratory'] as const) {
      const wasRunning = previousRunningRef.current[group]
      if (!wasRunning && running[group]) countdownButtonRefs.current[group]?.focus()
      if (wasRunning && !running[group]) focusDisclosureWithoutReveal(group)
    }
    previousRunningRef.current = running
  }, [focusDisclosureWithoutReveal, pulseRunning, respiratoryRunning])

  return (
    <div
      data-testid="patient-sns-controls"
      className="grid grid-cols-3 items-start gap-2 border-t border-neutral-800 pt-2 xl:[@media(min-height:800px)]:gap-3 xl:[@media(min-height:800px)]:pt-3"
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
            ref={(element) => {
              if (measurementGroup) cardRefs.current[measurementGroup] = element
            }}
            className={cn(
              'relative grid min-w-0 gap-2 border bg-neutral-900/40 p-2 xl:[@media(min-height:800px)]:gap-3 xl:[@media(min-height:800px)]:p-3',
              active
                ? 'border-ecg-green/60'
                : hasFinding
                  ? 'border-pending-amber/80'
                  : 'border-neutral-800',
            )}
          >
            {hasFinding && !active ? (
              <span className="absolute right-1 top-1 z-20 grid h-4 w-4 place-items-center border border-pending-amber bg-black text-[0.65rem] font-black leading-none text-pending-amber">
                !
              </span>
            ) : null}
            {measurementGroup && measurement ? (
              <>
                {measurement.endsAt !== null ? (
                  <button
                    ref={(element) => {
                      countdownButtonRefs.current[measurementGroup] = element
                    }}
                    type="button"
                    aria-label={`Cancel ${group.label} ${measurement.durationSeconds}-second measurement`}
                    onClick={() => {
                      setPinnedGroup((current) => current === measurementGroup ? null : current)
                      setFocusedGroup((current) => current === measurementGroup ? null : current)
                      onMeasurementCancel(measurementGroup)
                    }}
                    className="flex h-[4.5rem] w-full items-center justify-center border border-pending-amber bg-pending-amber/15 px-3 font-mono text-sm font-black uppercase tracking-wider text-pending-amber transition-colors hover:bg-pending-amber/25 focus:outline-none focus:ring-2 focus:ring-pending-amber motion-reduce:transition-none xl:[@media(min-height:800px)]:h-24 xl:[@media(min-height:800px)]:text-base"
                  >
                    <span aria-live="polite">{measurement.secondsLeft}s</span>
                  </button>
                ) : (
                  <div
                    className="relative h-[4.5rem] min-w-0 xl:[@media(min-height:800px)]:h-24"
                    data-testid={`${measurementGroup}-measurement-surface`}
                    onPointerEnter={(event) => {
                      if (event.pointerType !== 'touch') setHoveredGroup(measurementGroup)
                    }}
                    onPointerLeave={(event) => {
                      if (event.pointerType !== 'touch') {
                        setHoveredGroup((current) => current === measurementGroup ? null : current)
                      }
                    }}
                    onFocusCapture={() => {
                      if (suppressFocusRevealRef.current === measurementGroup) {
                        suppressFocusRevealRef.current = null
                        return
                      }
                      setFocusedGroup(measurementGroup)
                    }}
                    onBlurCapture={(event) => {
                      if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) {
                        return
                      }
                      setFocusedGroup((current) => current === measurementGroup ? null : current)
                    }}
                  >
                    <button
                      ref={(element) => {
                        disclosureButtonRefs.current[measurementGroup] = element
                      }}
                      type="button"
                      aria-label={`${group.label} measurement controls`}
                      aria-expanded={
                        hoveredGroup === measurementGroup ||
                        focusedGroup === measurementGroup ||
                        pinnedGroup === measurementGroup
                      }
                      aria-controls={`${measurementGroup}-measurement-options`}
                      onPointerDown={(event) => {
                        lastPointerTypeRef.current = event.pointerType
                      }}
                      onClick={() => {
                        const pointerType = lastPointerTypeRef.current
                        lastPointerTypeRef.current = null
                        if (pointerType !== 'touch') return
                        setPinnedGroup((current) => current === measurementGroup ? null : measurementGroup)
                      }}
                      className={cn(
                        'absolute inset-0 grid justify-items-center gap-1 border bg-black p-1.5',
                        'transition-[opacity,border-color,color,background-color] duration-150',
                        'focus:outline-none focus:ring-2 focus:ring-ecg-green focus:ring-inset',
                        'motion-reduce:transition-none',
                        active
                          ? 'border-ecg-green text-ecg-green'
                          : hasFinding
                            ? 'border-pending-amber bg-pending-amber/20 text-pending-amber'
                            : 'border-neutral-700 text-neutral-300',
                        (hoveredGroup === measurementGroup ||
                          focusedGroup === measurementGroup ||
                          pinnedGroup === measurementGroup) &&
                          'pointer-events-none opacity-0',
                      )}
                    >
                      <PatientSnsIcon group={group} active={active} hasFinding={hasFinding} />
                    </button>
                    {hoveredGroup === measurementGroup ||
                    focusedGroup === measurementGroup ||
                    pinnedGroup === measurementGroup ? (
                      <div
                        id={`${measurementGroup}-measurement-options`}
                        role="group"
                        aria-label={`${group.label} measurement options`}
                        className="absolute inset-0 grid grid-cols-3 gap-1 opacity-100 transition-opacity duration-150 starting:opacity-0 motion-reduce:transition-none"
                      >
                        {([15, 30] as const).map((durationSeconds) => (
                          <button
                            key={durationSeconds}
                            type="button"
                            aria-label={`${group.label} ${durationSeconds}s`}
                            onClick={() => {
                              setPinnedGroup((current) => current === measurementGroup ? null : current)
                              setFocusedGroup((current) => current === measurementGroup ? null : current)
                              setHoveredGroup((current) => current === measurementGroup ? null : current)
                              onMeasurementStart(measurementGroup, durationSeconds)
                            }}
                            className="flex min-h-11 items-center justify-center border border-neutral-600 bg-neutral-900 px-1 font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-200 transition-colors hover:border-ecg-green hover:bg-ecg-green/10 hover:text-ecg-green focus:outline-none focus:ring-2 focus:ring-ecg-green motion-reduce:transition-none xl:[@media(min-height:800px)]:text-xs"
                          >
                            {durationSeconds}s
                          </button>
                        ))}
                        <button
                          type="button"
                          aria-label={`${group.label} Tap`}
                          onClick={() => {
                            setPinnedGroup((current) => current === measurementGroup ? null : current)
                            setFocusedGroup((current) => current === measurementGroup ? null : current)
                            onMeasurementTap(measurementGroup)
                            focusDisclosureWithoutReveal(measurementGroup)
                          }}
                          className="flex min-h-11 items-center justify-center border border-neutral-600 bg-neutral-900 px-1 font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-200 transition-colors hover:border-ecg-green hover:bg-ecg-green/10 hover:text-ecg-green focus:outline-none focus:ring-2 focus:ring-ecg-green motion-reduce:transition-none xl:[@media(min-height:800px)]:text-xs"
                        >
                          Tap
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}
                {measurementResult ? (
                  <div
                    role="region"
                    aria-label={`${group.label} measurement result`}
                    aria-live="polite"
                    className="grid max-h-20 min-w-0 gap-1 overflow-y-auto border border-ecg-green bg-black p-2 font-mono text-[10px] leading-4"
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
                    'relative grid h-[4.5rem] justify-items-center gap-1 border p-1.5 transition-colors xl:[@media(min-height:800px)]:h-24 xl:[@media(min-height:800px)]:p-2',
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
