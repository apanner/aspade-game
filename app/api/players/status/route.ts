import { NextRequest, NextResponse } from 'next/server'
import { loadPlayerFromFile, savePlayerToFile } from '../../../../lib/game-utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { playerId, isOnline, lastSeen } = body ?? {}

    if (!playerId) {
      return NextResponse.json({ error: 'playerId is required' }, { status: 400 })
    }

    const existingPlayer = await loadPlayerFromFile(playerId)
    if (!existingPlayer) {
      return NextResponse.json({
        success: true,
        message: 'Player not found - no status update needed',
        player: null,
      })
    }

    const updatedPlayer = {
      ...existingPlayer,
      isOnline: isOnline !== false,
      lastSeen: lastSeen || Date.now(),
    }

    await savePlayerToFile(playerId, updatedPlayer)

    return NextResponse.json({ success: true, player: updatedPlayer })
  } catch (error) {
    console.error('Error updating player status:', error)
    return NextResponse.json({ error: 'Failed to update player status' }, { status: 500 })
  }
}
