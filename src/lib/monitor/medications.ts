// Single source of truth for the medication soft-key pages.
//
// These were previously duplicated across `DeviceShell` (physical keys),
// `LeftSidebar` (on-screen labels), and `useMonitorController` (page cycling).

export type MedicationPage = 1 | 2 | 3

export const MED_PAGES: Record<MedicationPage, readonly string[]> = {
  1: ['O2', 'AAS', 'Nitro', 'Epi'],
  2: ['Salbutamol', 'Glucagon', 'Midazolam', 'Nalaxone'],
  3: ['Zofran', 'Tylenol', 'Advil', 'Fentanyl'],
}

export const NEXT_MED_PAGE: Record<MedicationPage, MedicationPage> = { 1: 2, 2: 3, 3: 1 }

// Short labels shown on the on-screen sidebar buttons (full names drive aria labels).
export const MED_ABBREVS: Record<string, string> = {
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
