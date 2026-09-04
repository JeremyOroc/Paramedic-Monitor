import { NextResponse } from 'next/server'

import { requireScenarioLibraryAccess } from '@/server/scenarios/access'
import { scenarioJsonError } from '@/server/scenarios/http'
import { reorderScenarioFolders } from '@/server/scenarios/service'

export async function PATCH(request: Request) {
  try {
    await requireScenarioLibraryAccess(request)
    const body = await request.json() as { folderIds?: unknown }
    if (
      !Array.isArray(body.folderIds) ||
      body.folderIds.some((folderId) => typeof folderId !== 'string')
    ) {
      return NextResponse.json({ error: 'folderIds must be an array of IDs' }, { status: 400 })
    }
    return NextResponse.json({
      folders: await reorderScenarioFolders(body.folderIds),
    })
  } catch (error) {
    return scenarioJsonError(error)
  }
}
