import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { normalizeWagamiAPreferences, useWagamiAPreferences } from '../useWagamiAPreferences'

describe('useWagamiAPreferences', () => {
  beforeEach(() => window.localStorage.clear())

  it('defaults each Attempt scope to French with the LED enabled and persists changes', async () => {
    const first = renderHook(() => useWagamiAPreferences('ROOM.P1.1'))
    expect(first.result.current.preferences).toEqual({ locale: 'fr', shellAlarmLedEnabled: true, vitalLogInterval: 5 })
    act(() => {
      first.result.current.setLocale('en')
      first.result.current.setShellAlarmLedEnabled(false)
      first.result.current.setVitalLogInterval(3)
    })
    await waitFor(() => expect(window.localStorage.getItem('paramedic-monitor.wagami-a.preferences.ROOM.P1.1')).toContain('"locale":"en"'))
    first.unmount()

    const resumed = renderHook(() => useWagamiAPreferences('ROOM.P1.1'))
    await waitFor(() => expect(resumed.result.current.preferences).toEqual({ locale: 'en', shellAlarmLedEnabled: false, vitalLogInterval: 3 }))
  })

  it('resets when the Room or Attempt scope changes', () => {
    const { result, rerender } = renderHook(({ scope }) => useWagamiAPreferences(scope), {
      initialProps: { scope: 'ROOM.P1.1' },
    })
    act(() => result.current.setLocale('en'))
    rerender({ scope: 'ROOM.P1.2' })
    expect(result.current.preferences).toEqual({ locale: 'fr', shellAlarmLedEnabled: true, vitalLogInterval: 5 })
  })

  it('normalizes legacy and invalid saved intervals to five minutes', () => {
    expect(normalizeWagamiAPreferences({ locale: 'en', shellAlarmLedEnabled: false })).toEqual({
      locale: 'en',
      shellAlarmLedEnabled: false,
      vitalLogInterval: 5,
    })
    expect(normalizeWagamiAPreferences({ vitalLogInterval: 2 })).toEqual({
      locale: 'fr',
      shellAlarmLedEnabled: true,
      vitalLogInterval: 5,
    })
  })

  it('renders the French default on the server before restoring a saved client preference', () => {
    window.localStorage.setItem(
      'paramedic-monitor.wagami-a.preferences.preview',
      JSON.stringify({ locale: 'en', shellAlarmLedEnabled: false }),
    )

    function PreferenceProbe() {
      const { preferences } = useWagamiAPreferences('preview')
      return createElement('span', null, preferences.locale)
    }

    expect(renderToString(createElement(PreferenceProbe))).toContain('fr')
  })
})
