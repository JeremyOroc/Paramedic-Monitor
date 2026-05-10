'use client'

import { SidebarButton } from './SidebarButton'

type RightNavClusterProps = {
  onBack: () => void
}

export function RightNavCluster({ onBack }: RightNavClusterProps) {
  return (
    <div className="h-full w-full flex flex-col bg-sidebar-bg">
      <SidebarButton icon="🔔" ariaLabel="Alarm" disabled />
      <SidebarButton icon="⌂" ariaLabel="Home" disabled />
      <SidebarButton icon="↩" ariaLabel="Back" onClick={onBack} />
      <SidebarButton icon="●" ariaLabel="Enter" disabled />
      <SidebarButton icon="↪" ariaLabel="Forward" disabled />
      <SidebarButton icon="📷" ariaLabel="Snapshot" disabled />
    </div>
  )
}
