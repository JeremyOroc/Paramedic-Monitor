'use client'

import { cn } from '@/lib/utils'

type ProgressBarProps = {
  /** 0..1 */
  progress: number
  className?: string
  trackClassName?: string
  fillClassName?: string
}

export function ProgressBar({
  progress,
  className,
  trackClassName,
  fillClassName,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, progress))
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={1}
      aria-valuenow={clamped}
      className={cn('h-1 w-full overflow-hidden bg-neutral-800', trackClassName, className)}
    >
      <div
        className={cn('h-full bg-ecg-green transition-[width] duration-75', fillClassName)}
        style={{ width: `${clamped * 100}%` }}
      />
    </div>
  )
}
