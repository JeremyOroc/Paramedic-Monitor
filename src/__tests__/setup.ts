import '@testing-library/jest-dom'

// Mock Web Audio API — not available in jsdom
class MockAudioContext {
  state: AudioContextState = 'running'
  destination = {}
  createBufferSource() {
    return {
      buffer: null as AudioBuffer | null,
      connect() {},
      start() {},
    }
  }
  decodeAudioData(_: ArrayBuffer) {
    return Promise.resolve({} as AudioBuffer)
  }
  resume() {
    return Promise.resolve()
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).AudioContext = MockAudioContext

// Mock fetch for audio preload (module-level in audio.ts)
globalThis.fetch = vi.fn(() =>
  Promise.resolve({
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
  } as Response)
)
