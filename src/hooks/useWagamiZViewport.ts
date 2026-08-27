'use client'

import { useSyncExternalStore } from 'react'

export const WAGAMI_Z_MIN_VIEWPORT_WIDTH = 1024
export const WAGAMI_Z_MIN_VIEWPORT_HEIGHT = 700

export type WagamiZViewportState = 'supported' | 'portrait' | 'undersized'

function getViewportDimensions(): { width: number; height: number } {
  const viewport = window.visualViewport
  return {
    width: viewport?.width ?? window.innerWidth,
    height: viewport?.height ?? window.innerHeight,
  }
}

export function getWagamiZViewportState(): WagamiZViewportState {
  const { width, height } = getViewportDimensions()

  if (height >= width) return 'portrait'
  if (
    width < WAGAMI_Z_MIN_VIEWPORT_WIDTH ||
    height < WAGAMI_Z_MIN_VIEWPORT_HEIGHT
  ) {
    return 'undersized'
  }
  return 'supported'
}

function subscribeToViewport(onStoreChange: () => void): () => void {
  const viewport = window.visualViewport
  window.addEventListener('resize', onStoreChange)
  window.addEventListener('orientationchange', onStoreChange)
  viewport?.addEventListener('resize', onStoreChange)

  return () => {
    window.removeEventListener('resize', onStoreChange)
    window.removeEventListener('orientationchange', onStoreChange)
    viewport?.removeEventListener('resize', onStoreChange)
  }
}

export function useWagamiZViewport(): WagamiZViewportState {
  return useSyncExternalStore(
    subscribeToViewport,
    getWagamiZViewportState,
    () => 'supported',
  )
}
