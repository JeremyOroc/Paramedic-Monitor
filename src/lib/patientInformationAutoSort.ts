export type PatientInformationChecklist = 'sample' | 'opqrst'

export type PatientInformationTextState = Record<
  PatientInformationChecklist,
  Record<string, string>
>

export const EMPTY_PATIENT_INFORMATION_TEXT = (): PatientInformationTextState => ({
  sample: {
    S: '',
    A: '',
    M: '',
    P: '',
    L: '',
    E: '',
  },
  opqrst: {
    O: '',
    P: '',
    Q: '',
    R: '',
    S: '',
    T: '',
  },
})

function getTargetForLetter(
  letter: string,
  repeatedCounts: Record<'S' | 'P', number>,
): { checklist: PatientInformationChecklist; letter: string } | null {
  if (letter === 'S' || letter === 'P') {
    repeatedCounts[letter] += 1
    if (repeatedCounts[letter] === 1) return { checklist: 'sample', letter }
    if (repeatedCounts[letter] === 2) return { checklist: 'opqrst', letter }
    return null
  }

  if (['A', 'M', 'L', 'E'].includes(letter)) return { checklist: 'sample', letter }
  if (['O', 'Q', 'R', 'T'].includes(letter)) return { checklist: 'opqrst', letter }
  return null
}

export function parsePatientInformationAutoSort(text: string): PatientInformationTextState {
  const parsed = EMPTY_PATIENT_INFORMATION_TEXT()
  const repeatedCounts = { S: 0, P: 0 }

  for (const rawLine of text.split(/\r?\n/)) {
    const match = /^\s*([A-Za-z])\s*:\s*(.*)\s*$/.exec(rawLine)
    if (!match) continue

    const letter = match[1].toUpperCase()
    const target = getTargetForLetter(letter, repeatedCounts)
    if (!target) continue

    parsed[target.checklist][target.letter] = match[2].trim()
  }

  return parsed
}
