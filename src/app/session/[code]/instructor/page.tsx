'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'

import AdminPage from '@/app/admin/page'
import { readHostToken, writeHostToken } from '@/lib/sessionStorage'

export default function SessionInstructorPage() {
  const params = useParams<{ code: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const code = params.code.toUpperCase()
  const [hostToken, setHostToken] = useState('')
  const [resolved, setResolved] = useState(false)

  // The private link carries the host token once; move it into localStorage
  // and strip it from the address bar so a projected screen, browser history,
  // or shared screenshot never exposes room control.
  useEffect(() => {
    const fromUrl = searchParams.get('host') ?? ''
    if (fromUrl) {
      writeHostToken(code, fromUrl)
      setHostToken(fromUrl)
      setResolved(true)
      router.replace(`/session/${code}/instructor`)
      return
    }
    setHostToken(readHostToken(code))
    setResolved(true)
  }, [code, router, searchParams])

  if (!resolved) {
    return <main className="min-h-screen bg-black" />
  }

  if (!hostToken) {
    return (
      <main className="grid min-h-screen place-items-center bg-black px-6 text-white">
        <section className="max-w-md border border-alarm-red/70 bg-alarm-red/10 p-5">
          <h1 className="font-mono text-lg font-black uppercase tracking-wider text-alarm-red">
            Instructor access required
          </h1>
          <p className="mt-3 text-sm text-neutral-300">
            Use the private instructor link created with this room.
          </p>
        </section>
      </main>
    )
  }

  return <AdminPage session={{ code, hostToken }} />
}
