import { NextRequest, NextResponse } from 'next/server'
import { getSmartBackendUrl } from '@/lib/backend-config'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request)
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
  }

  try {
    // Proxy to backend (server-side, no mixed content issues)
    const backendUrl = await getSmartBackendUrl()
    const backendApiUrl = backendUrl 
      ? `${backendUrl}/api/admin/games`
      : `http://backend:3001/api/admin/games`
    
    console.log(`🔗 Proxying admin games request to backend: ${backendApiUrl}`)
    
    const response = await fetch(backendApiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(30000)
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to get admin games' }))
      return NextResponse.json(errorData, { status: response.status })
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error getting admin games:', error)
    return NextResponse.json(
      { error: 'Failed to get admin games', games: [], total: 0 },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const auth = requireAdmin(request)
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    
    // Proxy to backend (server-side, no mixed content issues)
    const backendUrl = await getSmartBackendUrl()
    const backendApiUrl = backendUrl 
      ? `${backendUrl}/api/admin/games`
      : `http://backend:3001/api/admin/games`
    
    console.log(`🔗 Proxying admin games delete request to backend: ${backendApiUrl}`)
    
    const response = await fetch(backendApiUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000)
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to delete admin games' }))
      return NextResponse.json(errorData, { status: response.status })
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error deleting admin games:', error)
    return NextResponse.json(
      { error: 'Failed to delete admin games' },
      { status: 500 }
    )
  }
}
