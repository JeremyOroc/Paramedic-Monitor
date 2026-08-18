import { NextResponse } from 'next/server'

import { requireScenarioLibraryAccess } from '@/server/scenarios/access'
import { scenarioJsonError } from '@/server/scenarios/http'
import {
  deleteScenarioFolder,
  renameScenarioFolder,
} from '@/server/scenarios/service'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    await requireScenarioLibraryAccess(request)
    const { id } = await params
    const body = await request.json() as { name?: unknown }
    if (typeof body.name !== 'string') {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 })
    }
    return NextResponse.json({ folder: await renameScenarioFolder(id, body.name) })
  } catch (error) {
    return scenarioJsonError(error)
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    await requireScenarioLibraryAccess(request)
    const { id } = await params
    return NextResponse.json({ generalFolderId: await deleteScenarioFolder(id) })
  } catch (error) {
    return scenarioJsonError(error)
  }
}
