import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const sessionData = await request.json();
    
    if (!sessionData.gameId || !sessionData.playerId || !sessionData.playerName) {
      return NextResponse.json({ error: 'Invalid session data' }, { status: 400 });
    }
    
    // Use Docker backend (NO RAILWAY)
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 
                      process.env.BACKEND_URL || 
                      'http://backend:3001'; // Docker network backend
    
    console.log('🔍 Saving session to backend:', backendUrl);
    
    const response = await fetch(`${backendUrl}/api/session/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sessionData),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Session save error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 