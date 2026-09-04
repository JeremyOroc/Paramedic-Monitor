/**
 * A trainee action as the queue holds it: what was pressed, plus the moment
 * and the state version at the press, stamped on enqueue rather than on
 * send. That is the whole point of the queue (docs/adr/0004) -- an action
 * that waits out a wifi drop still lands at the time it happened, against
 * the patient the trainee was looking at.
 */
export type QueuedAction = {
  /** Validated server-side against the known kinds; a string here so the monitor's emitter type fits. */
  kind: string
  label: string
  payload?: unknown
  stateVersion: number | null
  occurredAtClient: string
  captureSequence: number
  clockOffsetMs: number | null
}

export type ActionClock = {
  stateVersion: number | null
  clockOffsetMs: number | null
}

/**
 * `retry` is a transient failure -- network, 5xx -- and the action stays at
 * the head of the queue. `drop` is a permanent one -- a 4xx -- and the action
 * is discarded so the ones behind it are not stuck forever behind a client
 * bug. Nothing else is ever dropped.
 */
export type SendOutcome = 'sent' | 'retry' | 'drop'
export type ActionSender = (action: QueuedAction) => Promise<SendOutcome>

export type ActionQueueOptions = {
  send: ActionSender
  onDrop?: (action: QueuedAction) => void
  baseDelayMs?: number
  maxDelayMs?: number
  now?: () => number
  setTimeout?: (fn: () => void, ms: number) => unknown
  clearTimeout?: (handle: unknown) => void
}

export type ActionQueue = {
  enqueue: (
    event: Pick<QueuedAction, 'kind' | 'label' | 'payload'>,
    clock: ActionClock,
  ) => void
  /** Actions not yet acknowledged by the server, in press order. */
  pending: () => readonly QueuedAction[]
  /** Resolves once the queue is empty or stopped. For tests and teardown. */
  settled: () => Promise<void>
  stop: () => void
}

export const DEFAULT_BASE_DELAY_MS = 1000
export const DEFAULT_MAX_DELAY_MS = 30_000

export function createActionQueue({
  send,
  onDrop,
  baseDelayMs = DEFAULT_BASE_DELAY_MS,
  maxDelayMs = DEFAULT_MAX_DELAY_MS,
  now = () => Date.now(),
  setTimeout: schedule = (fn, ms) => globalThis.setTimeout(fn, ms),
  clearTimeout: cancel = (handle) => globalThis.clearTimeout(handle as number),
}: ActionQueueOptions): ActionQueue {
  const items: QueuedAction[] = []
  let sequence = 0
  let draining = false
  let stopped = false
  let delayMs = baseDelayMs
  let timer: unknown = null
  let idle: Promise<void> = Promise.resolve()
  let resolveIdle: (() => void) | null = null

  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      timer = schedule(() => {
        timer = null
        resolve()
      }, ms)
    })

  async function drain() {
    if (draining || stopped) return
    draining = true
    idle = new Promise((resolve) => {
      resolveIdle = resolve
    })
    try {
      while (items.length > 0 && !stopped) {
        const head = items[0]
        let outcome: SendOutcome
        try {
          outcome = await send(head)
        } catch {
          outcome = 'retry'
        }
        if (stopped) break
        if (outcome === 'sent') {
          items.shift()
          delayMs = baseDelayMs
        } else if (outcome === 'drop') {
          items.shift()
          onDrop?.(head)
          delayMs = baseDelayMs
        } else {
          // Stay at the head, back off, try again. The action is never lost;
          // it is only late.
          await wait(delayMs)
          delayMs = Math.min(delayMs * 2, maxDelayMs)
        }
      }
    } finally {
      draining = false
      resolveIdle?.()
      resolveIdle = null
    }
  }

  return {
    enqueue(event, clock) {
      if (stopped) return
      items.push({
        kind: event.kind,
        label: event.label,
        payload: event.payload,
        stateVersion: clock.stateVersion,
        occurredAtClient: new Date(now()).toISOString(),
        captureSequence: sequence,
        clockOffsetMs: clock.clockOffsetMs,
      })
      sequence += 1
      void drain()
    },
    pending: () => items,
    settled: () => idle,
    stop() {
      stopped = true
      if (timer !== null) {
        cancel(timer)
        timer = null
      }
    },
  }
}

/**
 * Maps an HTTP response to what the queue should do with it. A 4xx is the
 * client's fault and will not get better on retry; everything else might.
 */
export function outcomeForStatus(status: number): SendOutcome {
  if (status >= 200 && status < 300) return 'sent'
  if (status >= 400 && status < 500) return 'drop'
  return 'retry'
}
