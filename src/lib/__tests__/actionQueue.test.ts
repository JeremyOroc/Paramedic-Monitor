import { describe, expect, it, vi } from 'vitest'

import {
  createActionQueue,
  outcomeForStatus,
  type QueuedAction,
  type SendOutcome,
} from '../actionQueue'

const CLOCK = { stateVersion: 4, clockOffsetMs: 120 }

/**
 * Timers are injected so a backoff of seconds runs in microseconds: each
 * scheduled wait is released on the next tick rather than after `ms`.
 */
function immediateTimers() {
  return {
    setTimeout: (fn: () => void) => {
      queueMicrotask(fn)
      return 1
    },
    clearTimeout: () => {},
  }
}

function scriptedSender(outcomes: SendOutcome[]) {
  const sent: QueuedAction[] = []
  const send = vi.fn(async (action: QueuedAction) => {
    sent.push(action)
    return outcomes.shift() ?? 'sent'
  })
  return { send, sent }
}

const press = (kind: string) => ({ kind, label: kind })

describe('createActionQueue', () => {
  it('stamps time, sequence, and state version at the press, not at the send', async () => {
    let now = 1_000_000
    const { send, sent } = scriptedSender(['retry', 'sent'])
    const queue = createActionQueue({ send, now: () => now, ...immediateTimers() })

    queue.enqueue(press('shock'), CLOCK)
    now += 8_000 // the outage; the send that succeeds happens 8s later
    await queue.settled()

    expect(sent).toHaveLength(2)
    expect(sent[1].occurredAtClient).toBe(new Date(1_000_000).toISOString())
    expect(sent[1].stateVersion).toBe(4)
    expect(sent[1].clockOffsetMs).toBe(120)
    expect(sent[1].captureSequence).toBe(0)
  })

  it('drains in press order and never reorders behind a retry', async () => {
    const { send, sent } = scriptedSender(['retry', 'retry', 'sent', 'sent', 'sent'])
    const queue = createActionQueue({ send, ...immediateTimers() })

    queue.enqueue(press('charge'), CLOCK)
    queue.enqueue(press('shock'), CLOCK)
    queue.enqueue(press('medication'), CLOCK)
    await queue.settled()

    expect(sent.map((a) => a.kind)).toEqual(['charge', 'charge', 'charge', 'shock', 'medication'])
    expect(sent.map((a) => a.captureSequence)).toEqual([0, 0, 0, 1, 2])
    expect(queue.pending()).toHaveLength(0)
  })

  it('treats a thrown send as a retry, never as a loss', async () => {
    let calls = 0
    const send = vi.fn(async () => {
      calls += 1
      if (calls < 3) throw new Error('offline')
      return 'sent' as const
    })
    const queue = createActionQueue({ send, ...immediateTimers() })

    queue.enqueue(press('analyze'), CLOCK)
    await queue.settled()

    expect(send).toHaveBeenCalledTimes(3)
    expect(queue.pending()).toHaveLength(0)
  })

  it('backs off exponentially to the cap and resets after a success', async () => {
    const waits: number[] = []
    const { send } = scriptedSender(['retry', 'retry', 'retry', 'retry', 'sent', 'retry', 'sent'])
    const queue = createActionQueue({
      send,
      baseDelayMs: 100,
      maxDelayMs: 400,
      setTimeout: (fn, ms) => {
        waits.push(ms)
        queueMicrotask(fn)
        return 1
      },
      clearTimeout: () => {},
    })

    queue.enqueue(press('a'), CLOCK)
    queue.enqueue(press('b'), CLOCK)
    await queue.settled()

    // 100, 200, 400, 400 (capped) for `a`; then reset to 100 for `b`.
    expect(waits).toEqual([100, 200, 400, 400, 100])
  })

  it('drops a permanently rejected action and keeps going', async () => {
    const dropped: QueuedAction[] = []
    const { send, sent } = scriptedSender(['drop', 'sent'])
    const queue = createActionQueue({ send, onDrop: (a) => dropped.push(a), ...immediateTimers() })

    queue.enqueue(press('bad'), CLOCK)
    queue.enqueue(press('good'), CLOCK)
    await queue.settled()

    expect(dropped.map((a) => a.kind)).toEqual(['bad'])
    expect(sent.map((a) => a.kind)).toEqual(['bad', 'good'])
    expect(queue.pending()).toHaveLength(0)
  })

  it('stops cleanly mid-backoff and ignores presses after stop', async () => {
    const clear = vi.fn()
    const { send } = scriptedSender(['retry'])
    const queue = createActionQueue({
      send,
      setTimeout: () => 'handle',   // never fires: we stop while waiting
      clearTimeout: clear,
    })

    queue.enqueue(press('x'), CLOCK)
    await Promise.resolve()
    await Promise.resolve()
    queue.stop()
    queue.enqueue(press('y'), CLOCK)

    expect(clear).toHaveBeenCalledWith('handle')
    expect(queue.pending().map((a) => a.kind)).toEqual(['x'])
  })
})

describe('outcomeForStatus', () => {
  it('sends on 2xx, drops on 4xx, retries on everything else', () => {
    expect(outcomeForStatus(200)).toBe('sent')
    expect(outcomeForStatus(201)).toBe('sent')
    expect(outcomeForStatus(400)).toBe('drop')
    expect(outcomeForStatus(401)).toBe('drop')
    expect(outcomeForStatus(500)).toBe('retry')
    expect(outcomeForStatus(503)).toBe('retry')
    expect(outcomeForStatus(0)).toBe('retry')
  })
})
