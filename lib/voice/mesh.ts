import { PEER_CONNECTION_CONFIG } from './config'
import { getSharedAudioContext } from './mobile-audio'
import type { VoiceSignalMessage } from './types'

type SendSignalFn = (message: Omit<VoiceSignalMessage, 'id' | 'at' | 'gameId'>) => Promise<void>

type MeshOptions = {
  gameId: string
  playerId: string
  remotePlayerIds: string[]
  sendSignal: SendSignalFn
  onRemoteStream: (playerId: string, stream: MediaStream) => void
  onRemoteLeft: (playerId: string) => void
  onSpeakingChange: (playerId: string, speaking: boolean) => void
}

type PeerEntry = {
  connection: RTCPeerConnection
  cleanupSpeaking?: () => void
}

export class VoiceMesh {
  private readonly peers = new Map<string, PeerEntry>()
  private localStream: MediaStream | null = null
  private localSpeakingCleanup: (() => void) | null = null
  private readonly remotePlayerIds: Set<string>

  constructor(private readonly options: MeshOptions) {
    this.remotePlayerIds = new Set(options.remotePlayerIds.filter((id) => id !== options.playerId))
  }

  async start(localStream: MediaStream): Promise<void> {
    this.localStream = localStream
    this.localSpeakingCleanup = trackSpeaking(localStream, (speaking) => {
      this.options.onSpeakingChange(this.options.playerId, speaking)
    })

    await this.options.sendSignal({
      from: this.options.playerId,
      to: '*',
      type: 'join',
    })

    for (const remoteId of this.remotePlayerIds) {
      if (this.shouldInitiate(remoteId)) {
        await this.createOffer(remoteId)
      }
    }
  }

  async stop(): Promise<void> {
    await this.options.sendSignal({
      from: this.options.playerId,
      to: '*',
      type: 'leave',
    }).catch(() => {})

    this.localSpeakingCleanup?.()
    this.localSpeakingCleanup = null

    for (const [playerId, entry] of this.peers.entries()) {
      entry.cleanupSpeaking?.()
      entry.connection.close()
      this.options.onRemoteLeft(playerId)
    }
    this.peers.clear()

    this.localStream?.getTracks().forEach((track) => track.stop())
    this.localStream = null
  }

  setMicEnabled(enabled: boolean): void {
    this.localStream?.getAudioTracks().forEach((track) => {
      track.enabled = enabled
    })
  }

  async handleRemoteSignal(signal: VoiceSignalMessage): Promise<void> {
    if (signal.from === this.options.playerId) return

    if (signal.type === 'join') {
      if (this.shouldInitiate(signal.from) && !this.peers.has(signal.from)) {
        await this.createOffer(signal.from)
      }
      return
    }

    if (signal.type === 'leave') {
      this.removePeer(signal.from)
      return
    }

    if (signal.to !== this.options.playerId) return

    if (signal.type === 'offer') {
      await this.handleOffer(signal.from, signal.payload as RTCSessionDescriptionInit)
      return
    }

    if (signal.type === 'answer') {
      await this.handleAnswer(signal.from, signal.payload as RTCSessionDescriptionInit)
      return
    }

    if (signal.type === 'ice-candidate') {
      await this.handleIceCandidate(signal.from, signal.payload as RTCIceCandidateInit)
    }
  }

  private shouldInitiate(remoteId: string): boolean {
    return this.options.playerId < remoteId
  }

  private async createOffer(remoteId: string): Promise<void> {
    const connection = this.createPeerConnection(remoteId)
    const offer = await connection.createOffer()
    await connection.setLocalDescription(offer)
    await this.options.sendSignal({
      from: this.options.playerId,
      to: remoteId,
      type: 'offer',
      payload: offer,
    })
  }

  private async handleOffer(remoteId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    const connection = this.peers.get(remoteId)?.connection ?? this.createPeerConnection(remoteId)
    await connection.setRemoteDescription(offer)
    const answer = await connection.createAnswer()
    await connection.setLocalDescription(answer)
    await this.options.sendSignal({
      from: this.options.playerId,
      to: remoteId,
      type: 'answer',
      payload: answer,
    })
  }

  private async handleAnswer(remoteId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const connection = this.peers.get(remoteId)?.connection
    if (!connection) return
    await connection.setRemoteDescription(answer)
  }

  private async handleIceCandidate(remoteId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const connection = this.peers.get(remoteId)?.connection
    if (!connection || !candidate) return
    try {
      await connection.addIceCandidate(candidate)
    } catch {
      // ICE can arrive before remote description is set.
    }
  }

  private createPeerConnection(remoteId: string): RTCPeerConnection {
    const existing = this.peers.get(remoteId)
    if (existing) return existing.connection

    const connection = new RTCPeerConnection(PEER_CONNECTION_CONFIG)
    const entry: PeerEntry = { connection }
    this.peers.set(remoteId, entry)

    this.localStream?.getTracks().forEach((track) => {
      connection.addTrack(track, this.localStream!)
    })

    connection.onicecandidate = (event) => {
      if (!event.candidate) return
      void this.options.sendSignal({
        from: this.options.playerId,
        to: remoteId,
        type: 'ice-candidate',
        payload: event.candidate.toJSON(),
      })
    }

    connection.ontrack = (event) => {
      const [stream] = event.streams
      if (!stream) return
      this.options.onRemoteStream(remoteId, stream)
      entry.cleanupSpeaking?.()
      entry.cleanupSpeaking = trackSpeaking(stream, (speaking) => {
        this.options.onSpeakingChange(remoteId, speaking)
      })
    }

    connection.onconnectionstatechange = () => {
      if (connection.connectionState === 'failed' || connection.connectionState === 'closed') {
        this.removePeer(remoteId)
      }
    }

    return connection
  }

  private removePeer(remoteId: string): void {
    const entry = this.peers.get(remoteId)
    if (!entry) return
    entry.cleanupSpeaking?.()
    entry.connection.close()
    this.peers.delete(remoteId)
    this.options.onRemoteLeft(remoteId)
    this.options.onSpeakingChange(remoteId, false)
  }
}

function trackSpeaking(stream: MediaStream, onChange: (speaking: boolean) => void): () => void {
  const audioContext = getSharedAudioContext() ?? new AudioContext()
  if (audioContext.state === 'suspended') {
    void audioContext.resume()
  }
  const source = audioContext.createMediaStreamSource(stream)
  const analyser = audioContext.createAnalyser()
  analyser.fftSize = 512
  source.connect(analyser)

  const bins = new Uint8Array(analyser.frequencyBinCount)
  let speaking = false
  let frame = 0

  const tick = () => {
    analyser.getByteFrequencyData(bins)
    const average = bins.reduce((sum, value) => sum + value, 0) / bins.length
    const nextSpeaking = average > 14
    if (nextSpeaking !== speaking) {
      speaking = nextSpeaking
      onChange(speaking)
    }
    frame = requestAnimationFrame(tick)
  }

  frame = requestAnimationFrame(tick)

  return () => {
    cancelAnimationFrame(frame)
    source.disconnect()
    analyser.disconnect()
    void audioContext.close()
  }
}
