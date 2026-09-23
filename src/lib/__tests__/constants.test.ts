import { describe, expect, it } from 'vitest'

import { WAGAMI_A_COLORS } from '../constants'

describe('Wagami A Precision Graphite palette', () => {
  it('keeps the fourteen approved A-specific colors centralized', () => {
    expect(WAGAMI_A_COLORS).toEqual({
      backdrop: '#020506',
      screen: '#081014', surface: '#0D1B20', surfaceRaised: '#14272F',
      text: '#F3F8FB', mutedText: '#B9CAD1', border: '#517380',
      ecg: '#65E5D9', spo2: '#FFE082', pni: '#C6ECFF', etco2: '#AAA6FF',
      alarm: '#FF5656', pending: '#E6B55C', shockShell: '#D62B2B',
    })
  })
})
