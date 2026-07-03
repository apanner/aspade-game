import { NextRequest, NextResponse } from 'next/server'
import { getSmartBackendUrl } from '../../../../lib/backend-config'

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json()
    
    if (!name) {
      return NextResponse.json({ error: 'Player name is required' }, { status: 400 })
    }
    
    // Call backend API directly (backend has access to Docker volume)
    const backendUrl = await getSmartBackendUrl()
    const backendApiUrl = backendUrl ? `${backendUrl}/api/players/login` : `http://backend:3001/api/players/login`
    
    console.log(`🔐 Login request to backend: ${backendApiUrl}`)
    
    const response = await fetch(backendApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: errorData.error || 'Login failed' },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    console.log(`✅ Login successful for ${name}, active games: ${data.activeGames?.length || 0}`)
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 