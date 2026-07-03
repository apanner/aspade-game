import { NextRequest, NextResponse } from 'next/server'
import { getSmartBackendUrl } from '../../../../lib/backend-config'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params
    
    console.log(`🔍 Loading game ${gameId} via backend proxy`)
    
    // Proxy to backend (server-side, no mixed content issues)
    // Use /api/game/:gameId endpoint (not /api/game-detail) to match client expectations
    const backendUrl = await getSmartBackendUrl()
    const backendApiUrl = backendUrl 
      ? `${backendUrl}/api/game/${gameId}`
      : `http://backend:3001/api/game/${gameId}`
    
    console.log(`🌐 Proxying to backend: ${backendApiUrl}`)
    
    const response = await fetch(backendApiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(30000)
    })
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`❌ Game ${gameId} not found on backend`)
        return NextResponse.json({ error: 'Game not found' }, { status: 404 })
      }
      console.error(`❌ Backend error: ${response.status}`)
      throw new Error(`Backend responded with ${response.status}`)
    }
    
    const gameData = await response.json()
    
    // Backend /api/game/:gameId returns game directly, not wrapped in { game: ... }
    console.log(`✅ Game ${gameId} loaded successfully`)
    return NextResponse.json(gameData)
  } catch (error) {
    console.error('Error getting game:', error)
    return NextResponse.json(
      { error: 'Failed to get game' },
      { status: 500 }
    )
  }
} 