"use client"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let browserClient: SupabaseClient | null = null

export function getSupabaseBrowserClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null

  if (!browserClient) {
    browserClient = createClient(url, anonKey, {
      realtime: {
        params: { eventsPerSecond: 20 },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  }

  return browserClient
}

export function isSupabaseBrowserConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}
