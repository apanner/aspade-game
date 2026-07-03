import { NextRequest, NextResponse } from 'next/server'
import { getSmartBackendUrl } from '../../../../lib/backend-config'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    
    // Use centralized backend configuration with smart discovery
    const backendUrl = await getSmartBackendUrl()
    const backendApiUrl = backendUrl ? `${backendUrl}/api/players/suggestions?q=${encodeURIComponent(query)}` : `http://backend:3001/api/players/suggestions?q=${encodeURIComponent(query)}`
    const response = await fetch(backendApiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`)
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error getting player suggestions:', error)
    return NextResponse.json(
      { error: 'Failed to get player suggestions' },
      { status: 500 }
    )
  }
} 