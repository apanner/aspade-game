import { isSupabaseBrowserConfigured } from "@/lib/supabase/browser-client"

export function isVoiceChatSupported(): boolean {
  if (typeof window === "undefined") return false
  if (!window.isSecureContext) return false

  const hasMedia =
    !!navigator.mediaDevices?.getUserMedia ||
    !!(navigator as Navigator & { webkitGetUserMedia?: unknown }).webkitGetUserMedia

  return !!(hasMedia && window.RTCPeerConnection)
}

export function isSupabaseVoiceSignalingEnabled(): boolean {
  return isSupabaseBrowserConfigured()
}

export function voiceChannelName(gameId: string): string {
  return `voice:${gameId.toUpperCase()}`
}

function parseTurnServers(): RTCIceServer[] {
  const urlsRaw = process.env.NEXT_PUBLIC_TURN_URLS
  if (!urlsRaw) return []

  const username = process.env.NEXT_PUBLIC_TURN_USERNAME || ""
  const credential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL || ""
  const urls = urlsRaw
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean)

  if (urls.length === 0) return []

  return [
    {
      urls,
      ...(username ? { username, credential } : {}),
    },
  ]
}

/** STUN always included; TURN from env when set (recommended for phones / strict NAT). */
export const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  // Public openrelay fallback — works for many networks without custom TURN setup.
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443?transport=tcp",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  ...parseTurnServers(),
]

export const PEER_CONNECTION_CONFIG: RTCConfiguration = {
  iceServers: ICE_SERVERS,
  iceCandidatePoolSize: 8,
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require",
}
