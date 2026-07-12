import { NextRequest, NextResponse } from 'next/server'
import { readEnv } from '@/lib/env'

type PingResult = {
  ok: boolean
  method: string
  status?: number
  latencyMs: number
  error?: string
}

async function pingSupabase(): Promise<PingResult> {
  const url = readEnv('NEXT_PUBLIC_SUPABASE_URL') || readEnv('SUPABASE_URL')
  const anonKey = readEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') || readEnv('SUPABASE_ANON_KEY')
  const table = readEnv('SUPABASE_KEEPALIVE_TABLE', '_keepalive')

  if (!url || !anonKey) {
    return { ok: false, method: 'none', latencyMs: 0, error: 'Supabase URL or anon key not configured' }
  }

  const base = url.replace(/\/$/, '')
  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
  }

  const attempts: { method: string; run: () => Promise<Response> }[] = [
    {
      method: `db-select:${table}`,
      run: () =>
        fetch(`${base}/rest/v1/${table}?select=id&limit=1`, {
          method: 'GET',
          headers,
          cache: 'no-store',
        }),
    },
    {
      method: 'rpc:keepalive',
      run: () =>
        fetch(`${base}/rest/v1/rpc/keepalive`, {
          method: 'POST',
          headers,
          body: '{}',
          cache: 'no-store',
        }),
    },
    {
      method: 'auth-health',
      run: () =>
        fetch(`${base}/auth/v1/health`, {
          method: 'GET',
          headers: { apikey: anonKey },
          cache: 'no-store',
        }),
    },
  ]

  for (const attempt of attempts) {
    const started = Date.now()
    try {
      const response = await attempt.run()
      const latencyMs = Date.now() - started
      if (response.ok) {
        return { ok: true, method: attempt.method, status: response.status, latencyMs }
      }
    } catch {
      // try next method
    }
  }

  return {
    ok: false,
    method: 'all-failed',
    latencyMs: 0,
    error: `Could not reach Supabase. Create table "${table}" or run scripts/supabase-keepalive.sql in SQL Editor.`,
  }
}

export async function GET(request: NextRequest) {
  const cronSecret = readEnv('CRON_SECRET')
  if (cronSecret && process.env.VERCEL === '1') {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const result = await pingSupabase()
  return NextResponse.json(
    {
      service: 'supabase-keepalive',
      timestamp: new Date().toISOString(),
      ...result,
    },
    { status: result.ok ? 200 : 503 }
  )
}
