import { NextRequest, NextResponse } from 'next/server'
import { getSmartBackendUrl } from '@/lib/backend-config'

export async function GET(request: NextRequest) {
  try {
    // Get storage configuration from backend (Docker volumes = local)
    const backendUrl = await getSmartBackendUrl()
    const backendApiUrl = backendUrl 
      ? `${backendUrl}/api/admin/storage/config`
      : 'http://backend:3001/api/admin/storage/config'
    
    const backendResponse = await fetch(backendApiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!backendResponse.ok) {
      throw new Error(`Backend responded with ${backendResponse.status}`)
    }
    
    const backendData = await backendResponse.json()
    
    // Return backend config (should show 'local' provider for Docker volumes)
    return NextResponse.json({
      success: true,
      config: backendData.config || { provider: 'local' },
      provider: backendData.provider || 'local',
      connected: backendData.connected !== false,
      supportedProviders: ['local', 's3', 'supabase'],
      message: `Storage provider: ${backendData.provider || 'local'} (Docker volumes)`
    })
  } catch (error) {
    console.error('Storage config error:', error)
    return NextResponse.json(
      { error: 'Failed to load storage configuration' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const newConfig = await request.json()
    
    if (!newConfig.provider) {
      return NextResponse.json({ error: 'Provider is required' }, { status: 400 })
    }
    
    // Call backend to save config (backend manages storage config)
    const backendUrl = await getSmartBackendUrl()
    const backendApiUrl = backendUrl 
      ? `${backendUrl}/api/admin/storage/config`
      : 'http://backend:3001/api/admin/storage/config'
    
    const backendResponse = await fetch(backendApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newConfig),
    })
    
    if (!backendResponse.ok) {
      throw new Error(`Backend responded with ${backendResponse.status}`)
    }
    
    const result = await backendResponse.json()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Storage config update error:', error)
    return NextResponse.json(
      { error: 'Failed to update storage configuration' },
      { status: 500 }
    )
  }
} 