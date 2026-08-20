import { NextResponse } from 'next/server'

import { requireScenarioLibraryAccess } from '@/server/scenarios/access'
import { scenarioJsonError } from '@/server/scenarios/http'
import { reorderSavedScenarios } from '@/server/scenarios/service'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    await requireScenarioLibraryAccess(request)
    const { id } = await params
    const body = await request.json() as { scenarioIds?: unknown }
    if (
      !Array.isArray(body.scenarioIds) ||
      !body.scenarioIds.every((scenarioId) => typeof scenarioId === 'string')
    ) {
      return NextResponse.json(
        { error: 'scenarioIds must be an array of strings' },
        { status: 400 },
      )
    }

    return NextResponse.json({
      scenarios: await reorderSavedScenarios(id, body.scenarioIds),
    })
  } catch (error) {
    return scenarioJsonError(error)
  }
}
