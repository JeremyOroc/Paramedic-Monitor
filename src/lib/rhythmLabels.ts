import type { Rhythm } from '@/types/vitals'

/**
 * Display names for each rhythm. Shared by the instructor's rhythm selector and
 * the evaluation report, which have to agree: a debrief that calls a rhythm
 * something the console never did is a debrief the evaluator has to translate.
 */
export const RHYTHM_LABELS: Record<Rhythm, string> = {
  off: 'Off',
  nsr: 'NSR',
  vf: 'VF',
  vt: 'VT',
  torsades: 'Torsades',
  asystole: 'Asystole',
  'first-degree': '1st Degree',
  'second-degree-type-1': '2nd Degree Type 1',
  'second-degree-type-2': '2nd Degree Type 2',
  'third-degree': '3rd Degree',
  'anterior-mi': 'Anterior MI',
  'inferior-mi': 'Inferior MI',
}
