import { NextResponse } from 'next/server'

import { requireScenarioLibraryAccess } from '@/server/scenarios/access'
import { scenarioJsonError } from '@/server/scenarios/http'
import { reorderScenarioFolders } from '@/server/scenarios/service'

export async function PATCH(request: Request) {
  try {
    const account = await requireScenarioLibraryAccess(request)
    const body = await request.json() as { folderIds?: unknown; libraryKind?: unknown }
    if (
      !Array.isArray(body.folderIds) ||
      body.folderIds.some((folderId) => typeof folderId !== 'string') ||
      (body.libraryKind !== 'personal' && body.libraryKind !== 'template')
    ) {
      return NextResponse.json(
        { error: 'folderIds and a valid libraryKind are required' },
        { status: 400 },
      )
    }
    return NextResponse.json({
      folders: await reorderScenarioFolders(account, body.libraryKind, body.folderIds),
    })
  } catch (error) {
    return scenarioJsonError(error)
  }
}
