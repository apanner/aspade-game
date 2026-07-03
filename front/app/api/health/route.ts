import { NextRequest, NextResponse } from 'next/server'
import { getSmartBackendUrl } from '../../../lib/backend-config'

export async function GET(request: NextRequest) {
  try {
    // Proxy to backend (server-side, no mixed content issues)
    const backendUrl = await getSmartBackendUrl()
    const backendApiUrl = backendUrl 
      ? `${backendUrl}/api/health`
      : `http://backend:3001/api/health`
    
    console.log(`🔗 Proxying health check request to backend: ${backendApiUrl}`)
    
    const response = await fetch(backendApiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000)
    })
    
    if (!response.ok) {
      return NextResponse.json(
        {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: 'Backend health check failed'
        },
        { status: 503 }
      )
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Service health check failed'
      },
      { status: 503 }
    )
  }
}
