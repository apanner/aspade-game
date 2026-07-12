/**
 * Ping Supabase to prevent free-tier project pause (7-day inactivity).
 *
 * Usage:
 *   npx tsx scripts/supabase-keepalive.ts
 *   npx tsx scripts/supabase-keepalive.ts --url https://xxx.supabase.co --key eyJ...
 *
 * Env (from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL / SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_ANON_KEY
 *   SUPABASE_KEEPALIVE_TABLE (default: _keepalive)
 */

import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

function loadEnvLocal(): void {
  const envPath = resolve(process.cwd(), '.env.local')
  if (!existsSync(envPath)) return

  const content = readFileSync(envPath, 'utf8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = value
  }
}

function readArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag)
  if (index === -1 || index + 1 >= process.argv.length) return undefined
  return process.argv[index + 1]
}

function readEnv(name: string, fallback = ''): string {
  return (process.env[name] ?? fallback).trim().replace(/\r/g, '')
}

async function main(): Promise<void> {
  loadEnvLocal()

  const baseUrl = (readArg('--url') || readEnv('NEXT_PUBLIC_SUPABASE_URL') || readEnv('SUPABASE_URL')).replace(/\/$/, '')
  const anonKey = readArg('--key') || readEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') || readEnv('SUPABASE_ANON_KEY')
  const table = readEnv('SUPABASE_KEEPALIVE_TABLE', '_keepalive')
  const appUrl = readArg('--app') || readEnv('KEEPALIVE_APP_URL', 'http://localhost:3000')

  if (!baseUrl || !anonKey) {
    console.error('Missing Supabase URL or anon key. Set in .env.local or pass --url / --key')
    process.exit(1)
  }

  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
  }

  const attempts = [
    {
      label: `GET /rest/v1/${table}`,
      run: () => fetch(`${baseUrl}/rest/v1/${table}?select=id&limit=1`, { headers }),
    },
    {
      label: 'POST /rest/v1/rpc/keepalive',
      run: () => fetch(`${baseUrl}/rest/v1/rpc/keepalive`, { method: 'POST', headers, body: '{}' }),
    },
    {
      label: 'GET /auth/v1/health',
      run: () => fetch(`${baseUrl}/auth/v1/health`, { headers: { apikey: anonKey } }),
    },
    {
      label: `GET ${appUrl}/api/supabase/ping`,
      run: () => fetch(`${appUrl}/api/supabase/ping`, { cache: 'no-store' }),
    },
  ]

  for (const attempt of attempts) {
    const started = Date.now()
    try {
      const response = await attempt.run()
      const ms = Date.now() - started
      if (response.ok) {
        console.log(`OK ${attempt.label} → ${response.status} (${ms}ms)`)
        process.exit(0)
      }
      console.warn(`FAIL ${attempt.label} → ${response.status} (${ms}ms)`)
    } catch (err) {
      console.warn(`FAIL ${attempt.label} →`, err instanceof Error ? err.message : err)
    }
  }

  console.error('All keepalive attempts failed. Run scripts/supabase-keepalive.sql in Supabase SQL Editor.')
  process.exit(1)
}

void main()
