import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type MonitorModalActionProps = {
  children: ReactNode
  selected: boolean
  disabled?: boolean
  ariaLabel?: string
  className?: string
}

export function MonitorModalAction({
  children,
  selected,
  disabled = false,
  ariaLabel,
  className,
}: MonitorModalActionProps) {
  return (
    <span
      aria-label={ariaLabel}
      aria-current={selected ? 'true' : undefined}
      aria-disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center border-2 border-white bg-black px-4 py-2 font-bold text-white',
        selected && 'bg-[var(--color-selection-blue)]',
        disabled && 'opacity-30',
        className,
      )}
    >
      {children}
    </span>
  )
}
