import { describe, expect, it } from 'vitest'

import { parseCallerInfoAutoSort } from '../callerInfoAutoSort'

describe('parseCallerInfoAutoSort', () => {
  it('parses the dispatch caller-info format into the target fields', () => {
    expect(
      parseCallerInfoAutoSort(
        [
          'CALL #: C-2026-15',
          'PRIORITY: P1',
          'MPDS CODE: 06D02',
          'ADDRESS: 123 Rue Principale',
          'PATIENT: Jean Tremblay',
          'CHIEF COMPLAINT: Difficulty breathing',
          'DETAILS: Sitting upright',
          'STATUS: Police on scene',
          'UNITS ASSIGNED: Medic 421',
          'TIME RECEIVED: 14:35',
        ].join('\n'),
      ),
    ).toEqual({
      callNumber: 'C-2026-15',
      priority: 'P1',
      mpdsCode: '06D02',
      address: '123 Rue Principale',
      problem: 'Difficulty breathing',
      information: [
        'PATIENT: Jean Tremblay',
        'Sitting upright',
        'UNITS ASSIGNED: Medic 421',
      ].join('\n'),
      update: 'Police on scene',
      time: '14:35',
    })
  })

  it('parses dispatch labels whose values are on following lines', () => {
    expect(
      parseCallerInfoAutoSort(
        [
          'CALL #: 2026-0612-1712',
          'PRIORITY: P1 / DELTA',
          'MPDS CODE: 26-D-1',
          'ADDRESS:',
          '4480 Boulevard Saint-Jean, Dollard-des-Ormeaux, QC',
          'CHIEF COMPLAINT:',
          'Male, 67 years old, fever and difficulty breathing',
          'DETAILS:',
          'Fever for 3 days',
          'Increasing shortness of breath',
          'STATUS:',
          '10-100 Unstable',
          'UNITS ASSIGNED:',
          '2231',
          '2232',
          'PR-451',
          'TIME RECEIVED:',
          '17:12',
        ].join('\n'),
      ),
    ).toEqual({
      callNumber: '2026-0612-1712',
      priority: 'P1 / DELTA',
      mpdsCode: '26-D-1',
      address: '4480 Boulevard Saint-Jean, Dollard-des-Ormeaux, QC',
      problem: 'Male, 67 years old, fever and difficulty breathing',
      information: [
        'Fever for 3 days\nIncreasing shortness of breath',
        'UNITS ASSIGNED: 2231\n2232\nPR-451',
      ].join('\n'),
      update: '10-100 Unstable',
      time: '17:12',
    })
  })

  it('keeps time received to the time value when later scenario sections follow', () => {
    expect(
      parseCallerInfoAutoSort(
        [
          'TIME RECEIVED:',
          '17:12',
          '',
          '### Patient Presentation',
          '',
          'Age/Sex: 67-year-old male',
          'Appearance: confused and short of breath',
        ].join('\n'),
      ),
    ).toEqual({
      time: '17:12',
    })
  })

  it('parses French dispatch aliases', () => {
    expect(
      parseCallerInfoAutoSort(
        [
          "Numero d'appel: A-778",
          'Priorite: P2',
          'Code MPDS: 17B01',
          'Adresse: 456 Avenue Centrale',
          'Plainte principale: Chute',
          'Details: Douleur a la hanche',
          'Statut: Pompiers sur place',
          'Unites assignees: Medic 2',
          'Heure recue: 16:10',
        ].join('\n'),
      ),
    ).toEqual({
      callNumber: 'A-778',
      priority: 'P2',
      mpdsCode: '17B01',
      address: '456 Avenue Centrale',
      problem: 'Chute',
      information: [
        'Douleur a la hanche',
        'UNITES ASSIGNEES: Medic 2',
      ].join('\n'),
      update: 'Pompiers sur place',
      time: '16:10',
    })
  })

  it('parses Addresse as an address alias', () => {
    expect(parseCallerInfoAutoSort('Addresse: 4480 Boulevard Saint-Jean')).toEqual({
      address: '4480 Boulevard Saint-Jean',
    })
  })

  it('parses labelled French caller-info lines', () => {
    expect(
      parseCallerInfoAutoSort(
        [
          'Adresse: 123 Rue Principale',
          'Probleme: Douleur thoracique',
          'Information: Patient conscient',
          'Mise a jour: Police sur place',
          'Heure: 14:35',
        ].join('\n'),
      ),
    ).toEqual({
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
          'Address: 456 Avenue Centrale',
          'Problem: Difficult breathing',
          'Info: Second floor',
          'Update: Crew requested',
          'Time: 16:10',
          'Access: Side door',
        ].join('\n'),
      ),
    ).toEqual({
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
          'Address - 10 Main Street',
          'Update - Staging requested',
        ].join('\n'),
      ),
    ).toEqual({
      address: '10 Main Street',
      update: 'Staging requested',
    })
  })

  it('ignores legacy priority code labels while keeping MPDS Code support', () => {
    expect(
      parseCallerInfoAutoSort(
        [
          'Code: P2',
          'Intervention prioritaire code: P1',
          'MPDS CODE: 06D02',
        ].join('\n'),
      ),
    ).toEqual({
      mpdsCode: '06D02',
    })
  })

  it('allows labelled empty values to clear matching fields', () => {
    expect(parseCallerInfoAutoSort('Adresse:')).toEqual({ address: '' })
  })
})
