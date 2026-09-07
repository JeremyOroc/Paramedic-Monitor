'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { ConfirmationDialog } from '@/components/instructor/ConfirmationDialog'
import { writeRoomControllerToken } from '@/lib/roomController'
import { useMonitorStore } from '@/store/monitorStore'

type ExistingRoom = {
  code: string
  status: 'waiting' | 'active'
}

type CreateRoomResponse = {
  controllerToken?: string
  instructorUrl?: string
  session?: { code: string }
  existingRoom?: ExistingRoom
  error?: string
}

export function RoomLauncher() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [existingRoom, setExistingRoom] = useState<ExistingRoom | null>(null)
  const [confirmEnd, setConfirmEnd] = useState(false)

  const enterRoom = (result: CreateRoomResponse) => {
    if (!result.controllerToken || !result.session?.code || !result.instructorUrl) {
      throw new Error('The Room response was incomplete')
    }
    writeRoomControllerToken(result.session.code, result.controllerToken)
    useMonitorStore.getState().reset()
    router.push(result.instructorUrl)
  }

  const createRoom = async () => {
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/session/create', { method: 'POST' })
      const result = await response.json() as CreateRoomResponse
      if (response.status === 409 && result.existingRoom) {
        setExistingRoom(result.existingRoom)
        return
      }
      if (!response.ok) throw new Error(result.error ?? 'Unable to create Room')
      enterRoom(result)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to create Room')
    } finally {
      setBusy(false)
    }
  }

  const claimExisting = async () => {
    if (!existingRoom) throw new Error('No active Room was found')
    const response = await fetch(`/api/session/${existingRoom.code}/control`, { method: 'POST' })
    const result = await response.json() as CreateRoomResponse
    if (!response.ok || !result.controllerToken) {
      throw new Error(result.error ?? 'Unable to reopen Room')
    }
    writeRoomControllerToken(existingRoom.code, result.controllerToken)
    return result.controllerToken
  }

  const reopenRoom = async () => {
    if (!existingRoom) return
    setBusy(true)
    setError('')
    try {
      await claimExisting()
      router.push(`/session/${existingRoom.code}/instructor`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to reopen Room')
    } finally {
      setBusy(false)
    }
  }

  const endAndCreate = async () => {
    if (!existingRoom) return
    setBusy(true)
    setError('')
    try {
      const controllerToken = await claimExisting()
      const endResponse = await fetch(`/api/session/${existingRoom.code}/end`, {
        method: 'POST',
        headers: { 'x-room-controller-token': controllerToken },
      })
      const ended = await endResponse.json() as { error?: string }
      if (!endResponse.ok) throw new Error(ended.error ?? 'Unable to end existing Room')

      const createResponse = await fetch('/api/session/create', { method: 'POST' })
      const created = await createResponse.json() as CreateRoomResponse
      if (!createResponse.ok) throw new Error(created.error ?? 'Unable to create Room')
      setConfirmEnd(false)
      setExistingRoom(null)
      enterRoom(created)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to replace Room')
      setConfirmEnd(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <section aria-label="Room launcher" className="border border-cyan-bp/60 bg-cyan-bp/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-mono text-sm font-black uppercase tracking-wider text-cyan-bp">
              Room
            </h2>
            <p className="mt-1 text-sm text-neutral-400">
              Create a trainee Room owned by your Account.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void createRoom()}
            disabled={busy}
            className="border border-cyan-bp bg-cyan-bp px-4 py-2 font-mono text-xs font-black uppercase tracking-wider text-black disabled:opacity-50"
          >
            {busy ? 'Working…' : 'Create Room'}
          </button>
        </div>
        {existingRoom ? (
          <div className="mt-4 border border-pending-amber/70 bg-pending-amber/10 p-3">
            <p className="text-sm text-white">
              You already own Room <strong className="font-mono text-pending-amber">{existingRoom.code}</strong>.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => void reopenRoom()} disabled={busy} className="border border-cyan-bp px-3 py-2 font-mono text-xs font-bold uppercase text-cyan-bp disabled:opacity-50">
                Reopen Room
              </button>
              <button type="button" onClick={() => setConfirmEnd(true)} disabled={busy} className="border border-alarm-red px-3 py-2 font-mono text-xs font-bold uppercase text-alarm-red disabled:opacity-50">
                End and create new
              </button>
            </div>
          </div>
        ) : null}
        {error ? <p role="alert" className="mt-3 text-sm font-semibold text-pending-amber">{error}</p> : null}
      </section>
      <ConfirmationDialog
        open={confirmEnd}
        title="End the existing Room?"
        description={`Room ${existingRoom?.code ?? ''} will end immediately and trainees will be disconnected. A new Room will then be created.`}
        confirmLabel="End and create new"
        onConfirm={() => void endAndCreate()}
        onCancel={() => setConfirmEnd(false)}
      />
    </>
  )
}
