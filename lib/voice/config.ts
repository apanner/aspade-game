export function isVoiceChatSupported(): boolean {
  if (typeof window === 'undefined') return false
  if (!window.isSecureContext) return false

  const hasMedia =
    !!navigator.mediaDevices?.getUserMedia ||
    !!(navigator as Navigator & { webkitGetUserMedia?: unknown }).webkitGetUserMedia

  return !!(hasMedia && window.RTCPeerConnection)
}

export function isSupabaseVoiceSignalingEnabled(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export function voiceChannelName(gameId: string): string {
  return `voice:${gameId.toUpperCase()}`
}

export const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
]

export const PEER_CONNECTION_CONFIG: RTCConfiguration = {
  iceServers: ICE_SERVERS,
  iceCandidatePoolSize: 4,
  bundlePolicy: 'max-bundle',
}
