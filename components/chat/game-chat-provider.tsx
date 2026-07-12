"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import type { RealtimeChannel } from "@supabase/supabase-js"
import { isSupabaseVoiceSignalingEnabled } from "@/lib/voice/config"
import type { ChatMessage } from "@/lib/chat/types"

type GameChatProviderProps = {
  gameId: string
  playerId: string | null
  playerName?: string
  enabled?: boolean
  children: ReactNode
}

type GameChatContextValue = {
  messages: ChatMessage[]
  unreadCount: number
  sendMessage: (text: string, to?: string) => Promise<void>
  markRead: () => void
  openDmWith: string | null
  setOpenDmWith: (playerId: string | null) => void
}

const GameChatContext = createContext<GameChatContextValue | null>(null)

function chatChannelName(gameId: string): string {
  return `chat:${gameId.toUpperCase()}`
}

export function GameChatProvider({
  gameId,
  playerId,
  enabled = true,
  children,
}: GameChatProviderProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [openDmWith, setOpenDmWith] = useState<string | null>(null)
  const lastMessageAtRef = useRef(0)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const drawerOpenRef = useRef(false)

  const appendMessage = useCallback(
    (message: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((item) => item.id === message.id)) return prev
        return [...prev, message].sort((a, b) => a.at - b.at).slice(-200)
      })
      lastMessageAtRef.current = Math.max(lastMessageAtRef.current, message.at)

      if (
        message.from !== playerId &&
        (message.to === 'table' || message.to === playerId)
      ) {
        setUnreadCount((count) => count + 1)
      }
    },
    [playerId]
  )

  const markRead = useCallback(() => {
    setUnreadCount(0)
    drawerOpenRef.current = true
  }, [])

  const sendMessage = useCallback(
    async (text: string, to: string = 'table') => {
      if (!playerId || !text.trim()) return

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          playerId,
          to,
          text: text.trim(),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const data = (await response.json()) as { message: ChatMessage }
      appendMessage(data.message)

      if (channelRef.current) {
        await channelRef.current.send({
          type: 'broadcast',
          event: 'CHAT_MESSAGE',
          payload: data.message,
        })
      }
    },
    [appendMessage, gameId, playerId]
  )

  useEffect(() => {
    if (!enabled || !playerId || !gameId) return

    let cancelled = false
    let pollTimer: ReturnType<typeof setInterval> | null = null

    async function bootstrap() {
      try {
        const response = await fetch(
          `/api/chat?gameId=${encodeURIComponent(gameId)}&playerId=${encodeURIComponent(playerId)}&since=0`
        )
        if (response.ok) {
          const data = (await response.json()) as { messages: ChatMessage[] }
          for (const message of data.messages) {
            appendMessage(message)
          }
        }
      } catch {
        // ignore bootstrap errors
      }

      if (!isSupabaseVoiceSignalingEnabled()) {
        pollTimer = setInterval(async () => {
          try {
            const response = await fetch(
              `/api/chat?gameId=${encodeURIComponent(gameId)}&playerId=${encodeURIComponent(playerId)}&since=${lastMessageAtRef.current}`
            )
            if (!response.ok) return
            const data = (await response.json()) as { messages: ChatMessage[] }
            for (const message of data.messages) {
              appendMessage(message)
            }
          } catch {
            // polling fallback
          }
        }, 1500)
        return
      }

      const { createClient } = await import('@supabase/supabase-js')
      if (cancelled) return

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const channel = supabase.channel(chatChannelName(gameId), {
        config: { broadcast: { self: false } },
      })

      channel.on('broadcast', { event: 'CHAT_MESSAGE' }, (payload) => {
        appendMessage(payload.payload as ChatMessage)
      })

      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channelRef.current = channel
        }
      })
    }

    void bootstrap()

    return () => {
      cancelled = true
      if (pollTimer) clearInterval(pollTimer)
      channelRef.current?.unsubscribe()
      channelRef.current = null
    }
  }, [appendMessage, enabled, gameId, playerId])

  const value = useMemo<GameChatContextValue>(
    () => ({
      messages,
      unreadCount,
      sendMessage,
      markRead,
      openDmWith,
      setOpenDmWith,
    }),
    [markRead, messages, openDmWith, sendMessage, unreadCount]
  )

  return <GameChatContext.Provider value={value}>{children}</GameChatContext.Provider>
}

export function useGameChat(): GameChatContextValue {
  const context = useContext(GameChatContext)
  if (!context) {
    return {
      messages: [],
      unreadCount: 0,
      sendMessage: async () => {},
      markRead: () => {},
      openDmWith: null,
      setOpenDmWith: () => {},
    }
  }
  return context
}
