export type VoiceSignalType = 'offer' | 'answer' | 'ice-candidate' | 'join' | 'leave'

export type VoiceSignalMessage = {
  id: string
  gameId: string
  from: string
  to: string
  type: VoiceSignalType
  payload?: unknown
  at: number
}

export type VoiceChatState = {
  isSupported: boolean
  isJoined: boolean
  isConnecting: boolean
  isMicOn: boolean
  participantCount: number
  error: string | null
}
