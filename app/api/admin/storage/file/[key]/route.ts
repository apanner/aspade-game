import { NextRequest, NextResponse } from 'next/server'
import { getSmartBackendUrl } from '@/lib/backend-config'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params
    const decodedKey = decodeURIComponent(key)
    
    console.log(`📝 Storage Admin: Loading file ${decodedKey} from backend`)
    
    // Call backend API to get file from Docker volumes
    const backendUrl = await getSmartBackendUrl()
    const backendApiUrl = backendUrl 
      ? `${backendUrl}/api/admin/storage/file/${encodeURIComponent(decodedKey)}`
      : `http://backend:3001/api/admin/storage/file/${encodeURIComponent(decodedKey)}`
    
    const backendResponse = await fetch(backendApiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!backendResponse.ok) {
      if (backendResponse.status === 404) {
        return NextResponse.json(
          { error: 'File not found' },
          { status: 404 }
        )
      }
      throw new Error(`Backend responded with ${backendResponse.status}`)
    }
    
    const fileContent = await backendResponse.json()
    console.log(`✅ Storage Admin: Loaded file ${decodedKey} from Docker volumes`)
    return NextResponse.json(fileContent)
    
  } catch (error) {
    console.error(`❌ Storage file view error for ${request.url}:`, error)
    return NextResponse.json(
      { error: 'Failed to view storage file' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params
    const decodedKey = decodeURIComponent(key)
    const body = await request.json()
    
    console.log(`💾 Storage Admin: Saving file ${decodedKey} to backend`)
    
    // Call backend API to save file to Docker volumes
    const backendUrl = await getSmartBackendUrl()
    const backendApiUrl = backendUrl 
      ? `${backendUrl}/api/admin/storage/file/${encodeURIComponent(decodedKey)}`
      : `http://backend:3001/api/admin/storage/file/${encodeURIComponent(decodedKey)}`
    
    const backendResponse = await fetch(backendApiUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    
    if (!backendResponse.ok) {
      throw new Error(`Backend responded with ${backendResponse.status}`)
    }
    
    const result = await backendResponse.json()
    console.log(`✅ Storage Admin: Saved file ${decodedKey} to Docker volumes`)
    return NextResponse.json(result)
    
  } catch (error) {
    console.error(`❌ Storage file save error for ${request.url}:`, error)
    return NextResponse.json(
      { error: 'Failed to save storage file' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params
    const decodedKey = decodeURIComponent(key)
    
    console.log(`🗑️ Storage Admin: Deleting file ${decodedKey} from backend`)
    
    // Call backend API to delete file from Docker volumes
    const backendUrl = await getSmartBackendUrl()
    const backendApiUrl = backendUrl 
      ? `${backendUrl}/api/admin/storage/file/${encodeURIComponent(decodedKey)}`
      : `http://backend:3001/api/admin/storage/file/${encodeURIComponent(decodedKey)}`
    
    const backendResponse = await fetch(backendApiUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!backendResponse.ok) {
      if (backendResponse.status === 404) {
        return NextResponse.json(
          { error: 'File not found' },
          { status: 404 }
        )
      }
      throw new Error(`Backend responded with ${backendResponse.status}`)
    }
    
    const result = await backendResponse.json()
    console.log(`✅ Storage Admin: Deleted file ${decodedKey} from Docker volumes`)
    return NextResponse.json(result)
    
  } catch (error) {
    console.error(`❌ Storage file delete error for ${request.url}:`, error)
    return NextResponse.json(
      { error: 'Failed to delete storage file' },
      { status: 500 }
    )
  }
} 