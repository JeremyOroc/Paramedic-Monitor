'use client'

import { useEffect, useState, type ChangeEvent } from 'react'

import { AddressAutocomplete } from '@/components/instructor/AddressAutocomplete'
import {
  fetchDrivingRoute,
  geocodeAddress,
  getGeoapifyApiKey,
} from '@/lib/dispatchRoute'
import { cn } from '@/lib/utils'
import { useMonitorStore } from '@/store/monitorStore'
import {
  DEFAULT_DISPATCH_ROUTE,
  JOHN_ABBOTT_ADDRESS,
  JOHN_ABBOTT_COORDINATES,
} from '@/types/dispatchRoute'

const PRIMARY_FIELDS = [
  { field: 'address', label: 'Adresse', multiline: false },
  { field: 'problem', label: 'Probleme', multiline: true },
  { field: 'information', label: 'Information', multiline: true },
  { field: 'update', label: 'Mise a jour', multiline: true },
  { field: 'time', label: 'Heure', multiline: false },
] as const

const DISPATCH_FIELDS = [
  { field: 'callNumber', label: 'Call #' },
  { field: 'priority', label: 'Priority' },
  { field: 'mpdsCode', label: 'MPDS Code' },
] as const

const EXTRA_FIELDS = [
  { labelField: 'extra1Label', valueField: 'extra1', fallbackLabel: 'Extra 1' },
  { labelField: 'extra2Label', valueField: 'extra2', fallbackLabel: 'Extra 2' },
  { labelField: 'extra3Label', valueField: 'extra3', fallbackLabel: 'Extra 3' },
] as const

type CallerInfoDraft = ReturnType<typeof useMonitorStore.getState>['callerInfoDraft']

type CallerInfoFormProps = {
  autoSortText: string
  onAutoSortChange: (value: string) => void
  scenarioTitle: string
  onScenarioTitleChange: (value: string) => void
}

function getInitialExtraCount(callerInfoDraft: CallerInfoDraft) {
  return EXTRA_FIELDS.reduce((count, { labelField, valueField }, index) => {
    const hasValue =
      callerInfoDraft[labelField].trim() !== '' || callerInfoDraft[valueField].trim() !== ''

    return hasValue ? index + 1 : count
  }, 0)
}

function formatDispatchCountdownPreview(minutes: number, seconds: number): string {
  const totalSeconds = minutes * 60 + seconds
  if (totalSeconds <= 0) return 'At scene'
  const roundedMinutes = Math.ceil(totalSeconds / 60)
  return `${roundedMinutes} min`
}

export function CallerInfoForm({
  autoSortText,
  onAutoSortChange,
  scenarioTitle,
  onScenarioTitleChange,
}: CallerInfoFormProps) {
  const callerInfoDraft = useMonitorStore((s) => s.callerInfoDraft)
  const setCallerInfoDraft = useMonitorStore((s) => s.setCallerInfoDraft)
  const dispatchMinutes = useMonitorStore((s) => s.dispatchMinutes)
  const dispatchSeconds = useMonitorStore((s) => s.dispatchSeconds)
  const setDispatchMinutes = useMonitorStore((s) => s.setDispatchMinutes)
  const setDispatchSeconds = useMonitorStore((s) => s.setDispatchSeconds)
  const dispatchArmed = useMonitorStore((s) => s.dispatch.armed)
  const dispatchRouteDraft = useMonitorStore((s) => s.dispatchRouteDraft)
  const setDispatchRouteDraft = useMonitorStore((s) => s.setDispatchRouteDraft)
  const [extraCount, setExtraCount] = useState(() => getInitialExtraCount(callerInfoDraft))
  const [expanded, setExpanded] = useState(false)
  const visibleExtraFields = EXTRA_FIELDS.slice(0, extraCount)
  const extraLimitReached = extraCount >= EXTRA_FIELDS.length

  const handleAutoSortChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onAutoSortChange(event.target.value)
  }

  const routeOriginAddress = dispatchRouteDraft.originAddress
  const routeDestinationAddress = callerInfoDraft.address
  const dispatchEtaPreview = formatDispatchCountdownPreview(dispatchMinutes, dispatchSeconds)

  useEffect(() => {
    const originAddress = routeOriginAddress.trim() || JOHN_ABBOTT_ADDRESS
    const destinationAddress = routeDestinationAddress.trim()

    if (destinationAddress.length === 0) {
      setDispatchRouteDraft({
        ...DEFAULT_DISPATCH_ROUTE,
        originAddress,
        origin:
          originAddress === JOHN_ABBOTT_ADDRESS
            ? JOHN_ABBOTT_COORDINATES
            : null,
      })
      return
    }

    if (!getGeoapifyApiKey()) {
      setDispatchRouteDraft({
        ...DEFAULT_DISPATCH_ROUTE,
        originAddress,
        destinationAddress,
        status: 'failed',
        error: 'Geoapify API key missing',
      })
      return
    }

    let cancelled = false
    const timeout = window.setTimeout(() => {
      setDispatchRouteDraft({
        ...DEFAULT_DISPATCH_ROUTE,
        originAddress,
        destinationAddress,
        status: 'loading',
      })

      async function buildRoute() {
        const origin =
          originAddress === JOHN_ABBOTT_ADDRESS
            ? {
                formatted: JOHN_ABBOTT_ADDRESS,
                latLng: JOHN_ABBOTT_COORDINATES,
              }
            : await geocodeAddress(originAddress)
        const destination = await geocodeAddress(destinationAddress)

        if (!origin || !destination) {
          throw new Error('Address not found')
        }

        const route = await fetchDrivingRoute(origin.latLng, destination.latLng)
        if (cancelled) return

        setDispatchRouteDraft({
          originAddress,
          destinationAddress,
          origin: origin.latLng,
          destination: destination.latLng,
          distanceMeters: route.distanceMeters,
          durationSeconds: route.durationSeconds,
          geometry: route.geometry,
          startedAt: null,
          status: 'ready',
          error: '',
        })
      }

      buildRoute().catch((error: unknown) => {
        if (cancelled) return
        setDispatchRouteDraft({
          ...DEFAULT_DISPATCH_ROUTE,
          originAddress,
          destinationAddress,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Route unavailable',
        })
      })
    }, 750)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [routeDestinationAddress, routeOriginAddress, setDispatchRouteDraft])

  return (
    <section className="flex flex-col gap-3 border border-neutral-800 bg-neutral-950 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            aria-expanded={expanded}
            aria-controls="caller-info-editor"
            aria-label={`${expanded ? 'Collapse' : 'Expand'} Caller Info`}
            className="grid h-6 w-6 place-items-center border border-neutral-700 font-mono text-sm font-bold text-cyan-bp hover:border-cyan-bp focus:outline-none focus:ring-2 focus:ring-cyan-bp"
          >
            {expanded ? '−' : '+'}
          </button>
          <h2 className="text-sm uppercase tracking-wider text-neutral-400">Caller Info</h2>
        </div>
      </div>
      {expanded ? (
        <div id="caller-info-editor" className="grid gap-3">
        <label className="grid gap-1">
          <span className="text-xs uppercase tracking-wider text-neutral-400">Title</span>
          <input
            value={scenarioTitle}
            onChange={(event) => onScenarioTitleChange(event.target.value)}
            aria-label="Scenario title"
            placeholder="Scenario title"
            className="border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-bp"
          />
        </label>
        <label className="grid gap-1">
          <span className="text-xs uppercase tracking-wider text-neutral-400">
            Auto-sort scenario
          </span>
          <textarea
            value={autoSortText}
            onChange={handleAutoSortChange}
            aria-label="Auto-sort scenario"
            rows={5}
            placeholder="CALL #:&#10;PRIORITY:&#10;MPDS CODE:&#10;ADDRESS:&#10;PATIENT:&#10;CHIEF COMPLAINT:&#10;DETAILS:&#10;STATUS:&#10;UNITS ASSIGNED:&#10;TIME RECEIVED:"
            className="min-h-28 resize-y border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-bp"
          />
        </label>
        <div className="grid gap-1">
          <span className="text-xs uppercase tracking-wider text-neutral-400">
            Dispatch countdown
          </span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              step={1}
              value={dispatchMinutes === 0 ? '' : dispatchMinutes}
              placeholder="0"
              onChange={(e) => setDispatchMinutes(Number(e.target.value))}
              aria-label="Dispatch countdown minutes"
              className="w-20 border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-bp"
            />
            <span className="text-xs uppercase tracking-wider text-neutral-500">min</span>
            <input
              type="number"
              min={0}
              max={59}
              step={1}
              value={dispatchSeconds === 0 ? '' : dispatchSeconds}
              placeholder="0"
              onChange={(e) => setDispatchSeconds(Number(e.target.value))}
              aria-label="Dispatch countdown seconds"
              className="w-20 border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-bp"
            />
            <span className="text-xs uppercase tracking-wider text-neutral-500">sec</span>
          </div>
          <span className="text-xs text-neutral-600">
            {dispatchArmed
              ? 'Dispatch already armed — further Sends only update caller info.'
              : 'The first Send arms the dispatch and starts this countdown on the monitor.'}
          </span>
        </div>
        <div className="grid gap-3 border border-neutral-800 bg-neutral-900/40 p-3">
          <span className="text-xs uppercase tracking-wider text-neutral-400">
            Response route
          </span>
          <AddressAutocomplete
            label="Start address"
            value={dispatchRouteDraft.originAddress}
            onChange={(value) =>
              setDispatchRouteDraft({
                ...dispatchRouteDraft,
                originAddress: value,
                origin: value === JOHN_ABBOTT_ADDRESS ? JOHN_ABBOTT_COORDINATES : null,
                status: 'idle',
                error: '',
              })
            }
            onSelect={(suggestion) =>
              setDispatchRouteDraft({
                ...dispatchRouteDraft,
                originAddress: suggestion.formatted,
                origin: suggestion.latLng,
                status: 'idle',
                error: '',
              })
            }
          />
          <div className="grid grid-cols-3 gap-3 text-xs font-bold uppercase tracking-wider">
            <span className="text-neutral-500">
              Route <span className="text-neutral-300">{dispatchRouteDraft.status}</span>
            </span>
            <span className="text-neutral-500">
              Distance{' '}
              <span className="text-neutral-300">
                {dispatchRouteDraft.distanceMeters === null
                  ? '--'
                  : `${(dispatchRouteDraft.distanceMeters / 1000).toFixed(1)} km`}
              </span>
            </span>
            <span className="text-neutral-500">
              ETA{' '}
              <span className="text-neutral-300">
                {dispatchEtaPreview}
              </span>
            </span>
          </div>
          {dispatchRouteDraft.error !== '' && (
            <span className="text-xs font-semibold text-pending-amber">
              {dispatchRouteDraft.error}
            </span>
          )}
        </div>
        <div className="grid gap-2 border border-neutral-800 bg-neutral-900/40 p-3">
          <span className="text-xs uppercase tracking-wider text-neutral-400">
            Call / Priority / MPDS
          </span>
          <div className="grid gap-3 md:grid-cols-3">
            {DISPATCH_FIELDS.map(({ field, label }) => (
              <label key={field} className="grid gap-1">
                <span className="text-xs uppercase tracking-wider text-neutral-400">
                  {label}
                </span>
                <input
                  value={callerInfoDraft[field]}
                  onChange={(e) => setCallerInfoDraft(field, e.target.value)}
                  aria-label={label}
                  className="border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-bp"
                />
              </label>
            ))}
          </div>
        </div>
        {PRIMARY_FIELDS.map(({ field, label, multiline }) => (
          field === 'address' ? (
            <AddressAutocomplete
              key={field}
              label={label}
              value={callerInfoDraft[field]}
              onChange={(value) => setCallerInfoDraft(field, value)}
              onSelect={(suggestion) => {
                setCallerInfoDraft(field, suggestion.formatted)
                setDispatchRouteDraft({
                  ...dispatchRouteDraft,
                  destinationAddress: suggestion.formatted,
                  destination: suggestion.latLng,
                  status: 'idle',
                  error: '',
                })
              }}
            />
          ) : (
            <label key={field} className="grid gap-1">
              <span className="text-xs uppercase tracking-wider text-neutral-400">{label}</span>
              {multiline ? (
              <textarea
                value={callerInfoDraft[field]}
                onChange={(e) => setCallerInfoDraft(field, e.target.value)}
                aria-label={label}
                rows={3}
                className="min-h-20 resize-y border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-bp"
              />
              ) : (
              <input
                value={callerInfoDraft[field]}
                onChange={(e) => setCallerInfoDraft(field, e.target.value)}
                aria-label={label}
                className="border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-bp"
              />
              )}
            </label>
          )
        ))}
        {visibleExtraFields.map(({ labelField, valueField, fallbackLabel }) => (
          <div key={valueField} className="grid gap-2 border-t border-neutral-800 pt-3">
            <label>
              <span className="sr-only">{fallbackLabel} title</span>
              <input
                value={callerInfoDraft[labelField]}
                onChange={(e) => setCallerInfoDraft(labelField, e.target.value)}
                aria-label={`${fallbackLabel} title`}
                placeholder="Title"
                className="w-full border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-bp"
              />
            </label>
            <label>
              <span className="sr-only">{fallbackLabel} input</span>
              <input
                value={callerInfoDraft[valueField]}
                onChange={(e) => setCallerInfoDraft(valueField, e.target.value)}
                aria-label={`${fallbackLabel} input`}
                placeholder="Input"
                className="w-full border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-bp"
              />
            </label>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setExtraCount((count) => Math.min(count + 1, EXTRA_FIELDS.length))}
          disabled={extraLimitReached}
          className={cn(
            'border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm font-semibold uppercase tracking-wider text-cyan-bp hover:border-cyan-bp focus:outline-none focus:ring-2 focus:ring-cyan-bp',
            extraLimitReached && 'cursor-not-allowed border-neutral-800 text-neutral-600 hover:border-neutral-800',
          )}
        >
          Add extra
        </button>
        </div>
      ) : null}
    </section>
  )
}
