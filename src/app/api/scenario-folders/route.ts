import { NextResponse } from 'next/server'

import { requireScenarioLibraryAccess } from '@/server/scenarios/access'
import { scenarioJsonError } from '@/server/scenarios/http'
import {
  createScenarioFolder,
  listScenarioFolders,
} from '@/server/scenarios/service'

export async function GET(request: Request) {
  try {
    await requireScenarioLibraryAccess(request)
    return NextResponse.json({ folders: await listScenarioFolders() })
  } catch (error) {
    return scenarioJsonError(error)
  }
}

export async function POST(request: Request) {
  try {
    await requireScenarioLibraryAccess(request)
    const body = await request.json() as { name?: unknown }
    if (typeof body.name !== 'string') {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 })
    }
    return NextResponse.json({ folder: await createScenarioFolder(body.name) }, { status: 201 })
  } catch (error) {
    return scenarioJsonError(error)
  }
}
