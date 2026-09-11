'use client'

import { formatDistance } from '@/lib/dispatchRoute'
import {
  hospitalsForGroup,
  sortHospitalsByDrivingDistance,
} from '@/lib/receivingHospitals'
import { cn } from '@/lib/utils'
import type {
  HospitalDistanceMap,
  HospitalDistanceStatus,
  ReceivingHospital,
  ReceivingHospitalPatientGroup,
} from '@/types/receivingHospital'

type HospitalDirectoryPanelProps = {
  distances: HospitalDistanceMap
  distanceStatus: HospitalDistanceStatus
  selectedHospitalId: string | null
  pendingHospitalId: string | null
  failedHospitalId: string | null
  disabled: boolean
  onSelectHospital: (hospitalId: string) => void
}

const SECTIONS: Array<{
  patientGroup: ReceivingHospitalPatientGroup
  title: string
}> = [
  { patientGroup: 'adult', title: 'Adult Hospitals (Urgences-santé)' },
  { patientGroup: 'pediatric', title: 'Pediatric Hospitals' },
]

export function HospitalDirectoryPanel({
  distances,
  distanceStatus,
  selectedHospitalId,
  pendingHospitalId,
  failedHospitalId,
  disabled,
  onSelectHospital,
}: HospitalDirectoryPanelProps) {
  const distanceStatusMessage = distanceStatus === 'loading'
    ? 'Calculating driving distances…'
    : distanceStatus === 'failed'
      ? 'Distance ranking unavailable — reference order shown'
      : distanceStatus === 'idle'
        ? 'Reference order'
        : null

  return (
    <aside
      aria-label="Receiving Hospital Directory"
      className="flex h-full min-h-0 w-[30%] shrink-0 flex-col border-r border-neutral-700 bg-black/95 text-white"
    >
      <header className="shrink-0 border-b border-neutral-700 px-4 py-3">
        <p className="text-base font-black uppercase tracking-[0.12em] text-dispatch-blue">
          Receiving Hospital Directory
        </p>
        {distanceStatusMessage && (
          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-neutral-400">
            {distanceStatusMessage}
          </p>
        )}
      </header>
      <div
        data-testid="hospital-directory-scroll"
        data-visible-row-capacity="10"
        className="hospital-directory-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
      >
        {SECTIONS.map(({ patientGroup, title }) => (
          <HospitalSection
            key={patientGroup}
            title={title}
            hospitals={sortHospitalsByDrivingDistance(
              hospitalsForGroup(patientGroup),
              distanceStatus === 'ready' ? distances : {},
            )}
            distances={distances}
            selectedHospitalId={selectedHospitalId}
            pendingHospitalId={pendingHospitalId}
            failedHospitalId={failedHospitalId}
            disabled={disabled}
            onSelectHospital={onSelectHospital}
          />
        ))}
      </div>
    </aside>
  )
}

function HospitalSection({
  title,
  hospitals,
  distances,
  selectedHospitalId,
  pendingHospitalId,
  failedHospitalId,
  disabled,
  onSelectHospital,
}: {
  title: string
  hospitals: ReceivingHospital[]
  distances: HospitalDistanceMap
  selectedHospitalId: string | null
  pendingHospitalId: string | null
  failedHospitalId: string | null
  disabled: boolean
  onSelectHospital: (hospitalId: string) => void
}) {
  return (
    <section aria-label={title}>
      <h3 className="sticky top-0 z-10 border-y border-neutral-800 bg-dispatch-panel px-3 py-2 text-sm font-black">
        {title}
      </h3>
      <table className="w-full table-fixed border-collapse text-left text-sm leading-tight">
        <thead className="bg-black text-[11px] uppercase tracking-wide text-neutral-300">
          <tr>
            <th className="w-[42%] px-3 py-2">Hospital</th>
            <th className="w-[23%] px-2 py-2">Designation</th>
            <th className="w-[35%] px-2 py-2">Key Notes</th>
          </tr>
        </thead>
        <tbody>
          {hospitals.map((hospital) => {
            const selected = selectedHospitalId === hospital.id
            const pending = pendingHospitalId === hospital.id
            const failed = failedHospitalId === hospital.id
            return (
              <tr
                key={hospital.id}
                data-testid={`hospital-row-${hospital.id}`}
                aria-selected={selected}
                tabIndex={disabled || pending ? -1 : 0}
                onClick={() => {
                  if (!disabled && !pending) onSelectHospital(hospital.id)
                }}
                onKeyDown={(event) => {
                  if (disabled || pending || (event.key !== 'Enter' && event.key !== ' ')) return
                  event.preventDefault()
                  onSelectHospital(hospital.id)
                }}
                className={cn(
                  'hospital-directory-row border-t border-neutral-800 align-top outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-dispatch-blue',
                  !disabled && !pending && 'cursor-pointer hover:bg-white/5',
                  selected && 'bg-dispatch-red/20',
                  pending && 'bg-pending-amber/20',
                  failed && 'bg-dispatch-red/10',
                )}
              >
                <td className="h-full overflow-hidden break-words px-3 py-2">
                  <button
                    type="button"
                    disabled={disabled || pending}
                    aria-label={hospital.name}
                    title={hospital.name}
                    onClick={(event) => {
                      event.stopPropagation()
                      onSelectHospital(hospital.id)
                    }}
                    className="hospital-directory-clamp w-full text-left font-bold text-white underline decoration-dotted underline-offset-2 enabled:hover:text-dispatch-blue disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {hospital.name}
                  </button>
                  {typeof distances[hospital.id] === 'number' && (
                    <span className="mt-1 block font-mono text-xs text-dispatch-blue">
                      {formatDistance(distances[hospital.id])}
                    </span>
                  )}
                  {pending && <span className="block text-sm text-pending-amber">Routing…</span>}
                  {failed && <span className="block text-sm text-dispatch-red">Route unavailable</span>}
                </td>
                <td
                  aria-label={hospital.designation}
                  title={hospital.designation}
                  className="h-full overflow-hidden break-words px-2 py-2 text-neutral-200"
                >
                  <span className="hospital-directory-clamp">{hospital.designation}</span>
                </td>
                <td
                  aria-label={hospital.keyNotes}
                  title={hospital.keyNotes}
                  className="h-full overflow-hidden break-words px-2 py-2 text-neutral-300"
                >
                  <span className="hospital-directory-clamp">{hospital.keyNotes}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}
