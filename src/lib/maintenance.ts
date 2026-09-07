const ENABLED_VALUE = 'true'

export function isMaintenanceMode(value = process.env.MAINTENANCE_MODE): boolean {
  return value?.trim().toLowerCase() === ENABLED_VALUE
}

export function isMaintenanceBypassPath(pathname: string): boolean {
  return pathname === '/maintenance' || pathname === '/api/health'
}

export function shouldRefreshAccountSession(pathname: string): boolean {
  return (
    pathname === '/auth' ||
    pathname.startsWith('/auth/') ||
    pathname === '/instructor' ||
    pathname.startsWith('/instructor/')
  )
}
