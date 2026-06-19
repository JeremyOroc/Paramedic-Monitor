'use client'

import { useEffect, useRef, useState } from 'react'

import {
  fetchAddressSuggestions,
  getGeoapifyApiKey,
  type AddressSuggestion,
} from '@/lib/dispatchRoute'
import { cn } from '@/lib/utils'

type AddressAutocompleteProps = {
  label: string
  value: string
  onChange: (value: string) => void
  onSelect?: (suggestion: AddressSuggestion) => void
  disabled?: boolean
}

export function AddressAutocomplete({
  label,
  value,
  onChange,
  onSelect,
  disabled = false,
}: AddressAutocompleteProps) {
  const [focused, setFocused] = useState(false)
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [error, setError] = useState('')
  const requestIdRef = useRef(0)
  const hasKey = getGeoapifyApiKey() !== ''

  useEffect(() => {
    const query = value.trim()
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    const timeout = window.setTimeout(() => {
      if (!focused || !hasKey || query.length < 3) {
        if (requestIdRef.current !== requestId) return
        setSuggestions([])
        setLoading(false)
        setError('')
        return
      }

      setLoading(true)
      fetchAddressSuggestions(query)
        .then((nextSuggestions) => {
          if (requestIdRef.current !== requestId) return
          setSuggestions(nextSuggestions)
          setError('')
        })
        .catch(() => {
          if (requestIdRef.current !== requestId) return
          setSuggestions([])
          setError('Suggestions unavailable')
        })
        .finally(() => {
          if (requestIdRef.current === requestId) setLoading(false)
        })
    }, focused && hasKey && query.length >= 3 ? 500 : 0)

    return () => window.clearTimeout(timeout)
  }, [focused, hasKey, value])

  const showMenu = focused && (suggestions.length > 0 || loading || error !== '')

  return (
    <label className="relative grid gap-1">
      <span className="text-xs uppercase tracking-wider text-neutral-400">{label}</span>
      <input
        value={value}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 120)}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        autoComplete="off"
        className="border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-bp disabled:cursor-not-allowed disabled:opacity-60"
      />
      {!hasKey && (
        <span className="text-xs text-neutral-600">
          Add NEXT_PUBLIC_GEOAPIFY_API_KEY for address suggestions.
        </span>
      )}
      {showMenu && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden border border-neutral-700 bg-neutral-950 shadow-xl">
          {loading && (
            <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-neutral-500">
              Searching
            </div>
          )}
          {error !== '' && (
            <div className="px-3 py-2 text-xs font-bold text-pending-amber">
              {error}
            </div>
          )}
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(suggestion.formatted)
                onSelect?.(suggestion)
                setFocused(false)
                setSuggestions([])
              }}
              className={cn(
                'block w-full border-b border-neutral-800 px-3 py-2 text-left text-xs font-semibold leading-tight text-neutral-200 last:border-b-0',
                'hover:bg-neutral-800 focus:bg-neutral-800 focus:outline-none',
              )}
            >
              {suggestion.formatted}
            </button>
          ))}
        </div>
      )}
    </label>
  )
}
