'use client'

import { useState } from 'react'

import { availableWagamiASelection, nextWagamiAAction, type WagamiANavigationAction } from '@/lib/wagamiANavigation'

/** Remember one live selection per inner-display view without selecting disabled controls. */
export function useWagamiANavigation(view: string, actions: ReadonlyArray<WagamiANavigationAction>) {
  const [remembered, setRemembered] = useState<Record<string, string | null>>({})
  const selectedId = availableWagamiASelection(actions, remembered[view])
  const hasEnabledActions = actions.some((action) => action.enabled)

  function move(direction: -1 | 1) {
    const next = nextWagamiAAction(actions, selectedId, direction)
    setRemembered((current) => ({ ...current, [view]: next }))
  }

  function enter() {
    const action = actions.find((candidate) => candidate.enabled && candidate.id === selectedId)
    action?.activate()
  }

  function touch(id: string) {
    const action = actions.find((candidate) => candidate.enabled && candidate.id === id)
    if (!action) return
    setRemembered((current) => ({ ...current, [view]: id }))
    action.activate()
  }

  return { selectedId, hasEnabledActions, move, enter, touch }
}
