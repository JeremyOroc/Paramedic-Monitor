const EST_TIME_FORMAT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  hour12: false,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

/**
 * Current wall-clock time in Eastern Time (America/New_York), formatted as
 * HH:MM:SS (24-hour). Pure function — call it at the moment an event occurs to
 * stamp it, the way meds stamp the session timer string.
 */
export function formatEstTime(date: Date = new Date()): string {
  // Intl can emit "24:05:11" at midnight in some runtimes; normalize to 00.
  return EST_TIME_FORMAT.format(date).replace(/^24/, '00')
}
