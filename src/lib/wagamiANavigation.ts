export type WagamiANavigationAction = {
  id: string
  enabled: boolean
  activate: () => void
}

export const WAGAMI_A_MONITOR_ACTION_ORDER = [
  'twelveLead', 'etco2', 'medications', 'callInfo', 'vitalLog', 'configure',
  'energyDown', 'energyUp',
] as const

/** Only enabled controls belong to the circular hardware-navigation ring. */
export function nextWagamiAAction(
  actions: ReadonlyArray<Pick<WagamiANavigationAction, 'id' | 'enabled'>>,
  selectedId: string | null,
  direction: -1 | 1,
): string | null {
  const enabled = actions.filter((action) => action.enabled)
  if (enabled.length === 0) return null
  const selectedIndex = enabled.findIndex((action) => action.id === selectedId)
  if (selectedIndex === -1) return enabled[direction === 1 ? 0 : enabled.length - 1].id
  return enabled[(selectedIndex + direction + enabled.length) % enabled.length].id
}

export function availableWagamiASelection(
  actions: ReadonlyArray<Pick<WagamiANavigationAction, 'id' | 'enabled'>>,
  rememberedId: string | null | undefined,
): string | null {
  return actions.some((action) => action.enabled && action.id === rememberedId) ? rememberedId ?? null : null
}
