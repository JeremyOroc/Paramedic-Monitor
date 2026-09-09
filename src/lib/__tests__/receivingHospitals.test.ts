import { describe, expect, it } from 'vitest'

import {
  hospitalDisplayPosition,
  hospitalsForGroup,
  RECEIVING_HOSPITALS,
  sortHospitalsByDrivingDistance,
} from '@/lib/receivingHospitals'

describe('Receiving Hospital Directory', () => {
  it('contains the supplied 16 adult and 2 pediatric entries', () => {
    expect(RECEIVING_HOSPITALS).toHaveLength(18)
    expect(hospitalsForGroup('adult')).toHaveLength(16)
    expect(hospitalsForGroup('pediatric')).toHaveLength(2)
    expect(new Set(RECEIVING_HOSPITALS.map((hospital) => hospital.id)).size).toBe(18)
  })

  it('preserves the supplied curriculum copy', () => {
    expect(RECEIVING_HOSPITALS[0]).toMatchObject({
      name: "CHUM - Centre hospitalier de l'Université de Montréal",
      designation: 'Tertiary / Quaternary',
      keyNotes: 'Stroke, transplant, vascular, specialized medicine',
    })
    expect(RECEIVING_HOSPITALS.at(-1)).toMatchObject({
      name: "Montreal Children's Hospital",
      designation: 'Tertiary Pediatric',
      keyNotes: 'Pediatric trauma, surgery, PICU',
    })
  })

  it('keeps missing distances at the end and reference-order stable', () => {
    const adult = hospitalsForGroup('adult').slice(0, 4)
    const sorted = sortHospitalsByDrivingDistance(adult, {
      chum: 4000,
      'montreal-general': 2000,
      'muhc-glen': null,
      'jewish-general': 2000,
    })

    expect(sorted.map((hospital) => hospital.id)).toEqual([
      'montreal-general',
      'jewish-general',
      'chum',
      'muhc-glen',
    ])
  })

  it('offsets the two Glen selectors while retaining one routing coordinate', () => {
    const adultGlen = RECEIVING_HOSPITALS.find((hospital) => hospital.id === 'muhc-glen')
    const childrens = RECEIVING_HOSPITALS.find(
      (hospital) => hospital.id === 'montreal-childrens',
    )
    expect(adultGlen?.position).toEqual(childrens?.position)
    expect(adultGlen && hospitalDisplayPosition(adultGlen)).not.toEqual(adultGlen?.position)
    expect(childrens && hospitalDisplayPosition(childrens)).not.toEqual(childrens?.position)
  })
})
