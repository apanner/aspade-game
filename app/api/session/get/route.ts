import { NextRequest, NextResponse } from 'next/server'
import { storage } from '../../../../lib/storage-gateway'

interface SessionData {
  id?: string
  sessionId?: string
  playerId?: string
  playerName?: string
  gameId?: string
  currentGameId?: string
  lastAccessed?: number
  [key: string]: unknown
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId, playerId } = await request.json()

    if (!sessionId && !playerId) {
      return NextResponse.json(
        { error: 'Session ID or Player ID is required' },
        { status: 400 }
      )
    }

    let sessionData: SessionData | null = null

    if (sessionId) {
      sessionData = (await storage.loadFile(`sessions/${sessionId}.json`)) as SessionData | null
    } else if (playerId) {
      const files = await storage.listFiles('sessions/')
      const playerSessions = files.filter((file) => file.includes(`session_${playerId}_`))
      const mostRecent = playerSessions.sort().pop()
      if (mostRecent) {
        sessionData = (await storage.loadFile(mostRecent)) as SessionData | null
      }
      if (!sessionData) {
        sessionData = (await storage.loadFile(`sessions/session_${playerId}.json`)) as SessionData | null
      }
    }

    if (!sessionData) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 })
    }

    sessionData.lastAccessed = Date.now()
    const key = sessionData.sessionId
      ? `sessions/${sessionData.sessionId}.json`
      : `sessions/session_${playerId}.json`
    await storage.saveFile(key, sessionData)

    return NextResponse.json({
      success: true,
      session: sessionData,
      message: 'Session retrieved successfully',
    })
  } catch (error) {
    console.error('Session get error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
