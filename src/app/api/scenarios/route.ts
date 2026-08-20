import { NextResponse } from 'next/server'

import { normalizeScenarioSnapshot } from '@/lib/scenarioSnapshot'
import { requireScenarioLibraryAccess } from '@/server/scenarios/access'
import { scenarioJsonError } from '@/server/scenarios/http'
import {
  createSavedScenario,
  listSavedScenarios,
} from '@/server/scenarios/service'

export async function GET(request: Request) {
  try {
    await requireScenarioLibraryAccess(request)
    const folderId = new URL(request.url).searchParams.get('folderId')
    if (!folderId) {
      return NextResponse.json({ error: 'folderId is required' }, { status: 400 })
    }
    return NextResponse.json({ scenarios: await listSavedScenarios(folderId) })
  } catch (error) {
    return scenarioJsonError(error)
  }
}

export async function POST(request: Request) {
  try {
    await requireScenarioLibraryAccess(request)
    const body = await request.json() as {
      folderId?: unknown
      autoCreateFolder?: unknown
      title?: unknown
      snapshot?: unknown
    }
    const snapshot = normalizeScenarioSnapshot(body.snapshot)
    const selectedFolder = typeof body.folderId === 'string' && body.autoCreateFolder !== true
    const autoCreateFolder = body.folderId === undefined && body.autoCreateFolder === true
    if (
      (!selectedFolder && !autoCreateFolder) ||
      typeof body.title !== 'string' ||
      !snapshot
    ) {
      return NextResponse.json(
        { error: 'Valid folder selection, title, and snapshot are required' },
        { status: 400 },
      )
    }
    return NextResponse.json(
      {
        scenario: await createSavedScenario(
          selectedFolder ? body.folderId as string : null,
          body.title,
          snapshot,
        ),
      },
      { status: 201 },
    )
  } catch (error) {
    return scenarioJsonError(error)
  }
}
