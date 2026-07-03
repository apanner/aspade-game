import { NextRequest, NextResponse } from 'next/server'
import { getSmartBackendUrl } from '../../../lib/backend-config'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const type = searchParams.get('type') || 'individual'
    
    // Proxy to backend (server-side, no mixed content issues)
    const backendUrl = await getSmartBackendUrl()
    const backendApiUrl = backendUrl 
      ? `${backendUrl}/api/leaderboard?limit=${limit}&type=${type}`
      : `http://backend:3001/api/leaderboard?limit=${limit}&type=${type}`
    
    console.log(`🔗 Proxying leaderboard request to backend: ${backendApiUrl}`)
    
    const response = await fetch(backendApiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(30000)
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to get leaderboard' }))
      return NextResponse.json(errorData, { status: response.status })
    }
    
    const data = await response.json()
    
    // Add cache-busting headers
    const nextResponse = NextResponse.json(data)
    nextResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    nextResponse.headers.set('Pragma', 'no-cache')
    nextResponse.headers.set('Expires', '0')
    
    return nextResponse
  } catch (error) {
    console.error('Error getting leaderboard:', error)
    return NextResponse.json(
      { error: 'Failed to get leaderboard' },
      { status: 500 }
    )
  }
}
