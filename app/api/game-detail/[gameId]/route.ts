import { NextRequest, NextResponse } from 'next/server'
import { getSmartBackendUrl } from '../../../../lib/backend-config'

export async function GET(request: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  try {
    const { gameId } = await params
    
    console.log(`🔍 Loading game details for: ${gameId}`)
    
    // Use smart backend URL discovery (handles Docker network properly)
    const backendUrl = await getSmartBackendUrl()
    // Use Docker internal network URL for server-side requests (no mixed content issues)
    const backendApiUrl = backendUrl 
      ? `${backendUrl}/api/game-detail/${gameId}`
      : `http://backend:3001/api/game-detail/${gameId}`
    
    console.log(`🌐 Proxying to backend: ${backendApiUrl}`)
    
    const response = await fetch(backendApiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Set a longer timeout for this request
      signal: AbortSignal.timeout(30000) // 30 seconds timeout
    })
    
    console.log(`📡 Response status: ${response.status}`)
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`❌ Game not found: ${gameId}`)
        return NextResponse.json(
          { error: 'Game not found' },
          { status: 404 }
        )
      }
      throw new Error(`Backend responded with ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    console.log(`✅ Game loaded successfully: ${gameId}`)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error getting game detail:', error)
    return NextResponse.json(
      { error: 'Failed to get game detail' },
      { status: 500 }
    )
  }
}