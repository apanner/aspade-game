import { NextRequest, NextResponse } from 'next/server';
import { smartFetch } from '../../../../../lib/backend-config';

export async function POST(request: NextRequest) {
  try {
    const response = await smartFetch('/api/admin/storage/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Storage sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync storage' },
      { status: 500 }
    );
  }
} 