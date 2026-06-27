'use client'

import { useParams, useSearchParams } from 'next/navigation'

import AdminPage from '@/app/admin/page'

export default function SessionInstructorPage() {
  const params = useParams<{ code: string }>()
  const searchParams = useSearchParams()
  const code = params.code.toUpperCase()
  const hostToken = searchParams.get('host') ?? ''

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
