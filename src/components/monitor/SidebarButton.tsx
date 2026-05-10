'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type SidebarButtonProps = {
  icon: ReactNode
  label?: string
  onClick?: () => void
  active?: boolean
  disabled?: boolean
  ariaLabel: string
}

export function SidebarButton({
  icon,
  label,
  onClick,
  active = false,
  disabled = false,
  ariaLabel,
}: SidebarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={active}
      className={cn(
        'flex flex-col items-center justify-center gap-0.5',
        'w-full aspect-square',
        'border border-neutral-800',
        'text-neutral-300 text-[10px] font-mono',
        'transition-colors',
        'hover:bg-neutral-800 hover:text-white',
        'focus:outline-none focus:ring-1 focus:ring-cyan-400',
        active && 'bg-cyan-900/40 border-cyan-400 text-cyan-100',
        disabled && 'opacity-40 cursor-not-allowed hover:bg-transparent hover:text-neutral-300',
      )}
    >
      <span className="text-base leading-none">{icon}</span>
      {label && <span className="leading-none">{label}</span>}
    </button>
  )
}
