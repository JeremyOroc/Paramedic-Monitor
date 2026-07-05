// Client-side storage for session credentials. Students keep a participant
// token per room; instructors keep the private host token per room (moved out
// of the URL on first load). All pages share these helpers instead of
// re-deriving keys and re-parsing JSON themselves.

export type ParticipantSession = {
  participantToken?: string
  participantId?: string
  nickname?: string
}

export function participantStorageKey(code: string): string {
  return `paramedic-monitor.participant.${code.toUpperCase()}`
}

export function hostStorageKey(code: string): string {
  return `paramedic-monitor.host.${code.toUpperCase()}`
}

function readJson<T>(key: string): T | null {
  const raw = localStorage.getItem(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function readParticipantSession(code: string): ParticipantSession | null {
  return readJson<ParticipantSession>(participantStorageKey(code))
}

export function writeParticipantSession(
  code: string,
  session: ParticipantSession,
): void {
  localStorage.setItem(participantStorageKey(code), JSON.stringify(session))
}

export function clearParticipantSession(code: string): void {
  localStorage.removeItem(participantStorageKey(code))
}

export function readHostToken(code: string): string {
  return readJson<{ hostToken?: string }>(hostStorageKey(code))?.hostToken ?? ''
}

export function writeHostToken(code: string, hostToken: string): void {
  localStorage.setItem(hostStorageKey(code), JSON.stringify({ hostToken }))
}

/** Poll/event header carrying the participant token; doubles as presence. */
export function participantHeaders(
  participantToken: string,
): Record<string, string> | undefined {
  return participantToken
    ? { 'x-session-participant-token': participantToken }
    : undefined
}
