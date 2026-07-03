import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request)
  
  if (!auth.authorized) {
    return NextResponse.json({ 
      error: auth.error || 'Unauthorized',
      cookies: Array.from(request.cookies.getAll()).map(cookie => ({
        name: cookie.name,
        value: cookie.value ? '***' : 'none'
      }))
    }, { status: 401 })
  }

  return NextResponse.json({ 
    success: true, 
    message: 'Admin authentication working',
    timestamp: new Date().toISOString()
  })
}
