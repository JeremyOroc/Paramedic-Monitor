import { describe, expect, it } from 'vitest'

import {
  EMPTY_PATIENT_INFORMATION_TEXT,
  parsePatientInformationAutoSort,
} from '../patientInformationAutoSort'

describe('parsePatientInformationAutoSort', () => {
  it('parses SAMPLE-only letter labels', () => {
    expect(
      parsePatientInformationAutoSort(
        [
          'S: Chest pain',
          'A: Aspirin allergy',
          'M: Ventolin',
          'P: Asthma',
          'L: Lunch',
          'E: Walking upstairs',
        ].join('\n'),
      ),
    ).toEqual({
      ...EMPTY_PATIENT_INFORMATION_TEXT(),
      sample: {
        S: 'Chest pain',
        A: 'Aspirin allergy',
        M: 'Ventolin',
        P: 'Asthma',
        L: 'Lunch',
        E: 'Walking upstairs',
      },
    })
  })

  it('parses OPQRST-only letter labels', () => {
    expect(
      parsePatientInformationAutoSort(
        [
          'O: 20 minutes ago',
          'Q: Sharp',
          'R: Left arm',
          'T: Constant',
        ].join('\n'),
      ),
    ).toEqual({
      ...EMPTY_PATIENT_INFORMATION_TEXT(),
      opqrst: {
        O: '20 minutes ago',
        P: '',
        Q: 'Sharp',
        R: 'Left arm',
        S: '',
        T: 'Constant',
      },
    })
  })

  it('routes repeated S and P labels first to SAMPLE and second to OPQRST', () => {
    expect(
      parsePatientInformationAutoSort(
        [
          'S: Chest pain',
          'P: Asthma',
          'S: 8/10',
          'P: Worse with breathing',
        ].join('\n'),
      ),
    ).toEqual({
      ...EMPTY_PATIENT_INFORMATION_TEXT(),
      sample: {
        S: 'Chest pain',
        A: '',
        M: '',
        P: 'Asthma',
        L: '',
        E: '',
      },
      opqrst: {
        O: '',
        P: 'Worse with breathing',
        Q: '',
        R: '',
        S: '8/10',
        T: '',
      },
    })
  })

  it('ignores unknown labels and extra repeated S/P labels', () => {
    expect(
      parsePatientInformationAutoSort(
        [
          'X: Ignore this',
          'S: Sample symptom',
          'S: OPQRST severity',
          'S: Extra severity',
          'P: Sample past history',
          'P: OPQRST provocation',
          'P: Extra provocation',
        ].join('\n'),
      ),
    ).toEqual({
      ...EMPTY_PATIENT_INFORMATION_TEXT(),
      sample: {
        S: 'Sample symptom',
        A: '',
        M: '',
        P: 'Sample past history',
        L: '',
        E: '',
      },
      opqrst: {
        O: '',
        P: 'OPQRST provocation',
        Q: '',
        R: '',
        S: 'OPQRST severity',
        T: '',
      },
    })
  })

  it('returns an empty state for clear-then-fill use when no labels are present', () => {
    expect(parsePatientInformationAutoSort('Not labelled text')).toEqual(
      EMPTY_PATIENT_INFORMATION_TEXT(),
    )
  })
})
