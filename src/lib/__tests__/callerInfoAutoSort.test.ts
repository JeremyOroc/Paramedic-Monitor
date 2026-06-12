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

  it('parses labels with values on following lines', () => {
    expect(
      parseCallerInfoAutoSort(
        [
          'Adresse',
          '789 Rue du Parc',
          'Appartement 4',
          'Probleme',
          'Syncope',
          'Information',
          'Patient respire normalement',
        ].join('\n'),
      ),
    ).toEqual({
      address: '789 Rue du Parc\nAppartement 4',
      problem: 'Syncope',
      information: 'Patient respire normalement',
    })
  })

  it('parses dash-separated labelled lines', () => {
    expect(
      parseCallerInfoAutoSort(
        [
          'Code - P3',
          'Address - 10 Main Street',
          'Update - Staging requested',
        ].join('\n'),
      ),
    ).toEqual({
      interventionPriorityCode: 'P3',
      address: '10 Main Street',
      update: 'Staging requested',
    })
  })

  it('allows labelled empty values to clear matching fields', () => {
    expect(parseCallerInfoAutoSort('Adresse:')).toEqual({ address: '' })
  })
})
