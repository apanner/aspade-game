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
import { isSupabaseVoiceSignalingEnabled, isVoiceChatSupported, voiceChannelName } from "@/lib/voice/config"
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
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
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

type SignalingStatus = "idle" | "connecting" | "ready" | "error" | "unavailable"

type GameVoiceContextValue = {
  isSupported: boolean
  isJoined: boolean
  isConnecting: boolean
  isMicOn: boolean
  participantCount: number
  signalingStatus: SignalingStatus
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
  needsMicPermission: boolean
  requestMicPermission: () => Promise<boolean>
  dismissMicPrompt: () => void
}

const GameVoiceContext = createContext<GameVoiceContextValue | null>(null)

function waitForChannelSubscribe(channel: RealtimeChannel): Promise<"SUBSCRIBED" | "FAILED"> {
  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => resolve("FAILED"), 12_000)
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        window.clearTimeout(timeout)
        resolve("SUBSCRIBED")
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        window.clearTimeout(timeout)
        resolve("FAILED")
      }
    })
  })
}

function createSignalId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function GameVoiceProvider({
  gameId,
  playerId,
  playerName,
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
  const [signalingStatus, setSignalingStatus] = useState<SignalingStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [speakingPlayers, setSpeakingPlayers] = useState<Record<string, boolean>>({})
  const [mutedPlayers, setMutedPlayers] = useState<Record<string, boolean>>({})
  const [voiceParticipants, setVoiceParticipants] = useState<string[]>([])
  const [micPermission, setMicPermission] = useState<MicPermissionStatus>("prompt")
  const [micPromptVisible, setMicPromptVisible] = useState(false)
  const [isRequestingMicPermission, setIsRequestingMicPermission] = useState(false)

  const meshRef = useRef<VoiceMesh | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map())
  const channelRef = useRef<RealtimeChannel | null>(null)
  const hasVoiceIntentRef = useRef(false)
  const lastErrorToastRef = useRef<string | null>(null)
  const isJoinedRef = useRef(false)
  const playerNameRef = useRef(playerName)
  playerNameRef.current = playerName

  const humanIdsKey = humanPlayerIds.join(",")

  const sendSignal = useCallback(
    async (message: Omit<VoiceSignalMessage, "id" | "at" | "gameId">) => {
      const channel = channelRef.current
      if (!channel) {
        throw new Error("Voice signaling channel is not ready")
      }

      const status = await channel.send({
        type: "broadcast",
        event: "VOICE_SIGNAL",
        payload: {
          ...message,
          gameId: gameId.toUpperCase(),
          at: Date.now(),
          id: createSignalId(),
        } satisfies VoiceSignalMessage,
      })

      if (status !== "ok" && status !== "success" && typeof status === "string" && status.includes("error")) {
        throw new Error("Failed to send voice signal over Supabase")
      }
    },
    [gameId]
  )

  const syncMeshPeers = useCallback(async (participants: string[]) => {
    if (!meshRef.current || !isJoinedRef.current) return
    const remotes = participants.filter((id) => id !== playerId)
    await meshRef.current.syncVoicePeers(remotes)
    setParticipantCount(participants.length)
  }, [playerId])

  const handleRemoteSignal = useCallback(
    async (signal: VoiceSignalMessage) => {
      if (!meshRef.current || signal.from === playerId) return
      await meshRef.current.handleRemoteSignal(signal)
    },
    [playerId]
  )

  const attachRemoteAudio = useCallback(
    (remoteId: string, stream: MediaStream) => {
      let audio = audioElementsRef.current.get(remoteId)
      if (!audio) {
        audio = new Audio()
        configureMobileAudioElement(audio)
        audioElementsRef.current.set(remoteId, audio)
      }
      audio.srcObject = stream
      audio.muted = !!mutedPlayers[remoteId]
      void playRemoteAudioElement(audio)
    },
    [mutedPlayers]
  )

  const detachRemoteAudio = useCallback((remoteId: string) => {
    const audio = audioElementsRef.current.get(remoteId)
    if (!audio) return
    audio.pause()
    audio.srcObject = null
    audioElementsRef.current.delete(remoteId)
  }, [])

  const leaveVoice = useCallback(async () => {
    isJoinedRef.current = false
    await meshRef.current?.stop()
    meshRef.current = null

    const channel = channelRef.current
    if (channel) {
      try {
        await channel.track({ inVoice: false, at: Date.now() })
      } catch {
        // ignore
      }
    }

    // Keep mic permission stream around for quick re-join; mute it.
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = false
    })

    audioElementsRef.current.forEach((audio) => {
      audio.pause()
      audio.srcObject = null
    })
    audioElementsRef.current.clear()
    setSpeakingPlayers({})
    setVoiceParticipants((prev) => prev.filter((id) => id === playerId))
    setParticipantCount(0)
    setIsJoined(false)
    setIsMicOn(false)
  }, [playerId])

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
      setMicPermission("granted")
      setMicPromptVisible(false)
      return true
    } catch (err) {
      const denied =
        err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")
      setMicPermission(denied ? "denied" : "prompt")
      setMicPromptVisible(true)
      setError(micErrorMessage(err))
      return false
    } finally {
      setIsRequestingMicPermission(false)
    }
  }, [isSupported, playerId])

  const joinVoice = useCallback(async () => {
    if (!playerId || !isSupported || isJoined || isConnecting) return

    if (!isSupabaseVoiceSignalingEnabled()) {
      setError("Voice needs Supabase Realtime. Add NEXT_PUBLIC_SUPABASE_URL and ANON_KEY.")
      setSignalingStatus("unavailable")
      return
    }

    if (signalingStatus !== "ready" || !channelRef.current) {
      setError("Voice signaling is still connecting… try again in a moment.")
      return
    }

    hasVoiceIntentRef.current = true
    setIsConnecting(true)
    setError(null)

    try {
      await unlockVoiceAudio()

      let stream = localStreamRef.current
      const liveTrack = stream?.getAudioTracks().find((track) => track.readyState === "live")
      if (!stream || !liveTrack) {
        stopMicStream(localStreamRef.current)
        stream = await requestMicStream()
        stream.getAudioTracks().forEach((track) => {
          track.enabled = false
        })
        localStreamRef.current = stream
        setMicPermission("granted")
      }

      stream.getAudioTracks().forEach((track) => {
        track.enabled = false
      })

      const mesh = new VoiceMesh({
        gameId,
        playerId,
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

      await channelRef.current.track({
        inVoice: true,
        name: playerNameRef.current || playerId,
        at: Date.now(),
      })

      isJoinedRef.current = true
      setIsJoined(true)
      setIsMicOn(false)
      setMicPromptVisible(false)

      const state = channelRef.current.presenceState() as Record<
        string,
        Array<{ inVoice?: boolean }>
      >
      const inVoice = Object.entries(state)
        .filter(([, metas]) => metas.some((meta) => meta.inVoice))
        .map(([id]) => id)
      if (!inVoice.includes(playerId)) inVoice.push(playerId)
      setVoiceParticipants(inVoice)
      await mesh.syncVoicePeers(inVoice.filter((id) => id !== playerId))
      setParticipantCount(inVoice.length)
    } catch (err) {
      setError(micErrorMessage(err))
      if (
        err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")
      ) {
        setMicPermission("denied")
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
    sendSignal,
    showMicPrompt,
    signalingStatus,
  ])

  const toggleMic = useCallback(async () => {
    if (!meshRef.current || !isJoined) return

    hasVoiceIntentRef.current = true

    if (!isMicOn) {
      await unlockVoiceAudio()
      const status = await queryMicPermission()
      if (status !== "granted") {
        const granted = await requestMicPermission()
        if (!granted) {
          showMicPrompt()
          return
        }
        if (localStreamRef.current) {
          meshRef.current.replaceLocalStream(localStreamRef.current)
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
      if (audio) audio.muted = nextMuted
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
        .query({ name: "microphone" as PermissionName })
        .then((result) => {
          permissionStatus = result
          setMicPermission(result.state as MicPermissionStatus)
          result.onchange = () => {
            const next = result.state as MicPermissionStatus
            setMicPermission(next)
            if (next !== "granted") {
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
        if (hasVoiceIntentRef.current && status !== "granted" && status !== "unsupported") {
          showMicPrompt()
        }
      })
    }, MIC_PERMISSION_CHECK_MS)

    return () => {
      window.clearInterval(intervalId)
      if (permissionStatus) permissionStatus.onchange = null
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

  // Supabase Realtime voice channel (required).
  useEffect(() => {
    if (!enabled || !playerId || !gameId) return

    if (!isSupabaseVoiceSignalingEnabled()) {
      setSignalingStatus("unavailable")
      setError("Supabase is not configured for voice signaling.")
      return
    }

    let cancelled = false
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      setSignalingStatus("unavailable")
      return
    }

    setSignalingStatus("connecting")

    async function setupSignaling() {
      const channel = supabase!.channel(voiceChannelName(gameId), {
        config: {
          broadcast: { self: false, ack: true },
          presence: { key: playerId! },
        },
      })

      channel.on("broadcast", { event: "VOICE_SIGNAL" }, ({ payload }) => {
        const signal = payload as VoiceSignalMessage
        if (!signal?.type || !signal.from) return
        void handleRemoteSignal(signal)
      })

      channel.on("presence", { event: "sync" }, () => {
        const state = channel.presenceState() as Record<string, Array<{ inVoice?: boolean }>>
        const inVoice = Object.entries(state)
          .filter(([, metas]) => metas.some((meta) => meta.inVoice))
          .map(([id]) => id)
        setVoiceParticipants(inVoice)
        setParticipantCount(inVoice.length)
        void syncMeshPeers(inVoice)
      })

      const status = await waitForChannelSubscribe(channel)
      if (cancelled) {
        channel.unsubscribe()
        return
      }

      if (status !== "SUBSCRIBED") {
        setSignalingStatus("error")
        setError("Could not connect to Supabase voice channel. Check Realtime is enabled.")
        channel.unsubscribe()
        return
      }

      channelRef.current = channel
      setSignalingStatus("ready")

      // Announce idle presence so others can see us online; joinVoice upgrades to inVoice.
      await channel.track({
        inVoice: false,
        name: playerNameRef.current || playerId,
        at: Date.now(),
      })
    }

    void setupSignaling()

    return () => {
      cancelled = true
      void leaveVoice()
      channelRef.current?.unsubscribe()
      channelRef.current = null
      setSignalingStatus("idle")
      stopMicStream(localStreamRef.current)
      localStreamRef.current = null
    }
    // humanIdsKey kept for future peer filtering hooks
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, gameId, handleRemoteSignal, leaveVoice, playerId, syncMeshPeers, humanIdsKey])

  const value = useMemo<GameVoiceContextValue>(
    () => ({
      isSupported,
      isJoined,
      isConnecting,
      isMicOn,
      participantCount,
      signalingStatus,
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
      needsMicPermission: micPermission !== "granted",
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
      signalingStatus,
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
      signalingStatus: "unavailable",
      error: null,
      joinVoice: async () => {},
      leaveVoice: async () => {},
      toggleMic: async () => {},
      isPlayerSpeaking: () => false,
      isPlayerMuted: () => false,
      togglePlayerMute: () => {},
      isPlayerInVoice: () => false,
      micPermission: "unsupported",
      micPromptVisible: false,
      micPermissionHint: "",
      isRequestingMicPermission: false,
      needsMicPermission: true,
      requestMicPermission: async () => false,
      dismissMicPrompt: () => {},
    }
  }
  return context
}
