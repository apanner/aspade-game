import { NextRequest, NextResponse } from 'next/server'
import { getSmartBackendUrl } from '../../../../lib/backend-config'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Proxy to backend (server-side, no mixed content issues)
    const backendUrl = await getSmartBackendUrl()
    const backendApiUrl = backendUrl 
      ? `${backendUrl}/api/session/get`
      : `http://backend:3001/api/session/get`
    
    console.log(`🔗 Proxying session get request to backend: ${backendApiUrl}`)
    
    const response = await fetch(backendApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000)
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to get session' }))
      return NextResponse.json(errorData, { status: response.status })
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Session get error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
