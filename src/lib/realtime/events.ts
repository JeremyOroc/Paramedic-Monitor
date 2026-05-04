import type { VitalsSnapshot } from '@/types/vitals'

export type BroadcastEvent =
  | { type: 'vitals_update';     payload: VitalsSnapshot }
  | { type: 'defib_event';       payload: { kind: 'analyse' | 'charge' | 'shock'; joules: number } }
  | { type: 'cpr_toggle';        payload: { active: boolean } }
  | { type: 'alarm_ack';         payload: { channel: 'hr' | 'bp' | 'all' } }
  | { type: 'scenario_activate'; payload: VitalsSnapshot }

export function channelName(sessionCode: string) {
  return `session:${sessionCode}`
}
