'use client'

import { SidebarButton } from './SidebarButton'

const MED_PAGES: Record<1 | 2 | 3, string[]> = {
  1: ['O2', 'AAS', 'Nitro', 'Epi'],
  2: ['Salbutamol', 'Glucagon', 'Midazolam', 'Nalaxone'],
  3: ['Zofran', 'Tylenol', 'Advil', 'Fentanyl'],
}

const NEXT_PAGE: Record<1 | 2 | 3, 1 | 2 | 3> = { 1: 2, 2: 3, 3: 1 }

const MED_ABBREVS: Record<string, string> = {
  'O2':         'O2',
  'AAS':        'AAS',
  'Nitro':      'NTG',
  'Epi':        'EPI',
  'Salbutamol': 'SALB',
  'Glucagon':   'GLUC',
  'Midazolam':  'MIDAZ',
  'Nalaxone':   'NALX',
  'Zofran':     'ZOF',
  'Tylenol':    'TYL',
  'Advil':      'ADV',
  'Fentanyl':   'FENT',
}

type LeftSidebarProps = {
  twelveLeadActive: boolean
  etco2Active: boolean
  medicationMode?: boolean
  medicationPage?: 1 | 2 | 3
  activeMed?: string | null
}

export function LeftSidebar({
  twelveLeadActive,
  etco2Active,
  medicationMode = false,
  medicationPage = 1,
  activeMed = null,
}: LeftSidebarProps) {
  if (medicationMode) {
    const meds = MED_PAGES[medicationPage]
    const nextPage = NEXT_PAGE[medicationPage]

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

  return (
    <div className="h-full w-full flex flex-col justify-between bg-sidebar-bg pb-[54px]">
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
