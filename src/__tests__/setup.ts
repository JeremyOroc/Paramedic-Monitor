import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Node 25 exposes its own `localStorage`/`sessionStorage` globals, inert unless
// the process was started with a valid --localstorage-file. Under vitest's jsdom
// environment `window === globalThis`, so Node's broken globals shadow jsdom's
// working Storage: `setItem` is undefined and anything persisted (the zustand
// stores, the participant token) throws. Install a real in-memory Storage over
// them. setup.ts runs per test file, so each file starts with empty storage.
function createMemoryStorage(): Storage {
  let entries = new Map<string, string>()
  return {
    get length() {
      return entries.size
    },
    key: (index: number) => Array.from(entries.keys())[index] ?? null,
    getItem: (key: string) => entries.get(String(key)) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(String(key), String(value))
    },
    removeItem: (key: string) => {
      entries.delete(String(key))
    },
    clear: () => {
      entries = new Map()
    },
  } as Storage
}

for (const name of ['localStorage', 'sessionStorage'] as const) {
  Object.defineProperty(globalThis, name, {
    value: createMemoryStorage(),
    configurable: true,
    writable: true,
  })
}

// Mock HTMLAudioElement — jsdom's play() returns undefined but code calls .catch() on it
window.HTMLMediaElement.prototype.play = () => Promise.resolve()
window.HTMLMediaElement.prototype.pause = () => {}

// next/navigation has no router context under jsdom. Back useSearchParams with the
// real jsdom URL so tests can opt into the ?dev=1 gate bypass via history.pushState.
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {}, back: () => {} }),
  usePathname: () => window.location.pathname,
}))
