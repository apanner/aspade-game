import { NextRequest, NextResponse } from 'next/server'
import { getSmartBackendUrl } from '../../../lib/backend-config'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    // Proxy to backend (server-side, no mixed content issues)
    const backendUrl = await getSmartBackendUrl()
    const backendApiUrl = backendUrl 
      ? `${backendUrl}/api/history?limit=${limit}&offset=${offset}`
      : `http://backend:3001/api/history?limit=${limit}&offset=${offset}`
    
    console.log(`🔗 Proxying history request to backend: ${backendApiUrl}`)
    
    const response = await fetch(backendApiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(30000)
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to get history' }))
      return NextResponse.json(errorData, { status: response.status })
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error getting global history:', error)
    return NextResponse.json(
      { error: 'Failed to get global history' },
      { status: 500 }
    )
  }
}
