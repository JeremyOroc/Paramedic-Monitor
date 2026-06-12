import { describe, expect, it } from 'vitest'

import { parseCallerInfoAutoSort } from '../callerInfoAutoSort'

describe('parseCallerInfoAutoSort', () => {
  it('parses labelled French caller-info lines', () => {
    expect(
      parseCallerInfoAutoSort(
        [
          'Intervention prioritaire code: P1',
          'Adresse: 123 Rue Principale',
          'Probleme: Douleur thoracique',
          'Information: Patient conscient',
          'Mise a jour: Police sur place',
          'Heure: 14:35',
        ].join('\n'),
      ),
    ).toEqual({
      interventionPriorityCode: 'P1',
      address: '123 Rue Principale',
      problem: 'Douleur thoracique',
      information: 'Patient conscient',
      update: 'Police sur place',
      time: '14:35',
    })
  })

  it('parses English aliases and ignores unknown labels', () => {
    expect(
      parseCallerInfoAutoSort(
        [
          'Code: P2',
          'Address: 456 Avenue Centrale',
          'Problem: Difficult breathing',
          'Info: Second floor',
          'Update: Crew requested',
          'Time: 16:10',
          'Access: Side door',
        ].join('\n'),
      ),
    ).toEqual({
      interventionPriorityCode: 'P2',
      address: '456 Avenue Centrale',
      problem: 'Difficult breathing',
      information: 'Second floor',
      update: 'Crew requested',
      time: '16:10',
    })
  })

  it('allows labelled empty values to clear matching fields', () => {
    expect(parseCallerInfoAutoSort('Adresse:')).toEqual({ address: '' })
  })
})
