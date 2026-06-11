'use client'

import type { ReactNode } from 'react'

type InstructorLayoutProps = {
  children: ReactNode
}

export function InstructorLayout({ children }: InstructorLayoutProps) {
  return (
    <div className="min-h-screen bg-black text-white font-mono">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-ecg-green">Dev Console</h1>
          <p className="text-sm text-neutral-400">
            Local-only. Edits go through Save → Send before the monitor sees them.
          </p>
        </header>
        {children}
      </div>
    </div>
  )
}
