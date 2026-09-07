import { describe, expect, it } from 'vitest'

import {
  isMaintenanceBypassPath,
  isMaintenanceMode,
  shouldRefreshAccountSession,
} from '@/lib/maintenance'

describe('maintenance boundary', () => {
  it('is safe-off unless the server value is explicitly true', () => {
    expect(isMaintenanceMode()).toBe(false)
    expect(isMaintenanceMode('false')).toBe(false)
    expect(isMaintenanceMode('1')).toBe(false)
    expect(isMaintenanceMode(' TRUE ')).toBe(true)
  })

  it('keeps only maintenance and health available during maintenance', () => {
    expect(isMaintenanceBypassPath('/maintenance')).toBe(true)
    expect(isMaintenanceBypassPath('/api/health')).toBe(true)
    expect(isMaintenanceBypassPath('/')).toBe(false)
    expect(isMaintenanceBypassPath('/api/session/create')).toBe(false)
  })

  it('preserves the existing Auth and Instructor session-refresh boundary', () => {
    expect(shouldRefreshAccountSession('/auth/invite')).toBe(true)
    expect(shouldRefreshAccountSession('/instructor/reports')).toBe(true)
    expect(shouldRefreshAccountSession('/session/ABC123/monitor')).toBe(false)
    expect(shouldRefreshAccountSession('/api/health')).toBe(false)
  })
})
