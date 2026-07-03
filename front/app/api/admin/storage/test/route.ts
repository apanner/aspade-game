import { NextRequest, NextResponse } from 'next/server'
import { smartFetch, getConnectionStatus } from '../../../../../lib/backend-config'

export async function POST(request: NextRequest) {
  try {
    // Use smart connection to test storage on backend
    console.log('🔍 Storage test using connection:', getConnectionStatus())
    
    const response = await smartFetch('/api/admin/storage/test', {
      method: 'POST',
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
    console.error('Storage test error:', error)
    return NextResponse.json(
      { error: 'Failed to test storage connection' },
      { status: 500 }
    )
  }
} 