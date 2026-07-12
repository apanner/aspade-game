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
import { VoiceMesh } from "@/lib/voice/mesh"
import { isSupabaseVoiceSignalingEnabled, isVoiceChatSupported } from "@/lib/voice/config"
import {
  getMicHint,
  micErrorMessage,
  queryMicPermission,
  requestMicStream,
  stopMicStream,
  type MicPermissionStatus,
} from "@/lib/voice/mic-permission"
import {
  configureMobileAudioElement,
  playRemoteAudioElement,
  unlockVoiceAudio,
} from "@/lib/voice/mobile-audio"
import type { VoiceSignalMessage } from "@/lib/voice/types"
import { useToast } from "@/hooks/use-toast"

const MIC_PERMISSION_CHECK_MS = 5 * 60 * 1000

type GameVoiceProviderProps = {
  gameId: string
  playerId: string | null
  playerName?: string
  humanPlayerIds: string[]
  enabled?: boolean
  children: ReactNode
}

type GameVoiceContextValue = {
  isSupported: boolean
  isJoined: boolean
  isConnecting: boolean
  isMicOn: boolean
  participantCount: number
  error: string | null
  joinVoice: () => Promise<void>
  leaveVoice: () => Promise<void>
  toggleMic: () => Promise<void>
  isPlayerSpeaking: (playerId: string) => boolean
  isPlayerMuted: (playerId: string) => boolean
  togglePlayerMute: (playerId: string) => void
  isPlayerInVoice: (playerId: string) => boolean
  micPermission: MicPermissionStatus
  micPromptVisible: boolean
  micPermissionHint: string
  isRequestingMicPermission: boolean
  requestMicPermission: () => Promise<boolean>
  dismissMicPrompt: () => void
}

const GameVoiceContext = createContext<GameVoiceContextValue | null>(null)

function waitForChannelSubscribe(channel: RealtimeChannel): Promise<'SUBSCRIBED' | 'FAILED'> {
  return new Promise((resolve) => {
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') resolve('SUBSCRIBED')
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') resolve('FAILED')
    })
  })
}

export function GameVoiceProvider({
  gameId,
  playerId,
  humanPlayerIds,
  enabled = true,
  children,
}: GameVoiceProviderProps) {
  const { toast } = useToast()
  const isSupported = isVoiceChatSupported()
  const [isJoined, setIsJoined] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isMicOn, setIsMicOn] = useState(false)
  const [participantCount, setParticipantCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [speakingPlayers, setSpeakingPlayers] = useState<Record<string, boolean>>({})
  const [mutedPlayers, setMutedPlayers] = useState<Record<string, boolean>>({})
  const [voiceParticipants, setVoiceParticipants] = useState<string[]>([])
  const [micPermission, setMicPermission] = useState<MicPermissionStatus>('prompt')
  const [micPromptVisible, setMicPromptVisible] = useState(false)
  const [isRequestingMicPermission, setIsRequestingMicPermission] = useState(false)

  const meshRef = useRef<VoiceMesh | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map())
  const joinedPlayersRef = useRef<Set<string>>(new Set())
  const lastSignalAtRef = useRef(0)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const hasVoiceIntentRef = useRef(false)
  const lastErrorToastRef = useRef<string | null>(null)

  const remotePlayerIds = useMemo(
    () => humanPlayerIds.filter((id) => id !== playerId),
    [humanPlayerIds, playerId]
  )

  const sendSignal = useCallback(
    async (message: Omit<VoiceSignalMessage, 'id' | 'at' | 'gameId'>) => {
      if (!playerId) return

      if (channelRef.current) {
        await channelRef.current.send({
          type: 'broadcast',
          event: 'VOICE_SIGNAL',
          payload: {
            ...message,
            gameId: gameId.toUpperCase(),
            at: Date.now(),
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          },
        })
        return
      }

      await fetch('/api/voice/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          playerId,
          type: message.type,
          to: message.to,
          payload: message.payload,
        }),
      })
    },
    [gameId, playerId]
  )

  const handleRemoteSignal = useCallback(async (signal: VoiceSignalMessage) => {
    if (!meshRef.current || signal.from === playerId) return

    if (signal.type === 'join') {
      joinedPlayersRef.current.add(signal.from)
      setVoiceParticipants(Array.from(joinedPlayersRef.current))
      setParticipantCount(joinedPlayersRef.current.size + (isJoined ? 1 : 0))
    }
    if (signal.type === 'leave') {
      joinedPlayersRef.current.delete(signal.from)
      setVoiceParticipants(Array.from(joinedPlayersRef.current))
      setParticipantCount(joinedPlayersRef.current.size + (isJoined ? 1 : 0))
    }

    await meshRef.current.handleRemoteSignal(signal)
  }, [isJoined, playerId])

  const attachRemoteAudio = useCallback((remoteId: string, stream: MediaStream) => {
    let audio = audioElementsRef.current.get(remoteId)
    if (!audio) {
      audio = new Audio()
      configureMobileAudioElement(audio)
      audioElementsRef.current.set(remoteId, audio)
    }
    audio.srcObject = stream
    audio.muted = !!mutedPlayers[remoteId]
    void playRemoteAudioElement(audio)
  }, [mutedPlayers])

  const detachRemoteAudio = useCallback((remoteId: string) => {
    const audio = audioElementsRef.current.get(remoteId)
    if (!audio) return
    audio.pause()
    audio.srcObject = null
    audioElementsRef.current.delete(remoteId)
  }, [])

  const leaveVoice = useCallback(async () => {
    await meshRef.current?.stop()
    meshRef.current = null
    stopMicStream(localStreamRef.current)
    localStreamRef.current = null
    joinedPlayersRef.current.clear()
    setVoiceParticipants([])
    audioElementsRef.current.forEach((audio) => {
      audio.pause()
      audio.srcObject = null
    })
    audioElementsRef.current.clear()
    setSpeakingPlayers({})
    setParticipantCount(0)
    setIsJoined(false)
    setIsMicOn(false)
  }, [])

  const refreshMicPermission = useCallback(async (): Promise<MicPermissionStatus> => {
    const status = await queryMicPermission()
    setMicPermission(status)
    return status
  }, [])

  const showMicPrompt = useCallback(() => {
    setMicPromptVisible(true)
  }, [])

  const dismissMicPrompt = useCallback(() => {
    setMicPromptVisible(false)
  }, [])

  const requestMicPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !playerId) return false

    hasVoiceIntentRef.current = true
    setIsRequestingMicPermission(true)
    setError(null)

    try {
      await unlockVoiceAudio()
      stopMicStream(localStreamRef.current)
      const stream = await requestMicStream()
      stream.getAudioTracks().forEach((track) => {
        track.enabled = false
      })
      localStreamRef.current = stream
      setMicPermission('granted')
      setMicPromptVisible(false)
      return true
    } catch (err) {
      const denied =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
      setMicPermission(denied ? 'denied' : 'prompt')
      setMicPromptVisible(true)
      setError(micErrorMessage(err))
      return false
    } finally {
      setIsRequestingMicPermission(false)
    }
  }, [isSupported, playerId])

  const joinVoice = useCallback(async () => {
    if (!playerId || !isSupported || isJoined || isConnecting) return

    hasVoiceIntentRef.current = true
    setIsConnecting(true)
    setError(null)

    try {
      await unlockVoiceAudio()

      let stream = localStreamRef.current
      const liveTrack = stream?.getAudioTracks().find((track) => track.readyState === 'live')
      if (!stream || !liveTrack) {
        stopMicStream(localStreamRef.current)
        stream = await requestMicStream()
        stream.getAudioTracks().forEach((track) => {
          track.enabled = false
        })
        localStreamRef.current = stream
        setMicPermission('granted')
      }

      stream.getAudioTracks().forEach((track) => {
        track.enabled = false
      })

      const mesh = new VoiceMesh({
        gameId,
        playerId,
        remotePlayerIds,
        sendSignal,
        onRemoteStream: attachRemoteAudio,
        onRemoteLeft: detachRemoteAudio,
        onSpeakingChange: (id, speaking) => {
          setSpeakingPlayers((prev) => {
            if (prev[id] === speaking) return prev
            return { ...prev, [id]: speaking }
          })
        },
      })

      meshRef.current = mesh
      await mesh.start(stream)
      joinedPlayersRef.current.add(playerId)
      setVoiceParticipants(Array.from(joinedPlayersRef.current))
      setParticipantCount(joinedPlayersRef.current.size)
      setIsJoined(true)
      setIsMicOn(false)
      setMicPromptVisible(false)
    } catch (err) {
      setError(micErrorMessage(err))
      if (
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
      ) {
        setMicPermission('denied')
        setMicPromptVisible(true)
      } else {
        showMicPrompt()
      }
      await leaveVoice()
    } finally {
      setIsConnecting(false)
    }
  }, [
    attachRemoteAudio,
    detachRemoteAudio,
    gameId,
    isConnecting,
    isJoined,
    isSupported,
    leaveVoice,
    playerId,
    remotePlayerIds,
    sendSignal,
    showMicPrompt,
  ])

  const toggleMic = useCallback(async () => {
    if (!meshRef.current || !isJoined) return

    hasVoiceIntentRef.current = true

    if (!isMicOn) {
      await unlockVoiceAudio()
      const status = await queryMicPermission()
      if (status !== 'granted') {
        const granted = await requestMicPermission()
        if (!granted) {
          showMicPrompt()
          return
        }
      }
    }

    const next = !isMicOn
    meshRef.current.setMicEnabled(next)
    setIsMicOn(next)
  }, [isJoined, isMicOn, requestMicPermission, showMicPrompt])

  const isPlayerSpeaking = useCallback(
    (id: string) => !!speakingPlayers[id],
    [speakingPlayers]
  )

  const isPlayerMuted = useCallback(
    (id: string) => !!mutedPlayers[id],
    [mutedPlayers]
  )

  const isPlayerInVoice = useCallback(
    (id: string) => voiceParticipants.includes(id),
    [voiceParticipants]
  )

  const togglePlayerMute = useCallback((remoteId: string) => {
    setMutedPlayers((prev) => {
      const nextMuted = !prev[remoteId]
      const audio = audioElementsRef.current.get(remoteId)
      if (audio) {
        audio.muted = nextMuted
      }
      return { ...prev, [remoteId]: nextMuted }
    })
  }, [])

  useEffect(() => {
    audioElementsRef.current.forEach((audio, remoteId) => {
      audio.muted = !!mutedPlayers[remoteId]
    })
  }, [mutedPlayers])

  useEffect(() => {
    if (!enabled || !isSupported || !playerId) return

    let permissionStatus: PermissionStatus | null = null

    void refreshMicPermission()

    if (navigator.permissions?.query) {
      void navigator.permissions
        .query({ name: 'microphone' as PermissionName })
        .then((result) => {
          permissionStatus = result
          setMicPermission(result.state as MicPermissionStatus)
          result.onchange = () => {
            const next = result.state as MicPermissionStatus
            setMicPermission(next)
            if (next !== 'granted') {
              showMicPrompt()
              void leaveVoice()
            } else {
              setMicPromptVisible(false)
            }
          }
        })
        .catch(() => {})
    }

    const intervalId = window.setInterval(() => {
      void refreshMicPermission().then((status) => {
        if (
          hasVoiceIntentRef.current &&
          status !== 'granted' &&
          status !== 'unsupported'
        ) {
          showMicPrompt()
        }
      })
    }, MIC_PERMISSION_CHECK_MS)

    return () => {
      window.clearInterval(intervalId)
      if (permissionStatus) {
        permissionStatus.onchange = null
      }
    }
  }, [enabled, isSupported, leaveVoice, playerId, refreshMicPermission, showMicPrompt])

  useEffect(() => {
    if (!error || error === lastErrorToastRef.current) return
    lastErrorToastRef.current = error
    toast({
      title: "Voice",
      description: error,
      variant: "destructive",
    })
  }, [error, toast])

  useEffect(() => {
    if (!enabled || !playerId || !gameId) return

    let cancelled = false
    let pollTimer: ReturnType<typeof setInterval> | null = null

    async function setupSignaling() {
      if (!isSupabaseVoiceSignalingEnabled()) {
        pollTimer = setInterval(async () => {
          if (!playerId) return
          try {
            const response = await fetch(
              `/api/voice/signal?gameId=${encodeURIComponent(gameId)}&playerId=${encodeURIComponent(playerId)}&since=${lastSignalAtRef.current}`
            )
            if (!response.ok) return
            const data = (await response.json()) as { signals: VoiceSignalMessage[] }
            for (const signal of data.signals) {
              lastSignalAtRef.current = Math.max(lastSignalAtRef.current, signal.at)
              await handleRemoteSignal(signal)
            }
          } catch {
            // polling fallback
          }
        }, 1200)
        return
      }

      const { createClient } = await import('@supabase/supabase-js')
      if (cancelled) return

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const channel = supabase.channel(`voice:${gameId.toUpperCase()}`, {
        config: { broadcast: { self: false } },
      })

      channel.on('broadcast', { event: 'VOICE_SIGNAL' }, (payload) => {
        const signal = payload.payload as VoiceSignalMessage
        void handleRemoteSignal(signal)
      })

      const status = await waitForChannelSubscribe(channel)
      if (cancelled) {
        channel.unsubscribe()
        return
      }
      if (status === 'SUBSCRIBED') {
        channelRef.current = channel
      }
    }

    void setupSignaling()

    return () => {
      cancelled = true
      if (pollTimer) clearInterval(pollTimer)
      channelRef.current?.unsubscribe()
      channelRef.current = null
      void leaveVoice()
    }
  }, [enabled, gameId, handleRemoteSignal, leaveVoice, playerId])

  const value = useMemo<GameVoiceContextValue>(
    () => ({
      isSupported,
      isJoined,
      isConnecting,
      isMicOn,
      participantCount,
      error,
      joinVoice,
      leaveVoice,
      toggleMic,
      isPlayerSpeaking,
      isPlayerMuted,
      togglePlayerMute,
      isPlayerInVoice,
      micPermission,
      micPromptVisible,
      micPermissionHint: getMicHint(micPermission),
      isRequestingMicPermission,
      requestMicPermission,
      dismissMicPrompt,
    }),
    [
      dismissMicPrompt,
      error,
      isConnecting,
      isJoined,
      isMicOn,
      isPlayerInVoice,
      isPlayerMuted,
      isPlayerSpeaking,
      isRequestingMicPermission,
      isSupported,
      joinVoice,
      leaveVoice,
      micPermission,
      micPromptVisible,
      participantCount,
      requestMicPermission,
      toggleMic,
      togglePlayerMute,
    ]
  )

  return <GameVoiceContext.Provider value={value}>{children}</GameVoiceContext.Provider>
}

export function useGameVoice(): GameVoiceContextValue {
  const context = useContext(GameVoiceContext)
  if (!context) {
    return {
      isSupported: false,
      isJoined: false,
      isConnecting: false,
      isMicOn: false,
      participantCount: 0,
      error: null,
      joinVoice: async () => {},
      leaveVoice: async () => {},
      toggleMic: async () => {},
      isPlayerSpeaking: () => false,
      isPlayerMuted: () => false,
      togglePlayerMute: () => {},
      isPlayerInVoice: () => false,
      micPermission: 'unsupported',
      micPromptVisible: false,
      micPermissionHint: '',
      isRequestingMicPermission: false,
      requestMicPermission: async () => false,
      dismissMicPrompt: () => {},
    }
  }
  return context
}
