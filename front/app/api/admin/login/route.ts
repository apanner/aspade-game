import { NextRequest, NextResponse } from 'next/server'

const ADMIN_PASSWORD = 'asd123'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { password } = body

    console.log('🔐 Admin login attempt:', { hasPassword: !!password })

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 })
    }

    if (password === ADMIN_PASSWORD) {
      console.log('✅ Admin login successful, setting session cookie')
      
      // Set secure session cookie
      const response = NextResponse.json({ 
        success: true, 
        message: 'Admin login successful' 
      })
      
      // Set HTTP-only cookie for security
      response.cookies.set('admin_session', ADMIN_PASSWORD, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', // Changed from 'strict' to 'lax' for better compatibility
        maxAge: 30 * 60, // 30 minutes in seconds
        path: '/',
        domain: undefined // Let browser set the domain automatically
      })
      
      console.log('🍪 Session cookie set successfully')
      return response
    } else {
      console.log('❌ Admin login failed: invalid password')
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }
  } catch (error) {
    console.error('❌ Admin login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
