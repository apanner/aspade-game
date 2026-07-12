import { NextRequest, NextResponse } from 'next/server'
import { getSmartBackendUrl } from '../../../../lib/backend-config'

export async function GET(request: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  try {
    const { gameId } = await params
    
    if (!gameId) {
      return NextResponse.json({ error: 'Game ID is required' }, { status: 400 })
    }
    
    // Proxy to backend (server-side, no mixed content issues)
    const backendUrl = await getSmartBackendUrl()
    const backendApiUrl = backendUrl 
      ? `${backendUrl}/api/game/${gameId}`
      : `http://backend:3001/api/game/${gameId}`
    
    console.log(`🔗 Proxying game check request to backend: ${backendApiUrl}`)
    
    const response = await fetch(backendApiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(30000)
    })
    
    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ exists: false, error: 'Game not found' }, { status: 404 })
      }
      const errorData = await response.json().catch(() => ({ error: 'Failed to check game' }))
      return NextResponse.json(errorData, { status: response.status })
    }
    
    const gameData = await response.json()
    
    // Return basic game info (no sensitive data)
    return NextResponse.json({
      exists: true,
      gameId: gameData.id,
      code: gameData.code,
      title: gameData.title,
      status: gameData.status,
      hostName: gameData.hostName,
      maxPlayers: gameData.maxPlayers,
      currentPlayers: Object.keys(gameData.players || {}).length
    })
  } catch (error) {
    console.error('Error checking game:', error)
    return NextResponse.json({ error: 'Failed to check game' }, { status: 500 })
  }
}
