import { connection } from 'next/server'
import { redirect } from 'next/navigation'

import { isMaintenanceMode } from '@/lib/maintenance'

export default async function MaintenancePage() {
  await connection()
  if (!isMaintenanceMode()) redirect('/')

  return (
    <main className="grid min-h-screen place-items-center bg-monitor-bg px-5 py-10 text-white">
      <section
        aria-labelledby="maintenance-title"
        className="w-full max-w-xl border border-neutral-800 bg-sidebar-bg p-6 text-center sm:p-10"
      >
        <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-pending-amber">
          Scheduled maintenance
        </p>
        <h1 id="maintenance-title" className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
          Paramedic Monitor is temporarily unavailable
        </h1>
        <p className="mt-4 text-base leading-7 text-neutral-300">
          Product operators are completing a protected maintenance procedure. Do not begin a new
          simulation until service has been reopened.
        </p>
        <p role="status" className="mt-6 font-mono text-xs uppercase tracking-wider text-neutral-400">
          Existing data is being preserved. Please try again later.
        </p>
      </section>
    </main>
  )
}
