import { describe, expect, it } from 'vitest'

import {
  createEmptyScenarioSnapshot,
  createScenarioSnapshot,
  hasMeaningfulScenarioContent,
  normalizeScenarioSnapshot,
  scenarioSnapshotsEqual,
} from '@/lib/scenarioSnapshot'

describe('scenario snapshots', () => {
  it('treats the default authoring state as empty', () => {
    const empty = createEmptyScenarioSnapshot()

    expect(hasMeaningfulScenarioContent(empty)).toBe(false)
    expect(scenarioSnapshotsEqual(empty, createEmptyScenarioSnapshot())).toBe(true)
  })

  it('canonicalizes set selections and detects meaningful authoring data', () => {
    const empty = createEmptyScenarioSnapshot()
    const snapshot = createScenarioSnapshot({
      ...empty,
      autoSortText: 'HR: 140',
      patientInformation: {
        ...empty.patientInformation,
        selected: {
          sample: new Set(['M', 'A']),
          opqrst: new Set(['T', 'O']),
        },
      },
      patientPhysical: {
        findings: { 'front-chest': 'Tenderness' },
        selected: new Set(['front-chest']),
      },
    })

    expect(snapshot.patientInformation.selected.sample).toEqual(['A', 'M'])
    expect(snapshot.patientInformation.selected.opqrst).toEqual(['O', 'T'])
    expect(hasMeaningfulScenarioContent(snapshot)).toBe(true)
    expect(scenarioSnapshotsEqual(snapshot, { ...snapshot, autoSortText: '' })).toBe(false)
  })

  it('normalizes valid JSON and excludes runtime-only fields', () => {
    const input = {
      ...createEmptyScenarioSnapshot(),
      cprMode: 'weak',
      dispatch: {
        minutes: 2.9,
        seconds: 90,
        originAddress: 'Station 1',
        armed: true,
        startedAt: 123,
      },
      patientPhysical: {
        selected: ['front-chest', 'front-chest'],
        findings: { 'front-chest': 'Tenderness', invalid: 123 },
        activeIconGroup: 'pulse',
      },
    }

    const snapshot = normalizeScenarioSnapshot(input)

    expect(snapshot).not.toBeNull()
    expect(snapshot?.dispatch).toEqual({
      minutes: 2,
      seconds: 59,
      originAddress: 'Station 1',
    })
    expect(snapshot?.patientPhysical.selected).toEqual(['front-chest'])
    expect(snapshot?.patientPhysical.findings).toEqual({ 'front-chest': 'Tenderness' })
    expect(snapshot).not.toHaveProperty('cprMode')
    expect(snapshot?.dispatch).not.toHaveProperty('armed')
    expect(snapshot?.patientPhysical).not.toHaveProperty('activeIconGroup')
  })

  it('treats Wagami Z alone as meaningful scenario content', () => {
    const snapshot = createEmptyScenarioSnapshot()
    snapshot.defibrillatorModel = 'wagamiZ'

    expect(hasMeaningfulScenarioContent(snapshot)).toBe(true)
  })

  it('defaults legacy version-one snapshots without a model to Wagami X', () => {
    const legacy = createEmptyScenarioSnapshot() as Partial<ReturnType<
      typeof createEmptyScenarioSnapshot
    >>
    delete legacy.defibrillatorModel

    expect(normalizeScenarioSnapshot(legacy)?.defibrillatorModel).toBe('wagamiX')
  })

  it('round-trips a Wagami Z scenario selection', () => {
    const input = createEmptyScenarioSnapshot()
    input.defibrillatorModel = 'wagamiZ'

    expect(normalizeScenarioSnapshot(input)?.defibrillatorModel).toBe('wagamiZ')
  })

  it('normalizes scenario VF and VT values and activates FC', () => {
    const vf = createEmptyScenarioSnapshot()
    vf.monitor.draft.hr = 70
    vf.monitor.draft.rhythm = 'vf'
    const normalizedVf = normalizeScenarioSnapshot(vf)
    expect(normalizedVf?.monitor.draft.hr).toBe(190)
    expect(normalizedVf?.monitor.draftVitalActive.hr).toBe(true)

    const vt = createEmptyScenarioSnapshot()
    vt.monitor.draft.hr = 70
    vt.monitor.draft.rhythm = 'vt'
    const normalizedVt = normalizeScenarioSnapshot(vt)
    expect(normalizedVt?.monitor.draft.hr).toBe(220)
    expect(normalizedVt?.monitor.draftVitalActive.hr).toBe(true)
  })

  it('rejects unsupported or malformed snapshots', () => {
    expect(normalizeScenarioSnapshot({ version: 2 })).toBeNull()
    expect(normalizeScenarioSnapshot({ version: 1, monitor: null })).toBeNull()
    expect(normalizeScenarioSnapshot(null)).toBeNull()
  })
})
