import { NextRequest, NextResponse } from 'next/server'
import { storage } from '../../../../lib/storage-gateway'

export async function POST(request: NextRequest) {
  try {
    const { gameId, playerId, playerName, timestamp } = await request.json()

    if (!gameId || !playerId || !playerName) {
      return NextResponse.json({ error: 'Missing required session data' }, { status: 400 })
    }

    const sessionId = `session_${playerId}`
    const sessionKey = `sessions/${sessionId}.json`

    let existingSession: Record<string, unknown> | null = null
    try {
      existingSession = (await storage.loadFile(sessionKey)) as Record<string, unknown> | null
    } catch {
      existingSession = null
    }

    const sessionData = {
      sessionId,
      gameId,
      playerId,
      playerName,
      timestamp: timestamp || Date.now(),
      createdAt: existingSession?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    }

    const success = await storage.saveFile(sessionKey, sessionData)
    if (!success) {
      return NextResponse.json({ error: 'Failed to save session' }, { status: 500 })
    }

    return NextResponse.json({ success: true, session: sessionData })
  } catch (error) {
    console.error('Session save error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
