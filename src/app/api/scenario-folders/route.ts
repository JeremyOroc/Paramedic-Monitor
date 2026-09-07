import { NextResponse } from 'next/server'

import { requireScenarioLibraryAccess } from '@/server/scenarios/access'
import { scenarioJsonError } from '@/server/scenarios/http'
import {
  createScenarioFolder,
  listScenarioFolders,
} from '@/server/scenarios/service'

export async function GET(request: Request) {
  try {
    const account = await requireScenarioLibraryAccess(request)
    return NextResponse.json({
      folders: await listScenarioFolders(account),
      role: account.role,
    })
  } catch (error) {
    return scenarioJsonError(error)
  }
}

export async function POST(request: Request) {
  try {
    const account = await requireScenarioLibraryAccess(request)
    const body = await request.json() as { name?: unknown; libraryKind?: unknown }
    if (
      typeof body.name !== 'string' ||
      (body.libraryKind !== 'personal' && body.libraryKind !== 'template')
    ) {
      return NextResponse.json(
        { error: 'Folder name and a valid libraryKind are required' },
        { status: 400 },
      )
    }
    return NextResponse.json(
      { folder: await createScenarioFolder(account, body.name, body.libraryKind) },
      { status: 201 },
    )
  } catch (error) {
    return scenarioJsonError(error)
  }
}
