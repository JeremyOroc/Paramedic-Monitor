'use client'

import { SidebarButton } from './SidebarButton'
import {
  MED_ABBREVS,
  MED_PAGES,
  NEXT_MED_PAGE,
  type MedicationPage,
} from '@/lib/monitor/medications'

type LeftSidebarProps = {
  twelveLeadActive: boolean
  etco2Active: boolean
  medicationMode?: boolean
  medicationPage?: MedicationPage
  activeMed?: string | null
  printActive?: boolean
}

export function LeftSidebar({
  twelveLeadActive,
  etco2Active,
  medicationMode = false,
  medicationPage = 1,
  activeMed = null,
  printActive = false,
}: LeftSidebarProps) {
  if (medicationMode) {
    const meds = MED_PAGES[medicationPage]
    const nextPage = NEXT_MED_PAGE[medicationPage]

    return (
      <div className="h-full w-full flex flex-col justify-between bg-sidebar-bg pb-[54px]">
        {meds.map((med) => (
          <SidebarButton
            key={med}
            icon={<span className="text-lg font-bold leading-none">{MED_ABBREVS[med] ?? med}</span>}
            ariaLabel={`Administer ${med}`}
            interactive={false}
            active={activeMed === med}
          />
        ))}
        <SidebarButton
          icon="ℹ"
          label="INFO"
          ariaLabel="Medication log"
          interactive={false}
        />
        <SidebarButton
          icon="▶"
          label={`Pg ${nextPage}`}
          ariaLabel={`Go to medication page ${nextPage}`}
          interactive={false}
        />
        <SidebarButton
          icon="←"
          label="BACK"
          ariaLabel="Exit medications"
          interactive={false}
        />
      </div>
    )
  }

  // In 12-lead view the menu collapses to Patient Info (slot 2) + Back (bottom).
  // The other slots stay as empty spacers so both controls land on the same
  // levels as the main-view menu — and align 1:1 with the physical soft keys.
  if (twelveLeadActive) {
    return (
      <div className="h-full w-full flex flex-col justify-between bg-sidebar-bg pb-[54px]">
        <SidebarButton icon="📷" label="CAPTURE" ariaLabel="Capture 12-lead" interactive={false} />
        <SidebarButton icon="ⓘ" label="PT INFO" ariaLabel="Patient Info" interactive={false} />
        <SidebarSlotSpacer />
        <SidebarSlotSpacer />
        <SidebarSlotSpacer />
        <SidebarSlotSpacer />
        <SidebarButton icon="←" label="BACK" ariaLabel="Back" interactive={false} />
      </div>
    )
  }

  return (
    <div className="h-full w-full flex flex-col justify-between bg-sidebar-bg pb-[54px]">
      <SidebarButton icon="☼" label="LUM" ariaLabel="Brightness" interactive={false} />
      <SidebarButton
        icon="12L"
        label="LEAD"
        ariaLabel="12-lead view"
        active={false}
        interactive={false}
      />
      <SidebarButton
        icon="CO₂"
        label="ETCO2"
        ariaLabel="Toggle EtCO2"
        active={false}
        interactive={false}
      />
      <SidebarButton icon="℞" label="MED" ariaLabel="Medications" interactive={false} />
      <SidebarButton icon="C" label="CALL INFO" ariaLabel="Call Info (sidebar)" interactive={false} />
      <SidebarButton icon="🖨" label="PRINT" ariaLabel="Print" active={printActive} interactive={false} />
      <SidebarButton icon="←" label="BACK" ariaLabel="Back" interactive={false} />
    </div>
  )
}

// Empty soft-key slot — same height as a square SidebarButton so the populated
// keys stay on their fixed levels under flex justify-between.
function SidebarSlotSpacer() {
  return <div aria-hidden="true" className="w-full h-[clamp(43px,6.2vh,68px)]" />
}
