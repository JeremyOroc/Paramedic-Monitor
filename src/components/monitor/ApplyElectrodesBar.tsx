'use client'

type ApplyElectrodesBarProps = {
  message?: string
}

export function ApplyElectrodesBar({ message = 'APPL. ÉLECT.' }: ApplyElectrodesBarProps) {
  return (
    <div className="w-full bg-pending-amber text-black font-mono font-bold text-sm text-center py-1 tracking-wide">
      {message}
    </div>
  )
}
