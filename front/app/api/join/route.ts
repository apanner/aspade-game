import { NextRequest, NextResponse } from 'next/server'
import { getSmartBackendUrl } from '../../../lib/backend-config'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { code, playerName, team } = body
    
    if (!code || !playerName || !playerName.trim()) {
      return NextResponse.json({ error: 'Code and player name are required' }, { status: 400 })
    }

    // Proxy to backend (server-side, no mixed content issues)
    const backendUrl = await getSmartBackendUrl()
    const backendApiUrl = backendUrl 
      ? `${backendUrl}/api/join`
      : `http://backend:3001/api/join`
    
    console.log(`🔗 Proxying join request to backend: ${backendApiUrl}`)
    
    const response = await fetch(backendApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000)
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to join game' }))
      return NextResponse.json(errorData, { status: response.status })
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error joining game:', error)
    return NextResponse.json(
      { error: 'Failed to join game' },
      { status: 500 }
    )
  }
} 