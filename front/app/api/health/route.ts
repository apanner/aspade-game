import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    storage: process.env.STORAGE_PROVIDER ?? 'unknown',
    liveMode: process.env.NEXT_PUBLIC_LIVE_MODE_ENABLED === 'true',
    timestamp: new Date().toISOString(),
  })
}
