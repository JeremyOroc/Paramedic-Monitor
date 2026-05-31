// Single source of truth for the 7 physical left soft keys, per view.
//
// Each view (main / 12-lead / medication) maps the 7 fixed hardware keys to a
// label/action. A key with no action in the current view is inert (no onClick).
// The on-screen `LeftSidebar` mirrors these slots with its own presentation.

import { MED_PAGES, type MedicationPage } from '@/lib/monitor/medications'

export type SoftKey = {
  id: string
  ariaLabel: string
  onClick?: () => void
  active?: boolean
}

export type MainSoftKeyActions = {
  onTwelveLead: () => void
  onToggleEtco2: () => void
  onTreatment: () => void
  onLeftAnalyse: () => void
  onPrint: () => void
  onBack: () => void
}

export function buildMainSoftKeys(a: MainSoftKeyActions): SoftKey[] {
  return [
    { id: 'brightness', ariaLabel: 'Brightness soft key' },
    { id: '12lead', ariaLabel: '12-lead view', onClick: a.onTwelveLead, active: false },
    { id: 'etco2', ariaLabel: 'Toggle EtCO2', onClick: a.onToggleEtco2 },
    { id: 'treatment', ariaLabel: 'Treatment soft key', onClick: a.onTreatment },
    { id: 'analyse', ariaLabel: 'Call Info (sidebar)', onClick: a.onLeftAnalyse },
    { id: 'printer', ariaLabel: 'Printer soft key', onClick: a.onPrint },
    { id: 'back', ariaLabel: 'Back', onClick: a.onBack },
  ]
}

export type MedicationSoftKeyActions = {
  onMedClick: (name: string) => void
  onMedInfo: () => void
  onMedPageChange: () => void
  onMedBack: () => void
}

export function buildMedicationSoftKeys(
  page: MedicationPage,
  a: MedicationSoftKeyActions,
): SoftKey[] {
  const meds = MED_PAGES[page]
  return [
    { id: 'med1', ariaLabel: `Administer ${meds[0]}`, onClick: () => a.onMedClick(meds[0]) },
    { id: 'med2', ariaLabel: `Administer ${meds[1]}`, onClick: () => a.onMedClick(meds[1]) },
    { id: 'med3', ariaLabel: `Administer ${meds[2]}`, onClick: () => a.onMedClick(meds[2]) },
    { id: 'med4', ariaLabel: `Administer ${meds[3]}`, onClick: () => a.onMedClick(meds[3]) },
    { id: 'med-info', ariaLabel: 'Medication info', onClick: a.onMedInfo },
    { id: 'med-page', ariaLabel: 'Next medication page', onClick: a.onMedPageChange },
    { id: 'med-back', ariaLabel: 'Exit medications', onClick: a.onMedBack },
  ]
}

export type TwelveLeadSoftKeyActions = {
  onCaptureTwelveLead: () => void
  onPatientInfo: () => void
  onBack: () => void
}

export function buildTwelveLeadSoftKeys(a: TwelveLeadSoftKeyActions): SoftKey[] {
  return [
    { id: 'capture', ariaLabel: 'Capture 12-lead', onClick: a.onCaptureTwelveLead },
    { id: 'patient-info', ariaLabel: 'Patient Info', onClick: a.onPatientInfo },
    { id: 'slot3', ariaLabel: 'Soft key 3' },
    { id: 'slot4', ariaLabel: 'Soft key 4' },
    { id: 'slot5', ariaLabel: 'Soft key 5' },
    { id: 'slot6', ariaLabel: 'Soft key 6' },
    { id: 'back', ariaLabel: 'Back', onClick: a.onBack },
  ]
}
