'use client'

import { useEffect, useRef, useState } from 'react'

import {
  DEFAULT_WAGAMI_A_PREFERENCES,
  type WagamiALocale,
  type WagamiAPreferences,
} from '@/types/wagamiA'

const STORAGE_PREFIX = 'paramedic-monitor.wagami-a.preferences'

function storageKey(scope: string): string {
  return `${STORAGE_PREFIX}.${scope}`
}

export function normalizeWagamiAPreferences(value: unknown): WagamiAPreferences {
  if (!value || typeof value !== 'object') return DEFAULT_WAGAMI_A_PREFERENCES
  const candidate = value as Record<string, unknown>
  return {
    locale: candidate.locale === 'en' ? 'en' : 'fr',
    shellAlarmLedEnabled: candidate.shellAlarmLedEnabled !== false,
  }
}

function loadPreferences(scope: string): WagamiAPreferences {
  if (typeof window === 'undefined') return DEFAULT_WAGAMI_A_PREFERENCES
  try {
    const stored = window.localStorage.getItem(storageKey(scope))
    return stored ? normalizeWagamiAPreferences(JSON.parse(stored)) : DEFAULT_WAGAMI_A_PREFERENCES
  } catch {
    return DEFAULT_WAGAMI_A_PREFERENCES
  }
}

export function useWagamiAPreferences(scope: string, enabled = true) {
  const [scoped, setScoped] = useState(() => ({ scope, value: DEFAULT_WAGAMI_A_PREFERENCES }))
  const [loadedScope, setLoadedScope] = useState<string | null>(null)
  const touchedScopeRef = useRef<string | null>(null)

  useEffect(() => {
    if (!enabled) return
    const timer = window.setTimeout(() => {
      if (touchedScopeRef.current !== scope) {
        setScoped({ scope, value: loadPreferences(scope) })
      }
      setLoadedScope(scope)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [enabled, scope])

  useEffect(() => {
    if (!enabled || loadedScope !== scope || scoped.scope !== scope) return
    window.localStorage.setItem(storageKey(scope), JSON.stringify(scoped.value))
  }, [enabled, loadedScope, scope, scoped])

  function setLocale(locale: WagamiALocale) {
    touchedScopeRef.current = scope
    setScoped((current) => ({
      scope,
      value: { ...(current.scope === scope ? current.value : DEFAULT_WAGAMI_A_PREFERENCES), locale },
    }))
  }

  function setShellAlarmLedEnabled(shellAlarmLedEnabled: boolean) {
    touchedScopeRef.current = scope
    setScoped((current) => ({
      scope,
      value: {
        ...(current.scope === scope ? current.value : DEFAULT_WAGAMI_A_PREFERENCES),
        shellAlarmLedEnabled,
      },
    }))
  }

  const preferences = scoped.scope === scope ? scoped.value : DEFAULT_WAGAMI_A_PREFERENCES

  return {
    preferences,
    setLocale,
    setShellAlarmLedEnabled,
  }
}
