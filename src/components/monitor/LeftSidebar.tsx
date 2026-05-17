'use client'

import { SidebarButton } from './SidebarButton'

type LeftSidebarProps = {
  twelveLeadActive: boolean
  etco2Active: boolean
  onTwelveLead?: () => void
  onToggleEtco2?: () => void
  onBack?: () => void
}

export function LeftSidebar({
  twelveLeadActive,
  etco2Active,
}: LeftSidebarProps) {
  return (
    <div className="h-full w-full flex flex-col justify-between bg-sidebar-bg">
      <SidebarButton icon="☼" label="LUM" ariaLabel="Brightness" interactive={false} />
      <SidebarButton
        icon="12L"
        label="LEAD"
        ariaLabel="12-lead view"
        active={twelveLeadActive}
        interactive={false}
      />
      <SidebarButton
        icon="CO₂"
        label="ETCO2"
        ariaLabel="Toggle EtCO2"
        active={etco2Active}
        interactive={false}
      />
      <SidebarButton icon="℞" label="MED" ariaLabel="Medications" interactive={false} />
      <SidebarButton icon="A" label="ANALYSE" ariaLabel="Analyse (sidebar)" interactive={false} />
      <SidebarButton icon="🖨" label="PRINT" ariaLabel="Print" interactive={false} />
      <SidebarButton icon="←" label="BACK" ariaLabel="Back" interactive={false} />
    </div>
  )
}
