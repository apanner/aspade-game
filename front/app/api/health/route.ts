import { NextResponse } from 'next/server'
import { readEnv, readEnvFlag } from '../../../lib/env'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    storage: readEnv('STORAGE_PROVIDER', 'unknown'),
    liveMode: readEnvFlag('NEXT_PUBLIC_LIVE_MODE_ENABLED'),
    timestamp: new Date().toISOString(),
  })
}
