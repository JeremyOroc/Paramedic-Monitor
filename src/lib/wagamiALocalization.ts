import type { DefibChargeOrigin, DefibState } from '@/hooks/useDefibSequence'
import type { WagamiALocale } from '@/types/wagamiA'

const COPY = {
  fr: {
    liveDisplay: 'Affichage clinique Wagami A',
    taskDock: 'Lanceur de tâches Wagami A',
    shellNavigation: 'Navigation physique Wagami A',
    left: 'Gauche', right: 'Droite', enter: 'Entrée',
    power: 'Alimentation WAGAMI A', powerOff: 'ALIMENTATION COUPÉE',
    mute: 'Couper tous les sons', unmute: 'Réactiver tous les sons',
    patientMode: 'Changer le mode patient', currentMode: 'mode actuel', patientModeLocked: 'Mode verrouillé pendant la défibrillation',
    bpRead: 'Mesurer la pression artérielle', bpCancel: 'Annuler la mesure de pression artérielle',
    analyze: 'Analyser WAGAMI A', charge: 'Charge WAGAMI A', shock: 'Choc WAGAMI A',
    taskTwelveLead: '12 dérivations', taskEtco2: 'EtCO₂', taskMedications: 'Médicaments',
    taskCallInfo: 'Info appel', taskVitalLog: 'Journal des signes vitaux', taskConfigure: 'Configurer',
    adult: 'ADULTE', pediatric: 'PÉDIATRIQUE', neonate: 'NÉONATAL',
    pleaseWait: 'Veuillez patienter', measuring: 'Mesure en cours', lastReading: 'Dernière mesure',
    mode: 'MODE', alarm: 'ALARME', alarmHr: 'FC', alarmSpo2: 'SpO₂', alarmBp: 'PNI', ledNormal: 'Voyant alarme normal', ledActive: 'Voyant alarme actif', ledDisabled: 'Voyant alarme désactivé',
    defibrillation: 'DÉFIBRILLATION', energy: 'ÉNERGIE (J)', energyDown: 'Diminuer l’énergie', energyUp: 'Augmenter l’énergie',
    chargeProgress: 'CHARGE', cprTime: 'TEMPS RCP',
    back: 'Retour', capture: 'Acquérir', print: 'Imprimer', transmit: 'Transmettre', close: 'Fermer',
    twelveLeadTitle: 'ECG 12 dérivations', acquiring: 'ACQUISITION EN COURS', printPreview: 'Aperçu imprimé',
    etco2Title: 'Étalonnage EtCO₂', etco2Idle: 'Capteur non étalonné', etco2Calibrating: 'Étalonnage en cours', etco2Calibrated: 'Capteur étalonné', calibrate: 'Étalonner', cancel: 'Annuler',
    medicationsTitle: 'Médicaments', eventLog: 'Journal des événements', administer: 'Consigner', noEvents: 'Aucun événement consigné.',
    callInfoTitle: 'Information d’appel', vitalLogTitle: 'Journal des signes vitaux', noVitals: 'Aucun signe vital consigné.',
    time: 'HEURE', previous: 'Précédent', next: 'Suivant', page: 'Page', of: 'sur',
    configureTitle: 'Configuration', patientModeLabel: 'Mode patient', pniSettings: 'Réglages PNI',
    language: 'Langue de l’appareil', french: 'Français', english: 'English', alarmLed: 'Voyant d’alarme', on: 'Activé', off: 'Désactivé',
    pniTitle: 'Réglages PNI', pniMode: 'Mode de mesure', manual: 'Manuel', automatic: 'Automatique', interval: 'Intervalle automatique', minutes: 'min',
    sent: 'ENVOYÉ', transmissionTitle: 'Destination de transmission',
    landscapeRequired: 'Affichage paysage requis', landscapeHelp: 'Utilisez un iPad compatible en mode paysage ou un écran de 1024 pixels minimum.',
  },
  en: {
    liveDisplay: 'Wagami A clinical display',
    taskDock: 'Wagami A task launcher',
    shellNavigation: 'Wagami A physical navigation',
    left: 'Left', right: 'Right', enter: 'Enter',
    power: 'WAGAMI A power', powerOff: 'POWER OFF',
    mute: 'Mute all audio', unmute: 'Restore all audio',
    patientMode: 'Change patient mode', currentMode: 'current mode', patientModeLocked: 'Mode locked during defibrillation',
    bpRead: 'Measure blood pressure', bpCancel: 'Cancel blood pressure measurement',
    analyze: 'Analyze WAGAMI A', charge: 'Charge WAGAMI A', shock: 'Shock WAGAMI A',
    taskTwelveLead: '12-lead', taskEtco2: 'EtCO₂', taskMedications: 'Medications',
    taskCallInfo: 'Call Info', taskVitalLog: 'Vital Log', taskConfigure: 'Configure',
    adult: 'ADULT', pediatric: 'PEDIATRIC', neonate: 'NEONATAL',
    pleaseWait: 'Please wait', measuring: 'Measurement in progress', lastReading: 'Last reading',
    mode: 'MODE', alarm: 'ALARM', alarmHr: 'HR', alarmSpo2: 'SpO₂', alarmBp: 'NIBP', ledNormal: 'Alarm LED normal', ledActive: 'Alarm LED active', ledDisabled: 'Alarm LED disabled',
    defibrillation: 'DEFIBRILLATION', energy: 'ENERGY (J)', energyDown: 'Decrease energy', energyUp: 'Increase energy',
    chargeProgress: 'CHARGE', cprTime: 'CPR TIME',
    back: 'Back', capture: 'Acquire', print: 'Print', transmit: 'Transmit', close: 'Close',
    twelveLeadTitle: '12-lead ECG', acquiring: 'ACQUIRING', printPreview: 'Print preview',
    etco2Title: 'EtCO₂ calibration', etco2Idle: 'Sensor not calibrated', etco2Calibrating: 'Calibration in progress', etco2Calibrated: 'Sensor calibrated', calibrate: 'Calibrate', cancel: 'Cancel',
    medicationsTitle: 'Medications', eventLog: 'Event Log', administer: 'Record', noEvents: 'No events recorded.',
    callInfoTitle: 'Call information', vitalLogTitle: 'Vital Log', noVitals: 'No vitals recorded.',
    time: 'TIME', previous: 'Previous', next: 'Next', page: 'Page', of: 'of',
    configureTitle: 'Configure', patientModeLabel: 'Patient mode', pniSettings: 'NIBP settings',
    language: 'Device language', french: 'Français', english: 'English', alarmLed: 'Alarm LED', on: 'On', off: 'Off',
    pniTitle: 'NIBP settings', pniMode: 'Measurement mode', manual: 'Manual', automatic: 'Automatic', interval: 'Automatic interval', minutes: 'min',
    sent: 'SENT', transmissionTitle: 'Transmission destination',
    landscapeRequired: 'Landscape display required', landscapeHelp: 'Use a supported iPad in landscape or a display at least 1024 pixels wide.',
  },
} as const

export type WagamiAText = (typeof COPY)[WagamiALocale]

export function getWagamiAText(locale: WagamiALocale): WagamiAText {
  return COPY[locale]
}

const DEFIB_COPY: Record<WagamiALocale, Record<DefibState, string>> = {
  fr: {
    idle: 'EN ATTENTE', analyzing_ecg: 'ANALYSE ECG', analyzing_clear: 'ANALYSE · DÉGAGEZ',
    analyzing_result: 'CHOC NON CONSEILLÉ', shock_advised: 'CHOC CONSEILLÉ · CHARGE REQUISE',
    cpr: 'RCP EN COURS', charge_prompt: 'APPUYEZ SUR CHARGE', charging: 'CHARGE EN COURS',
    charged: 'PRÊT À CHOC', delivered: 'CHOC DÉLIVRÉ',
  },
  en: {
    idle: 'STANDBY', analyzing_ecg: 'ANALYZING ECG', analyzing_clear: 'ANALYZING · STAND CLEAR',
    analyzing_result: 'NO SHOCK ADVISED', shock_advised: 'SHOCK ADVISED · CHARGE REQUIRED',
    cpr: 'CPR IN PROGRESS', charge_prompt: 'PRESS CHARGE', charging: 'CHARGING',
    charged: 'READY TO SHOCK', delivered: 'SHOCK DELIVERED',
  },
}

export function getWagamiADefibLabel(locale: WagamiALocale, state: DefibState, chargeOrigin: DefibChargeOrigin = null): string {
  if (state === 'charging' && chargeOrigin === 'automatic_advised') {
    return locale === 'fr' ? 'CHOC CONSEILLÉ · CHARGE EN COURS' : 'SHOCK ADVISED · CHARGING'
  }
  return DEFIB_COPY[locale][state]
}
