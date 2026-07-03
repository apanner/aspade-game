import { NextRequest } from 'next/server'

const ADMIN_PASSWORD = 'asd123'

export function isAdmin(req: NextRequest): boolean {
  // Check for admin token in headers
  const adminToken = req.headers.get('x-admin-token')
  if (adminToken === ADMIN_PASSWORD) {
    console.log('🔐 Admin auth: Valid header token')
    return true
  }

  // Check for admin token in cookies (session-based)
  const cookieToken = req.cookies.get('admin_session')?.value
  console.log('🍪 Admin auth: Cookie check:', { 
    hasCookie: !!req.cookies.get('admin_session'),
    cookieValue: cookieToken ? '***' : 'none',
    isValid: cookieToken === ADMIN_PASSWORD
  })
  
  if (cookieToken === ADMIN_PASSWORD) {
    console.log('🔐 Admin auth: Valid session cookie')
    return true
  }

  console.log('❌ Admin auth: No valid authentication found')
  return false
}

export function requireAdmin(req: NextRequest): { authorized: boolean; error?: string } {
  const isAuthorized = isAdmin(req)
  if (!isAuthorized) {
    return { authorized: false, error: 'Unauthorized - Invalid admin password' }
  }

  return { authorized: true }
}
