"use client"

import { useEffect, useRef, useCallback } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'

type UseGameSyncOptions = {
  gameId: string
  playerId: string | null
  enabled?: boolean
  onGameEvent?: () => void
}

function waitForChannelSubscribe(channel: RealtimeChannel): Promise<'SUBSCRIBED' | 'FAILED'> {
  return new Promise((resolve) => {
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        resolve('SUBSCRIBED')
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        resolve('FAILED')
      }
    })
  })
}

/**
 * Subscribes to Supabase Realtime for live game events.
 * Falls back silently when Supabase is not configured (GamePoller handles sync).
 */
export function useGameSync({ gameId, playerId, enabled = true, onGameEvent }: UseGameSyncOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const onGameEventRef = useRef(onGameEvent)
  onGameEventRef.current = onGameEvent

  const refetch = useCallback(() => {
    onGameEventRef.current?.()
  }, [])

  useEffect(() => {
    if (!enabled || !gameId || !playerId) return

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !anonKey) return

    let cancelled = false

    async function subscribe() {
      const { createClient } = await import('@supabase/supabase-js')
      if (cancelled) return

      const supabase = createClient(url!, anonKey!)
      const channel = supabase.channel(`game:${gameId}`, {
        config: { broadcast: { self: false }, presence: { key: playerId! } },
      })

      channel.on('broadcast', { event: 'GAME_EVENT' }, () => {
        refetch()
      })

      const status = await waitForChannelSubscribe(channel)
      if (cancelled) {
        channel.unsubscribe()
        return
      }

      if (status === 'FAILED') {
        console.warn(`useGameSync: failed to subscribe to game:${gameId}`)
        return
      }

      channelRef.current = channel
    }

    subscribe()

    return () => {
      cancelled = true
      channelRef.current?.unsubscribe()
      channelRef.current = null
    }
  }, [gameId, playerId, enabled, refetch])

  useEffect(() => {
    if (!enabled) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refetch()
      }
    }

    const handleOnline = () => {
      refetch()
    }

    const handleOffline = () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('useGameSync: offline — will refetch when back online')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [enabled, refetch])

  return { refetch }
}
