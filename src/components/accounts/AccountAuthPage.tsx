'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type AuthMode = 'forgot' | 'login' | 'reset'

interface AccountAuthPageProps {
  mode: AuthMode
  verificationError?: boolean
}

const COPY: Record<AuthMode, { eyebrow: string; title: string; action: string }> = {
  login: { eyebrow: 'Instructor access', title: 'Sign in', action: 'Sign in' },
  forgot: { eyebrow: 'Account recovery', title: 'Reset password', action: 'Send recovery link' },
  reset: { eyebrow: 'Account recovery', title: 'Choose a new password', action: 'Update password' },
}

type ApiResult = { error?: string; message?: string }

export function AccountAuthPage({ mode, verificationError = false }: AccountAuthPageProps) {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState(
    verificationError ? 'That authentication link is invalid or has expired.' : '',
  )
  const [isError, setIsError] = useState(verificationError)
  const [busy, setBusy] = useState(false)
  const copy = COPY[mode]

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    setIsError(false)
    let response: Response
    let result: ApiResult
    try {
      const endpoint = mode === 'forgot' ? 'recover' : mode === 'reset' ? 'password' : 'login'
      response = await fetch(`/api/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      })
      result = await response.json() as ApiResult
    } catch {
      setBusy(false)
      setIsError(true)
      setMessage('The account service is temporarily unavailable.')
      return
    }
    setBusy(false)

    if (!response.ok) {
      setIsError(true)
      setMessage(result.error ?? 'Please try again.')
      return
    }
    if (mode === 'login') {
      router.push('/instructor')
      router.refresh()
      return
    }
    if (mode === 'reset') {
      setMessage(result.message ?? 'Password updated.')
      setPassword('')
      router.push('/instructor/account')
      router.refresh()
      return
    }
    setMessage(result.message ?? 'Request received.')
  }

  return (
    <main className="grid min-h-screen place-items-center bg-monitor-bg px-5 py-10 text-white">
      <section className="w-full max-w-md border border-neutral-800 bg-sidebar-bg p-6 shadow-2xl sm:p-8">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-cyan-bp">{copy.eyebrow}</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">{copy.title}</h1>
        <form className="mt-7 grid gap-5" onSubmit={submit}>
          {mode === 'login' && (
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
          {mode === 'forgot' && (
            <label className="grid gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-neutral-400">Email</span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="border border-neutral-700 bg-black px-3 py-3 text-white outline-none focus:border-cyan-bp focus:ring-1 focus:ring-cyan-bp"
              />
            </label>
          )}
          {(mode === 'login' || mode === 'reset') && (
            <label className="grid gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-neutral-400">
                {mode === 'reset' ? 'New password' : 'Password'}
              </span>
              <input
                name="password"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="border border-neutral-700 bg-black px-3 py-3 text-white outline-none focus:border-cyan-bp focus:ring-1 focus:ring-cyan-bp"
              />
              {mode !== 'login' && <span className="text-xs text-neutral-500">At least 8 characters.</span>}
            </label>
          )}
          {message && (
            <p role={isError ? 'alert' : 'status'} className={isError ? 'text-sm font-semibold text-pending-amber' : 'text-sm font-semibold text-ecg-green'}>
              {message}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="border border-cyan-bp bg-cyan-bp px-5 py-3 font-mono text-sm font-black uppercase tracking-wider text-black hover:brightness-110 disabled:cursor-wait disabled:opacity-50"
          >
            {busy ? 'Working…' : copy.action}
          </button>
        </form>
        <nav className="mt-6 grid gap-3 border-t border-neutral-800 pt-5 text-center text-sm">
          {mode !== 'login' && <Link href="/instructor/login" className="text-cyan-bp hover:underline">Return to sign in</Link>}
          {mode === 'login' && <Link href="/instructor/forgot-password" className="text-neutral-400 hover:text-white">Forgot password?</Link>}
          <Link href="/" className="text-neutral-500 hover:text-white">Return to room access</Link>
        </nav>
      </section>
    </main>
  )
}
