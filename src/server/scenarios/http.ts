import { NextResponse } from 'next/server'

import { ScenarioLibraryError } from '@/server/scenarios/service'

export function scenarioJsonError(error: unknown) {
  if (error instanceof ScenarioLibraryError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  const message = error instanceof Error ? error.message : 'Unexpected scenario library error'
  return NextResponse.json({ error: message }, { status: 500 })
}
