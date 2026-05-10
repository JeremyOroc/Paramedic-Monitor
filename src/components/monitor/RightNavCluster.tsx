'use client'

import { SidebarButton } from './SidebarButton'

type RightNavClusterProps = {
  onTwelveLead: () => void
  onBack: () => void
}

export function RightNavCluster({ onTwelveLead, onBack }: RightNavClusterProps) {
  return (
    <div className="h-full w-full grid grid-cols-2 grid-rows-4 bg-sidebar-bg">
      <SidebarButton icon="🔔" ariaLabel="Alarm" disabled shape="fill" />
      <SidebarButton
        icon="12L"
        ariaLabel="12-lead view (right)"
        onClick={onTwelveLead}
        shape="fill"
      />
      <SidebarButton icon="⌂" ariaLabel="Home" disabled shape="fill" />
      <SidebarButton icon="↪" ariaLabel="Move right" disabled shape="fill" />
      <SidebarButton icon="●" ariaLabel="Enter" disabled shape="fill" />
      <SidebarButton icon="↩" ariaLabel="Move left" onClick={onBack} shape="fill" />
      <SidebarButton icon="📷" ariaLabel="Snapshot" disabled shape="fill" />
      <SidebarButton icon="⚙" ariaLabel="Settings" disabled shape="fill" />
    </div>
  )
}
