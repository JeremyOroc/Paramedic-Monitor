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
  shape?: 'square' | 'fill'
  interactive?: boolean
}

export function SidebarButton({
  icon,
  label,
  onClick,
  active = false,
  disabled = false,
  ariaLabel,
  shape = 'square',
  interactive = true,
}: SidebarButtonProps) {
  const className = cn(
    'flex flex-col items-center justify-center gap-0.5',
    shape === 'square' ? 'w-full h-[clamp(43px,6.2vh,68px)]' : 'w-full h-full',
    'border border-ecg-green',
    'text-neutral-300 text-[10px] font-mono',
    interactive && 'transition-colors hover:bg-neutral-800 hover:text-white focus:outline-none focus:ring-1 focus:ring-cyan-400',
    active && 'bg-cyan-900/40 border-cyan-400 text-cyan-100',
    disabled && 'opacity-40 cursor-not-allowed hover:bg-transparent hover:text-neutral-300',
    !interactive && 'select-none',
  )

  const content = (
    <>
      <span className="text-base leading-none">{icon}</span>
      {label && <span className="leading-none text-center w-full">{label}</span>}
    </>
  )

  if (!interactive) {
    return (
      <div aria-label={ariaLabel} aria-pressed={active} className={className}>
        {content}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={active}
      className={className}
    >
      {content}
    </button>
  )
}
