import type { GameEvent } from '@aspade/engine/types'

type RealtimeChannel = ReturnType<
  ReturnType<typeof import('@supabase/supabase-js').createClient>['channel']
>

function waitForChannelSubscribe(channel: RealtimeChannel): Promise<boolean> {
  return new Promise((resolve) => {
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        resolve(true)
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        resolve(false)
      }
    })
  })
}

/**
 * Broadcast live game events. Uses Supabase when configured; otherwise no-op.
 * Subscribes to the channel before sending (required for server-side broadcast).
 */
export async function broadcastGameEvents(gameId: string, events: GameEvent[]): Promise<void> {
  if (events.length === 0) return

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`📡 Realtime skip (no Supabase env): game:${gameId}`, events.map((e) => e.type))
    }
    return
  }

  let channel: RealtimeChannel | null = null
  let supabase: ReturnType<typeof import('@supabase/supabase-js').createClient> | null = null

  try {
    const { createClient } = await import('@supabase/supabase-js')
    supabase = createClient(url, serviceKey)
    channel = supabase.channel(`game:${gameId}`)

    const subscribed = await waitForChannelSubscribe(channel)
    if (!subscribed) {
      console.warn(`Realtime subscribe failed for game:${gameId}`)
      return
    }

    await channel.send({
      type: 'broadcast',
      event: 'GAME_EVENT',
      payload: { gameId, events, at: Date.now() },
    })
  } catch (error) {
    console.warn('Realtime broadcast failed:', error)
  } finally {
    if (channel && supabase) {
      try {
        await supabase.removeChannel(channel)
      } catch {
        // ignore cleanup errors
      }
    }
  }
}
