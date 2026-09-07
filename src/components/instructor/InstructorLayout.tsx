'use client'

import type { ReactNode } from 'react'

import { InstructorNavigation } from '@/components/instructor/InstructorNavigation'

type InstructorLayoutProps = {
  children: ReactNode
}

export function InstructorLayout({ children }: InstructorLayoutProps) {
  return (
    <div className="min-h-screen bg-black text-white font-mono">
      <div className="flex w-full flex-col gap-6 p-6 [@media(max-height:900px)]:gap-2 [@media(max-height:900px)]:py-2">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-3">
          <h1 className="text-2xl font-bold text-ecg-green">Instructor Console</h1>
          <InstructorNavigation active="console" />
        </header>
        {children}
      </div>
    </div>
  )
}
