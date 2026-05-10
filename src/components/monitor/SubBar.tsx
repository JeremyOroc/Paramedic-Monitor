'use client'

type SubBarProps = {
  message?: string
}

export function SubBar({ message = 'Étalonnage CO2 recommandé' }: SubBarProps) {
  return (
    <div className="h-full w-full flex items-center px-3 font-mono text-xs border-b border-neutral-800 bg-bottom-bar text-purple-etco2">
      {message}
    </div>
  )
}
