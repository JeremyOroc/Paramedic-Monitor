import { describe, expect, it } from 'vitest'

import { parsePatientPhysicalAutoSort } from '../patientPhysicalAutoSort'

describe('parsePatientPhysicalAutoSort', () => {
  it('parses the provided physical assessment sections into body-region findings', () => {
    expect(
      parsePatientPhysicalAutoSort(
        [
          'Chest / Respiratory',
          'Left anterior chest tenderness',
          'Equal chest rise',
          'Abdomen',
          'Soft',
          'Mild left upper quadrant tenderness',
          'Pelvis',
          'Stable',
          'Left Lower Extremity',
          'Obvious mid-shaft femur deformity',
          'Leg shortened and externally rotated',
          'Right Lower Extremity',
          'No deformity',
          'Left Upper Extremity',
          'Minor abrasions to forearm',
          'Right Upper Extremity',
          'No injuries noted',
        ].join('\n'),
      ),
    ).toEqual({
      'front-chest': 'Left anterior chest tenderness\nEqual chest rise',
      'front-abdomen': 'Soft\nMild left upper quadrant tenderness',
      'front-trunk': 'Stable',
      'front-patient-left-upper-leg':
        'Obvious mid-shaft femur deformity\nLeg shortened and externally rotated',
      'front-patient-left-lower-leg':
        'Obvious mid-shaft femur deformity\nLeg shortened and externally rotated',
      'front-patient-left-foot':
        'Obvious mid-shaft femur deformity\nLeg shortened and externally rotated',
      'front-patient-right-upper-leg': 'No deformity',
      'front-patient-right-lower-leg': 'No deformity',
      'front-patient-right-foot': 'No deformity',
      'front-patient-left-shoulder': 'Minor abrasions to forearm',
      'front-patient-left-upper-arm': 'Minor abrasions to forearm',
      'front-patient-left-lower-arm': 'Minor abrasions to forearm',
      'front-patient-left-hand': 'Minor abrasions to forearm',
      'front-patient-right-shoulder': 'No injuries noted',
      'front-patient-right-upper-arm': 'No injuries noted',
      'front-patient-right-lower-arm': 'No injuries noted',
      'front-patient-right-hand': 'No injuries noted',
    })
  })

  it('ignores unknown sections and strips simple bullet markers from findings', () => {
    expect(
      parsePatientPhysicalAutoSort(
        [
          'Unknown Section',
          'Ignore this',
          'Abdomen:',
          '* Soft',
          '- No distention',
        ].join('\n'),
      ),
    ).toEqual({
      'front-abdomen': 'Soft\nNo distention',
    })
  })

  it('maps broad extremity headings to front outline regions only', () => {
    const findings = parsePatientPhysicalAutoSort(
      ['Left Lower Extremity', 'Swelling', 'Right Upper Extremity', 'Full ROM'].join('\n'),
    )

    expect(findings).toMatchObject({
      'front-patient-left-upper-leg': 'Swelling',
      'front-patient-left-lower-leg': 'Swelling',
      'front-patient-left-foot': 'Swelling',
      'front-patient-right-shoulder': 'Full ROM',
      'front-patient-right-upper-arm': 'Full ROM',
      'front-patient-right-lower-arm': 'Full ROM',
      'front-patient-right-hand': 'Full ROM',
    })
    expect(findings['back-patient-left-upper-leg']).toBeUndefined()
    expect(findings['back-patient-right-upper-arm']).toBeUndefined()
  })

  it('stops lower extremity collection when a back spine section starts', () => {
    const findings = parsePatientPhysicalAutoSort(
      [
        'Right Lower Extremity',
        'No deformity',
        'Full movement',
        'Back / Spine',
        'Midline lumbar tenderness',
        'No step-off noted',
      ].join('\n'),
    )

    expect(findings).toMatchObject({
      'front-patient-right-upper-leg': 'No deformity\nFull movement',
      'front-patient-right-lower-leg': 'No deformity\nFull movement',
      'front-patient-right-foot': 'No deformity\nFull movement',
      'back-back': 'Midline lumbar tenderness\nNo step-off noted',
    })
    expect(findings['front-patient-right-upper-leg']).not.toContain('Midline lumbar tenderness')
    expect(findings['front-patient-right-lower-leg']).not.toContain('No step-off noted')
  })

  it('stops lower extremity collection when a thoracic area section starts', () => {
    const findings = parsePatientPhysicalAutoSort(
      [
        'Right Lower Extremity',
        'No deformity',
        'Thoracic area',
        'Tenderness over right ribs',
        'Pain with deep inspiration',
      ].join('\n'),
    )

    expect(findings).toMatchObject({
      'front-patient-right-upper-leg': 'No deformity',
      'front-patient-right-lower-leg': 'No deformity',
      'front-patient-right-foot': 'No deformity',
      'front-chest': 'Tenderness over right ribs\nPain with deep inspiration',
    })
    expect(findings['front-patient-right-foot']).not.toContain('Tenderness over right ribs')
  })

  it('prioritizes thoracic spine as rear back instead of front chest', () => {
    const findings = parsePatientPhysicalAutoSort(
      ['Thoracic spine', 'Tenderness between shoulder blades'].join('\n'),
    )

    expect(findings).toEqual({
      'back-back': 'Tenderness between shoulder blades',
    })
    expect(findings['front-chest']).toBeUndefined()
  })

  it('maps chest-adjacent headings to front chest', () => {
    expect(
      parsePatientPhysicalAutoSort(
        ['Anterior chest', 'Bruising over sternum', 'Rib cage', 'Right rib tenderness'].join('\n'),
      ),
    ).toEqual({
      'front-chest': 'Right rib tenderness',
    })
  })

  it('maps broad back-adjacent headings to rear back', () => {
    expect(
      parsePatientPhysicalAutoSort(
        [
          'Lumbar',
          'Lower back pain',
          'Posterior torso',
          'No obvious trauma',
          'Dorsal',
          'Tenderness near scapula',
        ].join('\n'),
      ),
    ).toEqual({
      'back-back': 'Tenderness near scapula',
    })
  })

  it('parses head face neck sections into front head and neck findings', () => {
    expect(
      parsePatientPhysicalAutoSort(
        [
          'Head / Face / Neck',
          'No obvious head trauma',
          'No facial injuries',
          'Cervical spine tenderness present',
          'Cervical collar applied',
        ].join('\n'),
      ),
    ).toEqual({
      'front-head':
        'No obvious head trauma\nNo facial injuries\nCervical spine tenderness present\nCervical collar applied',
      'front-neck':
        'No obvious head trauma\nNo facial injuries\nCervical spine tenderness present\nCervical collar applied',
    })
  })

  it('parses explicit respiratory and pulse finding labels', () => {
    expect(
      parsePatientPhysicalAutoSort(
        [
          'Respiratory Rate: 24 breaths/min',
          'Respiratory Rhythm: Regular',
          'Respiratory Strength: Shallow but equal',
          'Pulse Rate: 112 bpm',
          'Pulse Rhythm: Irregular',
          'Pulse Strength: Weak radial pulse',
        ].join('\n'),
      ),
    ).toEqual({
      'respiratory-rate': '24 breaths/min',
      'respiratory-rhythm': 'Regular',
      'respiratory-strength': 'Shallow but equal',
      'pulse-rate': '112 bpm',
      'pulse-rhythm': 'Irregular',
      'pulse-strength': 'Weak radial pulse',
    })
  })

  it('parses broad respiratory and pulse sections when lines are classifiable', () => {
    expect(
      parsePatientPhysicalAutoSort(
        [
          'Respiratory',
          'Rate: 30 breaths per minute',
          'Rhythm: irregular',
          'Effort: labored with shallow chest rise',
          'Pulse',
          'Rate: 120 bpm',
          'Rhythm: regular',
          'Strength: thready',
        ].join('\n'),
      ),
    ).toEqual({
      'respiratory-rate': 'Rate: 30 breaths per minute',
      'respiratory-rhythm': 'Rhythm: irregular',
      'respiratory-strength': 'Effort: labored with shallow chest rise',
      'pulse-rate': 'Rate: 120 bpm',
      'pulse-rhythm': 'Rhythm: regular',
      'pulse-strength': 'Strength: thready',
    })
  })

  it('parses comma-separated pulse and respirations summary lines', () => {
    expect(
      parsePatientPhysicalAutoSort(
        ['Pulse: 136 bpm, Regular, Weak', 'Respirations: 30 breaths/min, Regular, Labored'].join(
          '\n',
        ),
      ),
    ).toEqual({
      'pulse-rate': '136 bpm',
      'pulse-rhythm': 'Regular',
      'pulse-strength': 'Weak',
      'respiratory-rate': '30 breaths/min',
      'respiratory-rhythm': 'Regular',
      'respiratory-strength': 'Labored',
    })
  })

  it('parses skin extremities sections as an icon-only note', () => {
    expect(
      parsePatientPhysicalAutoSort(
        [
          'Skin / Extremities',
          'Pale',
          'Cool',
          'Diaphoretic',
          'Delayed capillary refill (~3 sec)',
          'Abdomen',
          'Soft',
        ].join('\n'),
      ),
    ).toEqual({
      'skin-extremities-note':
        'Pale\nCool\nDiaphoretic\nDelayed capillary refill (~3 sec)',
      'front-abdomen': 'Soft',
    })
  })

  it('does not map skin extremities findings onto body limb regions', () => {
    const findings = parsePatientPhysicalAutoSort(
      ['Skin Extremities:', 'Pale', 'Cool'].join('\n'),
    )

    expect(findings).toEqual({
      'skin-extremities-note': 'Pale\nCool',
    })
    expect(findings['front-patient-left-hand']).toBeUndefined()
    expect(findings['front-patient-right-foot']).toBeUndefined()
  })

  it('parses scene environment sections as an icon-only note', () => {
    expect(
      parsePatientPhysicalAutoSort(
        [
          'Scene / Environment',
          'Witnessed fall',
          'Approximately 12 wooden stairs',
          'Large amount of blood at bottom landing',
          'No environmental hazards',
          'Head / Face / Neck',
          'No obvious head trauma',
        ].join('\n'),
      ),
    ).toEqual({
      'scene-environment-note':
        'Witnessed fall\nApproximately 12 wooden stairs\nLarge amount of blood at bottom landing\nNo environmental hazards',
      'front-head': 'No obvious head trauma',
      'front-neck': 'No obvious head trauma',
    })
  })

  it('does not map scene environment findings onto body regions', () => {
    const findings = parsePatientPhysicalAutoSort(
      ['Scene Environment:', 'Witnessed fall', 'Large amount of blood'].join('\n'),
    )

    expect(findings).toEqual({
      'scene-environment-note': 'Witnessed fall\nLarge amount of blood',
    })
    expect(findings['front-head']).toBeUndefined()
    expect(findings['front-trunk']).toBeUndefined()
  })

  it('ignores unclear broad respiratory and pulse section lines', () => {
    expect(
      parsePatientPhysicalAutoSort(
        ['Respiratory', 'Patient appears uncomfortable', 'Pulse', 'Assessment completed'].join('\n'),
      ),
    ).toEqual({})
  })
})
