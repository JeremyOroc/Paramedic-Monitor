'use client'

import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'

import {
  InstructorNavigation,
  type InstructorArea,
} from '@/components/instructor/InstructorNavigation'

type InstructorLayoutProps = {
  active?: InstructorArea
  children: ReactNode
  title?: string
}

export function InstructorLayout({
  active = 'console',
  children,
  title = 'Instructor Console',
}: InstructorLayoutProps) {
  const router = useRouter()
  const [signOutBusy, setSignOutBusy] = useState(false)
  const [signOutError, setSignOutError] = useState('')

  const signOut = async () => {
    setSignOutBusy(true)
    setSignOutError('')
    try {
      const response = await fetch('/api/auth/signout', { method: 'POST' })
      if (!response.ok) throw new Error('Sign out failed')
      router.push('/instructor/login')
      router.refresh()
    } catch {
      setSignOutBusy(false)
      setSignOutError('Unable to sign out. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-black text-white font-mono">
      <div className="flex w-full flex-col gap-6 p-6 [@media(max-height:900px)]:gap-2 [@media(max-height:900px)]:py-2">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-3">
          <h1 className="text-2xl font-bold text-ecg-green">{title}</h1>
          <div className="w-full sm:w-fit">
            <InstructorNavigation active={active} className="grid grid-cols-3" />
            <div className="mt-2 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => void signOut()}
                disabled={signOutBusy}
                className="col-start-3 min-h-11 border border-neutral-700 px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider transition-colors hover:border-alarm-red hover:text-alarm-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-alarm-red focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:opacity-50"
              >
                Sign Out
              </button>
            </div>
            {signOutError ? (
              <p role="alert" className="mt-2 text-right text-xs text-pending-amber">
                {signOutError}
              </p>
            ) : null}
          </div>
        </header>
        {children}
      </div>
    </div>
  )
}
