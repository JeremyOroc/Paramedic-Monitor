'use client'

import { FormEvent, useState } from 'react'

import { InstructorLayout } from '@/components/instructor/InstructorLayout'

interface AccountPanelProps {
  email: string
  role: 'instructor' | 'administrator'
  username: string
}

export function AccountPanel({ email, role, username }: AccountPanelProps) {
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)

  const updatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    let response: Response
    let result: { error?: string; message?: string }
    try {
      response = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      result = await response.json() as { error?: string; message?: string }
    } catch {
      setBusy(false)
      setError(true)
      setMessage('The account service is temporarily unavailable.')
      return
    }
    setBusy(false)
    setError(!response.ok)
    setMessage(response.ok ? result.message ?? 'Password updated.' : result.error ?? 'Please try again.')
    if (response.ok) setPassword('')
  }

  return (
    <InstructorLayout active="account" title="Account">
      <section aria-label="Account settings" className="w-full border border-neutral-800 bg-sidebar-bg p-6 sm:p-8">
        <dl className="grid gap-5 border-y border-neutral-800 py-6 sm:grid-cols-3">
          <div><dt className="font-mono text-xs uppercase tracking-wider text-neutral-500">Username</dt><dd className="mt-2 font-semibold">{username}</dd></div>
          <div><dt className="font-mono text-xs uppercase tracking-wider text-neutral-500">Verified email</dt><dd className="mt-2 break-all font-semibold">{email}</dd></div>
          <div><dt className="font-mono text-xs uppercase tracking-wider text-neutral-500">Role</dt><dd className="mt-2 font-semibold capitalize">{role}</dd></div>
        </dl>
        <form onSubmit={updatePassword} className="mt-8 grid max-w-md gap-4">
          <div>
            <h2 className="text-lg font-black">Change password</h2>
            <p className="mt-1 text-sm text-neutral-500">Use at least 8 characters.</p>
          </div>
          <label className="grid gap-2">
            <span className="sr-only">New password</span>
            <input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="New password" className="border border-neutral-700 bg-black px-3 py-3 text-white outline-none focus:border-cyan-bp focus:ring-1 focus:ring-cyan-bp" />
          </label>
          {message && <p role={error ? 'alert' : 'status'} className={error ? 'text-sm text-pending-amber' : 'text-sm text-ecg-green'}>{message}</p>}
          <button type="submit" disabled={busy} className="border border-cyan-bp bg-cyan-bp px-5 py-3 font-mono text-xs font-black uppercase tracking-wider text-black disabled:opacity-50">Update password</button>
        </form>
      </section>
    </InstructorLayout>
  )
}
