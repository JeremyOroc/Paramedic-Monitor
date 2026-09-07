import { beforeEach, describe, expect, it } from 'vitest'

import {
  readRoomControllerToken,
  roomControllerStorageKey,
  writeRoomControllerToken,
} from '../roomController'

describe('Room controller browser storage', () => {
  beforeEach(() => localStorage.clear())

  it('normalizes the Room code in its storage key', () => {
    expect(roomControllerStorageKey(' abc234 ')).toBe('paramedic-monitor.controller.ABC234')
  })

  it('round-trips the controller token without putting it in a URL', () => {
    writeRoomControllerToken('ABC234', 'controller_secret')
    expect(readRoomControllerToken('abc234')).toBe('controller_secret')
  })

  it('returns empty for corrupt or wrongly shaped storage', () => {
    localStorage.setItem(roomControllerStorageKey('ABC234'), '{')
    expect(readRoomControllerToken('ABC234')).toBe('')
    localStorage.setItem(roomControllerStorageKey('ABC234'), JSON.stringify({ controllerToken: 1 }))
    expect(readRoomControllerToken('ABC234')).toBe('')
  })
})
