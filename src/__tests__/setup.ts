import '@testing-library/jest-dom'
import { vi } from 'vitest'

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
