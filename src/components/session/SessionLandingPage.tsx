'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { useMonitorStore } from '@/store/monitorStore'

function participantStorageKey(code: string) {
  return `paramedic-monitor.participant.${code.toUpperCase()}`
}

export function SessionLandingPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const createRoom = async () => {
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/session/create', { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Unable to create room')
      // The admin console persists across sessions; a new room must start
      // from a blank drill (no leftover dispatch countdown, vitals, or gate).
      useMonitorStore.getState().reset()
      router.push(data.instructorUrl)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to create room')
    } finally {
      setBusy(false)
    }
  }

  const joinRoom = async () => {
    const normalizedCode = code.trim().toUpperCase()
    const trimmedNickname = nickname.trim()
    setBusy(true)
    setError('')
    try {
      const existing = localStorage.getItem(participantStorageKey(normalizedCode))
      const existingToken =
        existing ? (JSON.parse(existing) as { participantToken?: string }).participantToken : ''
      const response = await fetch('/api/session/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: normalizedCode,
          nickname: trimmedNickname,
          participantToken: existingToken,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Unable to join room')
      localStorage.setItem(
        participantStorageKey(normalizedCode),
        JSON.stringify({
          participantToken: data.participantToken,
          participantId: data.participant.id,
          nickname: data.participant.nickname,
        }),
      )
      router.push(`/session/${normalizedCode}/waiting`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to join room')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-black px-6 py-10 text-white">
      <section className="w-full max-w-md border border-neutral-800 bg-neutral-950 p-6">
        <div className="text-center">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.24em] text-cyan-bp">
            Paramedic Monitor
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white">
            Join Room
          </h1>
        </div>
        <div className="mt-6 grid gap-4">
            <label className="grid gap-1">
              <span className="font-mono text-xs uppercase tracking-wider text-neutral-500">
                Room code
              </span>
              <input
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                maxLength={6}
                autoCapitalize="characters"
                className="border border-neutral-700 bg-black px-3 py-3 font-mono text-lg font-black uppercase tracking-[0.2em] text-white focus:outline-none focus:ring-2 focus:ring-cyan-bp"
              />
            </label>
            <label className="grid gap-1">
              <span className="font-mono text-xs uppercase tracking-wider text-neutral-500">
                Nickname
              </span>
              <input
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                maxLength={32}
                className="border border-neutral-700 bg-black px-3 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-bp"
              />
            </label>
            <button
              type="button"
              onClick={joinRoom}
              disabled={busy || code.trim().length !== 6 || nickname.trim().length === 0}
              className="border border-cyan-bp bg-cyan-bp px-5 py-3 font-mono text-sm font-black uppercase tracking-wider text-black hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Join
            </button>
            {error && (
              <p role="alert" className="text-sm font-semibold text-pending-amber">
                {error}
              </p>
            )}
            <div className="mt-2 grid gap-3 border-t border-neutral-800 pt-4">
              <button
                type="button"
                onClick={createRoom}
                disabled={busy}
                className="border border-neutral-700 bg-black px-5 py-3 font-mono text-xs font-black uppercase tracking-wider text-ecg-green hover:border-ecg-green hover:bg-ecg-green/10 disabled:opacity-50"
              >
                Create Room
              </button>
            </div>
            <Link
              href="/?dev=1"
              className="text-center text-xs font-bold uppercase tracking-wider text-neutral-600 hover:text-neutral-300"
            >
              Open local monitor dev mode
            </Link>
        </div>
      </section>
    </main>
  )
}
