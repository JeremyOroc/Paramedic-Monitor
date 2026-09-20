import { describe, expect, it } from 'vitest'

import { getWagamiADefibLabel, getWagamiAText } from '../wagamiALocalization'

describe('Wagami A localization', () => {
  it('provides French and English labels from stable keys', () => {
    expect(getWagamiAText('fr').taskMedications).toBe('Médicaments')
    expect(getWagamiAText('en').taskMedications).toBe('Medications')
    expect(getWagamiADefibLabel('fr', 'shock_advised')).toContain('CHOC CONSEILLÉ')
    expect(getWagamiADefibLabel('en', 'shock_advised')).toContain('SHOCK ADVISED')
  })
})
