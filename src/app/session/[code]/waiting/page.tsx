'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import { RoomCodeCopy } from '@/components/session/RoomCodeCopy'
import {
  clearParticipantSession,
  participantHeaders,
  readParticipantSession,
} from '@/lib/sessionStorage'

export default function WaitingRoomPage() {
  const params = useParams<{ code: string }>()
  const router = useRouter()
  const code = params.code.toUpperCase()
  const [nickname, setNickname] = useState('')
  const [participantToken, setParticipantToken] = useState('')
  const [status, setStatus] = useState<'waiting' | 'active' | 'ended' | 'loading'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    const stored = readParticipantSession(code)
    if (!stored) {
      router.replace('/')
      return
    }
    setNickname(stored.nickname ?? '')
    setParticipantToken(stored.participantToken ?? '')
  }, [code, router])

  useEffect(() => {
    let cancelled = false
    async function pollStatus() {
      try {
        // The participant token turns the poll into a presence heartbeat for
        // the instructor roster.
        const response = await fetch(`/api/session/${code}/status`, {
          headers: participantHeaders(participantToken),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error ?? 'Unable to load room')
        if (cancelled) return
        setStatus(data.session.status)
        if (data.session.status === 'active') {
          router.replace(`/session/${code}/monitor`)
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : 'Unable to load room')
        }
      }
    }

    void pollStatus()
    const interval = window.setInterval(() => void pollStatus(), 2000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [code, participantToken, router])

  return (
    <main className="grid min-h-screen place-items-center bg-black px-6 text-white">
      <section className="w-full max-w-lg border border-neutral-800 bg-neutral-950 p-6 text-center">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.24em] text-cyan-bp">
          Room code
        </p>
        <RoomCodeCopy code={code} className="mt-3" />
        <h1 className="mt-4 text-3xl font-black">
          {status === 'ended' ? 'Room ended' : 'Waiting for instructor'}
        </h1>
        <p className="mt-3 text-sm text-neutral-400">
          {status === 'ended'
            ? 'This session is no longer accepting students.'
            : nickname
              ? `${nickname}, you are in the room.`
              : 'You are in the room.'}
        </p>
        <div className="mt-6 border border-neutral-800 bg-black px-4 py-3 font-mono text-sm uppercase tracking-wider text-neutral-400">
          Status: {status}
        </div>
        {status === 'ended' && (
          <button
            type="button"
            onClick={() => {
              clearParticipantSession(code)
              router.replace('/')
            }}
            className="mt-5 border border-cyan-bp px-4 py-2 font-mono text-xs font-black uppercase tracking-wider text-cyan-bp hover:bg-cyan-bp hover:text-black"
          >
            Back to Lobby
          </button>
        )}
        {error && <p className="mt-4 text-sm font-semibold text-pending-amber">{error}</p>}
      </section>
    </main>
  )
}
