'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

import AdminPage from '@/components/instructor/AdminPage'
import { ConfirmationDialog } from '@/components/instructor/ConfirmationDialog'
import {
  readRoomControllerToken,
  writeRoomControllerToken,
} from '@/lib/roomController'

type RoomAccess = {
  session: {
    code: string
    status: 'waiting' | 'active' | 'ended'
  }
  canControl: boolean
}

export function SessionInstructorClient({ code }: { code: string }) {
  const [controllerToken, setControllerToken] = useState('')
  const [access, setAccess] = useState<RoomAccess | null>(null)
  const [resolved, setResolved] = useState(false)
  const [error, setError] = useState('')
  const [confirmTakeover, setConfirmTakeover] = useState(false)
  const [takingControl, setTakingControl] = useState(false)

  const refreshAccess = useCallback(async (token: string) => {
    try {
      const response = await fetch(`/api/session/${code}/control`, {
        headers: token ? { 'x-room-controller-token': token } : undefined,
        cache: 'no-store',
      })
      const result = await response.json() as RoomAccess & { error?: string }
      if (!response.ok) throw new Error(result.error ?? 'Unable to open this room')
      setAccess(result)
      setError('')
    } catch (caught) {
      setAccess(null)
      setError(caught instanceof Error ? caught.message : 'Unable to open this room')
    } finally {
      setResolved(true)
    }
  }, [code])

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const stored = readRoomControllerToken(code)
    setControllerToken(stored)
    void refreshAccess(stored)
  }, [code, refreshAccess])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!resolved || error) return
    const timer = window.setInterval(() => void refreshAccess(controllerToken), 2500)
    return () => window.clearInterval(timer)
  }, [controllerToken, error, refreshAccess, resolved])

  const takeControl = async () => {
    setTakingControl(true)
    try {
      const response = await fetch(`/api/session/${code}/control`, { method: 'POST' })
      const result = await response.json() as { controllerToken?: string; error?: string }
      if (!response.ok || !result.controllerToken) {
        throw new Error(result.error ?? 'Unable to take control')
      }
      writeRoomControllerToken(code, result.controllerToken)
      setControllerToken(result.controllerToken)
      setAccess((current) => current ? { ...current, canControl: true } : current)
      setError('')
      setConfirmTakeover(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to take control')
    } finally {
      setTakingControl(false)
    }
  }

  if (!resolved) return <main className="min-h-screen bg-black" />

  if (!access) {
    return (
      <main className="grid min-h-screen place-items-center bg-black px-6 text-white">
        <section className="max-w-md border border-alarm-red/70 bg-alarm-red/10 p-5">
          <h1 className="font-mono text-lg font-black uppercase tracking-wider text-alarm-red">
            Room unavailable
          </h1>
          <p role="alert" className="mt-3 text-sm text-neutral-300">{error}</p>
          <Link href="/admin" className="mt-5 inline-block font-mono text-xs font-bold uppercase text-cyan-bp">
            Return to console
          </Link>
        </section>
      </main>
    )
  }

  return (
    <>
      <AdminPage
        session={{
          code,
          controllerToken,
          canControl: access.canControl,
          onTakeControl: () => setConfirmTakeover(true),
        }}
      />
      <ConfirmationDialog
        open={confirmTakeover}
        title="Take control of this Room?"
        description="This device will become the Room controller. Any other device currently controlling the Room will become read-only immediately."
        confirmLabel={takingControl ? 'Taking control…' : 'Take control'}
        onConfirm={() => void takeControl()}
        onCancel={() => setConfirmTakeover(false)}
      />
    </>
  )
}
