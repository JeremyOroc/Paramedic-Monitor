import { describe, expect, it } from 'vitest'

import { getWagamiADefibLabel, getWagamiAText } from '../wagamiALocalization'

describe('Wagami A localization', () => {
  it('provides French and English labels from stable keys', () => {
    expect(getWagamiAText('fr').taskMedications).toBe('Médicaments')
    expect(getWagamiAText('en').taskMedications).toBe('Medications')
    expect(getWagamiAText('fr')).toMatchObject({ alarmHr: 'FC', alarmSpo2: 'SpO₂', alarmBp: 'PNI' })
    expect(getWagamiAText('en')).toMatchObject({
      alarmHr: 'HR',
      alarmSpo2: 'SpO₂',
      alarmBp: 'BP',
      heartRate: 'HR',
      bloodPressure: 'BP',
      bpSys: 'BP SYS',
      bpDia: 'BP DIA',
      openPniSettings: 'Open BP settings',
      pniTitle: 'BP settings',
    })
    expect(getWagamiAText('fr').openPniSettings).toBe('Ouvrir les réglages PNI')
    expect(getWagamiAText('en').openPniSettings).toBe('Open BP settings')
    expect(getWagamiADefibLabel('fr', 'shock_advised')).toContain('CHOC CONSEILLÉ')
    expect(getWagamiADefibLabel('en', 'shock_advised')).toContain('SHOCK ADVISED')
    expect(getWagamiADefibLabel('fr', 'charging', 'automatic_advised')).toBe('CHOC CONSEILLÉ · CHARGE EN COURS')
    expect(getWagamiADefibLabel('en', 'charging', 'automatic_advised')).toBe('SHOCK ADVISED · CHARGING')
  })
})
