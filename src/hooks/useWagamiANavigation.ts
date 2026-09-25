'use client'

import { useEffect, useState } from 'react'

import { availableWagamiASelection, nextWagamiAAction, type WagamiANavigationAction } from '@/lib/wagamiANavigation'

export const WAGAMI_A_SELECTION_VISIBLE_MS = 5000

type RememberedSelection = {
  id: string
  visible: boolean
  visibilityVersion: number
}

type NavigationState = {
  active: boolean
  view: string
  remembered: Record<string, RememberedSelection | undefined>
}

type UseWagamiANavigationOptions = {
  active?: boolean
}

/** Remember one live selection per inner-display view without selecting disabled controls. */
export function useWagamiANavigation(
  view: string,
  actions: ReadonlyArray<WagamiANavigationAction>,
  { active = true }: UseWagamiANavigationOptions = {},
) {
  const [navigationState, setNavigationState] = useState<NavigationState>(() => ({
    active,
    view,
    remembered: {},
  }))
  let currentState = navigationState
  if (currentState.active !== active) {
    currentState = { active, view, remembered: {} }
  } else if (currentState.view !== view) {
    const restored = currentState.remembered[view]
    const restoredId = availableWagamiASelection(actions, restored?.id)
    currentState = {
      ...currentState,
      view,
      remembered: restored && restoredId
        ? {
            ...currentState.remembered,
            [view]: {
              ...restored,
              visible: true,
              visibilityVersion: restored.visibilityVersion + 1,
            },
          }
        : currentState.remembered,
    }
  }

  const rememberedSelection = currentState.remembered[view]
  const rememberedId = availableWagamiASelection(actions, rememberedSelection?.id)
  if (rememberedSelection && rememberedId === null) {
    const nextRemembered = { ...currentState.remembered }
    delete nextRemembered[view]
    currentState = { ...currentState, remembered: nextRemembered }
  }
  if (currentState !== navigationState) {
    setNavigationState(currentState)
  }

  const selectedId = active && rememberedId && rememberedSelection?.visible
    ? rememberedId
    : null
  const hasEnabledActions = actions.some((action) => action.enabled)
  const hasSelection = active && rememberedId !== null

  const reveal = (id: string) => {
    setNavigationState((current) => {
      if (!current.active) return current
      const previousVersion = current.remembered[view]?.visibilityVersion ?? 0
      return {
        ...current,
        remembered: {
          ...current.remembered,
          [view]: { id, visible: true, visibilityVersion: previousVersion + 1 },
        },
      }
    })
  }

  useEffect(() => {
    if (!active || rememberedId === null || !rememberedSelection?.visible) return
    const visibilityVersion = rememberedSelection.visibilityVersion
    const timer = window.setTimeout(() => {
      setNavigationState((current) => {
        const selection = current.remembered[view]
        if (!selection || selection.id !== rememberedId || selection.visibilityVersion !== visibilityVersion) return current
        return {
          ...current,
          remembered: {
            ...current.remembered,
            [view]: { ...selection, visible: false },
          },
        }
      })
    }, WAGAMI_A_SELECTION_VISIBLE_MS)
    return () => window.clearTimeout(timer)
  }, [active, rememberedId, rememberedSelection?.visibilityVersion, rememberedSelection?.visible, view])

  function move(direction: -1 | 1) {
    const next = nextWagamiAAction(actions, rememberedId, direction)
    if (next) reveal(next)
  }

  function enter() {
    const action = actions.find((candidate) => candidate.enabled && candidate.id === rememberedId)
    if (!action) return
    if (selectedId === null) {
      reveal(action.id)
      return
    }
    reveal(action.id)
    action.activate()
  }

  function touch(id: string) {
    const action = actions.find((candidate) => candidate.enabled && candidate.id === id)
    if (!action) return
    reveal(id)
    action.activate()
  }

  return { selectedId, hasSelection, hasEnabledActions, move, enter, touch }
}
