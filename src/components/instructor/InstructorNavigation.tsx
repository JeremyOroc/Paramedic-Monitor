import Link from 'next/link'

import { cn } from '@/lib/utils'

export type InstructorArea = 'console' | 'reports' | 'account'

interface InstructorNavigationProps {
  active: InstructorArea
  className?: string
}

const AREAS: ReadonlyArray<{ id: InstructorArea; href: string; label: string }> = [
  { id: 'console', href: '/instructor', label: 'Console' },
  { id: 'reports', href: '/instructor/reports', label: 'Reports' },
  { id: 'account', href: '/instructor/account', label: 'Account' },
]

export function InstructorNavigation({ active, className }: InstructorNavigationProps) {
  return (
    <nav aria-label="Instructor" className={cn('flex flex-wrap gap-2', className)}>
      {AREAS.map((area) => {
        const selected = area.id === active
        return (
          <Link
            key={area.id}
            href={area.href}
            aria-current={selected ? 'page' : undefined}
            className={cn(
              'inline-flex min-h-11 items-center border px-4 py-2 font-mono text-xs font-black uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-bp focus-visible:ring-offset-2 focus-visible:ring-offset-black',
              selected
                ? 'border-cyan-bp bg-cyan-bp text-black'
                : 'border-neutral-700 text-neutral-300 hover:border-cyan-bp hover:text-cyan-bp',
            )}
          >
            {area.label}
          </Link>
        )
      })}
    </nav>
  )
}
