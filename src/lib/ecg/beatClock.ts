export type BeatClock = {
  phase: (nowMs: number, cycleMs: number) => number
  reset: (nowMs: number) => void
}

/** One local cardiac phase shared by Wagami A's main ECG and live leads. */
export function createBeatClock(initialMs: number): BeatClock {
  let phase = 0
  let lastMs = initialMs

  return {
    phase(nowMs, cycleMs) {
      phase = (phase + Math.max(0, nowMs - lastMs) / Math.max(60, cycleMs)) % 1
      lastMs = nowMs
      return phase
    },
    reset(nowMs) {
      phase = 0
      lastMs = nowMs
    },
  }
}
