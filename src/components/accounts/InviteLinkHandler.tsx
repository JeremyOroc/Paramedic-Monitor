'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { createClient } from '@/lib/supabase/client'

export function InviteLinkHandler() {
  const router = useRouter()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true

    async function finishInviteRedirect() {
      const supabase = createClient()
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !sessionData.session) {
        if (active) setFailed(true)
        return
      }

      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user?.invited_at) {
        if (active) setFailed(true)
        return
      }

      if (active) {
        router.replace('/instructor/accept-invite')
        router.refresh()
      }
    }

    void finishInviteRedirect()
    return () => {
      active = false
    }
  }, [router])

  return (
    <main className="grid min-h-screen place-items-center bg-monitor-bg px-5 py-10 text-white">
      <section className="w-full max-w-md border border-neutral-800 bg-sidebar-bg p-6 text-center shadow-2xl sm:p-8">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-cyan-bp">
          Instructor invitation
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">
          {failed ? 'Invitation unavailable' : 'Checking invitation…'}
        </h1>
        {failed ? (
          <>
            <p role="alert" className="mt-4 text-sm leading-6 text-pending-amber">
              This invitation is invalid or has expired. Ask a Product operator for a new invitation.
            </p>
            <Link href="/instructor/login" className="mt-6 inline-block text-sm text-cyan-bp hover:underline">
              Return to sign in
            </Link>
          </>
        ) : (
          <p role="status" className="mt-4 text-sm leading-6 text-neutral-400">
            Please wait while the secure invitation is verified.
          </p>
        )}
      </section>
    </main>
  )
}
