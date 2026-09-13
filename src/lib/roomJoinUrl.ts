const PUBLIC_APP_URL = 'https://paramedic-monitor.vercel.app'

export function createRoomJoinUrl(code: string): string {
  const url = new URL(PUBLIC_APP_URL)
  url.searchParams.set('code', code.trim().toUpperCase())
  return url.toString()
}
