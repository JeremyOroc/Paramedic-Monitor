'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface AcceptInvitePageProps {
  email: string
  initialUsername: string | null
}

type ApiResult = { error?: string }

export function AcceptInvitePage({ email, initialUsername }: AcceptInvitePageProps) {
  const router = useRouter()
  const [username, setUsername] = useState(initialUsername ?? '')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setMessage('')

    try {
      const response = await fetch('/api/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const result = await response.json() as ApiResult
      if (!response.ok) {
        setMessage(result.error ?? 'Please try again.')
        return
      }
      router.push('/instructor')
      router.refresh()
    } catch {
      setMessage('The account service is temporarily unavailable.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-monitor-bg px-5 py-10 text-white">
      <section className="w-full max-w-md border border-neutral-800 bg-sidebar-bg p-6 shadow-2xl sm:p-8">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-cyan-bp">
          Instructor invitation
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">Finish account setup</h1>
        <p className="mt-3 text-sm leading-6 text-neutral-400">
          Choose the username and password you will use to sign in.
        </p>
        <dl className="mt-6 border border-neutral-800 bg-black p-3">
          <dt className="font-mono text-xs font-bold uppercase tracking-wider text-neutral-500">Invited email</dt>
          <dd className="mt-1 break-all text-sm text-neutral-200">{email}</dd>
        </dl>
        <form className="mt-6 grid gap-5" onSubmit={submit}>
          {initialUsername ? (
            <div className="grid gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-neutral-400">Username</span>
              <span className="border border-neutral-800 bg-black px-3 py-3 text-white">{initialUsername}</span>
            </div>
          ) : (
            <label className="grid gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-neutral-400">Username</span>
              <input
                name="username"
                autoComplete="username"
                required
                minLength={3}
                maxLength={30}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="border border-neutral-700 bg-black px-3 py-3 text-white outline-none focus:border-cyan-bp focus:ring-1 focus:ring-cyan-bp"
              />
            </label>
          )}
          <label className="grid gap-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-neutral-400">Password</span>
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="border border-neutral-700 bg-black px-3 py-3 text-white outline-none focus:border-cyan-bp focus:ring-1 focus:ring-cyan-bp"
            />
            <span className="text-xs text-neutral-500">At least 8 characters.</span>
          </label>
          {message && <p role="alert" className="text-sm font-semibold text-pending-amber">{message}</p>}
          <button
            type="submit"
            disabled={busy}
            className="border border-cyan-bp bg-cyan-bp px-5 py-3 font-mono text-sm font-black uppercase tracking-wider text-black hover:brightness-110 disabled:cursor-wait disabled:opacity-50"
          >
            {busy ? 'Working…' : 'Finish setup'}
          </button>
        </form>
        <nav className="mt-6 border-t border-neutral-800 pt-5 text-center text-sm">
          <Link href="/instructor/login" className="text-neutral-400 hover:text-white">Return to sign in</Link>
        </nav>
      </section>
    </main>
  )
}
