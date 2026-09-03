'use client'

import type { ReactNode } from 'react'

type InstructorLayoutProps = {
  children: ReactNode
}

export function InstructorLayout({ children }: InstructorLayoutProps) {
  return (
    <div className="min-h-screen bg-black text-white font-mono">
      <div className="flex w-full flex-col gap-6 p-6 [@media(max-height:900px)]:gap-2 [@media(max-height:900px)]:py-2">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-ecg-green">Instructor Console</h1>
        </header>
        {children}
      </div>
    </div>
  )
}
