'use client'

import { SidebarButton } from './SidebarButton'

type LeftSidebarProps = {
  twelveLeadActive: boolean
  etco2Active: boolean
  onTwelveLead: () => void
  onToggleEtco2: () => void
  onBack: () => void
}

export function LeftSidebar({
  twelveLeadActive,
  etco2Active,
  onTwelveLead,
  onToggleEtco2,
  onBack,
}: LeftSidebarProps) {
  return (
    <div className="h-full w-full flex flex-col bg-sidebar-bg">
      <SidebarButton icon="☼" label="LUM" ariaLabel="Brightness" disabled />
      <SidebarButton
        icon="12L"
        label="LEAD"
        ariaLabel="12-lead view"
        active={twelveLeadActive}
        onClick={onTwelveLead}
      />
      <SidebarButton
        icon="CO₂"
        label="ETCO2"
        ariaLabel="Toggle EtCO2"
        active={etco2Active}
        onClick={onToggleEtco2}
      />
      <SidebarButton icon="℞" label="MED" ariaLabel="Medications" disabled />
      <SidebarButton icon="A" label="ANALYSE" ariaLabel="Analyse (sidebar)" disabled />
      <SidebarButton icon="🖨" label="PRINT" ariaLabel="Print" disabled />
      <SidebarButton icon="←" label="BACK" ariaLabel="Back" onClick={onBack} />
    </div>
  )
}
