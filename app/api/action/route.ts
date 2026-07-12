import { NextRequest, NextResponse } from 'next/server'
import { getApiUrl } from '../../../lib/backend-config'
import { processGameAction } from '../../../lib/process-game-action'
import { loadGameFromFile, fixGameDataStructure } from '../../../lib/game-utils'

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body = await request.json()
    const { gameId, playerId, action, data } = body

    if (!gameId || !playerId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields', required: ['gameId', 'playerId', 'action'] },
        { status: 400 }
      )
    }

    let requestBody = body
    if (action === 'approveTricks' && body.game) {
      requestBody = { ...body, game: fixGameDataStructure(body.game) }
    }

    const normalizedId = gameId.toUpperCase()
    const localGame = await loadGameFromFile(normalizedId)

    if (localGame) {
      const result = await processGameAction(
        normalizedId,
        playerId,
        action,
        { ...data, game: requestBody.game }
      )

      if (!result.ok) {
        return NextResponse.json({ error: result.error, ...result.extra }, { status: result.status })
      }

      console.log(`✅ Action ${action} processed locally in ${Date.now() - startTime}ms`)
      return NextResponse.json({ success: true, game: result.game, events: result.events })
    }

    const actionEndpoint = getApiUrl('/api/action')
    const response = await fetch(actionEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    })

    const result = await response.json()
    if (!response.ok) {
      return NextResponse.json(result, { status: response.status })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Action error:', error)
    return NextResponse.json({ error: 'Failed to process action' }, { status: 500 })
  }
}
