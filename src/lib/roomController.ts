export function roomControllerStorageKey(code: string): string {
  return `paramedic-monitor.controller.${code.trim().toUpperCase()}`
}

export function readRoomControllerToken(code: string): string {
  try {
    const raw = localStorage.getItem(roomControllerStorageKey(code))
    if (!raw) return ''
    const parsed = JSON.parse(raw) as { controllerToken?: unknown }
    return typeof parsed.controllerToken === 'string' ? parsed.controllerToken : ''
  } catch {
    return ''
  }
}

export function writeRoomControllerToken(code: string, controllerToken: string): void {
  localStorage.setItem(
    roomControllerStorageKey(code),
    JSON.stringify({ controllerToken }),
  )
}
