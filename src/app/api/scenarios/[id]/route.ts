import { NextResponse } from 'next/server'

import { normalizeScenarioSnapshot } from '@/lib/scenarioSnapshot'
import { requireScenarioLibraryAccess } from '@/server/scenarios/access'
import { scenarioJsonError } from '@/server/scenarios/http'
import {
  deleteSavedScenario,
  getSavedScenario,
  updateSavedScenario,
} from '@/server/scenarios/service'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: RouteContext) {
  try {
    await requireScenarioLibraryAccess(request)
    const { id } = await params
    return NextResponse.json({ scenario: await getSavedScenario(id) })
  } catch (error) {
    return scenarioJsonError(error)
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    await requireScenarioLibraryAccess(request)
    const { id } = await params
    const body = await request.json() as {
      folderId?: unknown
      title?: unknown
      snapshot?: unknown
    }
    const changes: Parameters<typeof updateSavedScenario>[1] = {}
    if (body.folderId !== undefined) {
      if (typeof body.folderId !== 'string') {
        return NextResponse.json({ error: 'folderId must be a string' }, { status: 400 })
      }
      changes.folderId = body.folderId
    }
    if (body.title !== undefined) {
      if (typeof body.title !== 'string') {
        return NextResponse.json({ error: 'title must be a string' }, { status: 400 })
      }
      changes.title = body.title
    }
    if (body.snapshot !== undefined) {
      const snapshot = normalizeScenarioSnapshot(body.snapshot)
      if (!snapshot) {
        return NextResponse.json({ error: 'snapshot is invalid' }, { status: 400 })
      }
      changes.snapshot = snapshot
    }
    return NextResponse.json({ scenario: await updateSavedScenario(id, changes) })
  } catch (error) {
    return scenarioJsonError(error)
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    await requireScenarioLibraryAccess(request)
    const { id } = await params
    await deleteSavedScenario(id)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return scenarioJsonError(error)
  }
}
