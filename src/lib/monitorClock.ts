export type MonitorClock = {
  date: string
  time: string
}

export const EMPTY_MONITOR_CLOCK: MonitorClock = {
  date: '0000-00-00',
  time: '--:--:--',
}

export function formatMonitorClock(now: Date | null, timeZone: string): MonitorClock {
  if (!now) return EMPTY_MONITOR_CLOCK

  return {
    date: now.toLocaleDateString('sv-SE', { timeZone }),
    time: now.toLocaleTimeString('en-CA', {
      timeZone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
  }
}
