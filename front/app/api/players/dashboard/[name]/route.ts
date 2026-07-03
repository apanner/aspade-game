import { NextRequest, NextResponse } from 'next/server'
import { getSmartBackendUrl } from '../../../../../lib/backend-config'

export async function GET(request: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params
    
    if (!name) {
      return NextResponse.json({ error: 'Player name is required' }, { status: 400 })
    }
    
    const decodedName = decodeURIComponent(name)
    
    // Call backend API directly (backend has access to Docker volume)
    const backendUrl = await getSmartBackendUrl()
    const backendApiUrl = backendUrl ? `${backendUrl}/api/players/${encodeURIComponent(decodedName)}/dashboard` : `http://backend:3001/api/players/${encodeURIComponent(decodedName)}/dashboard`
    
    console.log(`📊 Fetching dashboard from backend: ${backendApiUrl}`)
    
    const response = await fetch(backendApiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'Player not found' }, { status: 404 })
        }
      throw new Error(`Backend responded with ${response.status}`)
    }
    
    const data = await response.json()
    console.log(`✅ Dashboard data received from backend for ${decodedName}`)
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error getting player dashboard:', error)
    return NextResponse.json(
      { error: 'Failed to get player dashboard' },
      { status: 500 }
    )
  }
} 