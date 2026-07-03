import { NextRequest, NextResponse } from 'next/server'
import { getBackendUrl } from '../../../../../lib/backend-config'

export async function GET(request: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params
    
    // Use centralized backend configuration
    const backendUrl = getBackendUrl()
    const response = await fetch(`${backendUrl}/api/players/${encodeURIComponent(name)}/profile`, {
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
    console.error('Error getting player profile:', error)
    return NextResponse.json(
      { error: 'Failed to get player profile' },
      { status: 500 }
    )
  }
} 