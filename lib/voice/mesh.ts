import { PEER_CONNECTION_CONFIG } from "./config"
import { getSharedAudioContext } from "./mobile-audio"
import type { VoiceSignalMessage } from "./types"

type SendSignalFn = (message: Omit<VoiceSignalMessage, "id" | "at" | "gameId">) => Promise<void>

type MeshOptions = {
  gameId: string
  playerId: string
  sendSignal: SendSignalFn
  onRemoteStream: (playerId: string, stream: MediaStream) => void
  onRemoteLeft: (playerId: string) => void
  onSpeakingChange: (playerId: string, speaking: boolean) => void
  onPeerStateChange?: (playerId: string, state: RTCPeerConnectionState) => void
}

type PeerEntry = {
  connection: RTCPeerConnection
  pendingIce: RTCIceCandidateInit[]
  cleanupSpeaking?: () => void
  makingOffer: boolean
}

export class VoiceMesh {
  private readonly peers = new Map<string, PeerEntry>()
  private localStream: MediaStream | null = null
  private localSpeakingCleanup: (() => void) | null = null
  private voicePeers = new Set<string>()
  private stopped = false

  constructor(private readonly options: MeshOptions) {}

  async start(localStream: MediaStream): Promise<void> {
    this.stopped = false
    this.localStream = localStream
    this.localSpeakingCleanup = trackSpeaking(localStream, (speaking) => {
      this.options.onSpeakingChange(this.options.playerId, speaking)
    })

    await this.options.sendSignal({
      from: this.options.playerId,
      to: "*",
      type: "join",
    })
  }

  /** Keep WebRTC mesh in sync with who is currently in the voice room (Supabase Presence). */
  async syncVoicePeers(remoteVoiceIds: string[]): Promise<void> {
    if (this.stopped || !this.localStream) return

    const next = new Set(remoteVoiceIds.filter((id) => id && id !== this.options.playerId))

    for (const id of this.voicePeers) {
      if (!next.has(id)) {
        this.removePeer(id)
      }
    }

    this.voicePeers = next

    for (const remoteId of next) {
      if (this.shouldInitiate(remoteId) && !this.peers.has(remoteId)) {
        await this.createOffer(remoteId)
      }
    }
  }

  async stop(): Promise<void> {
    this.stopped = true
    await this.options
      .sendSignal({
        from: this.options.playerId,
        to: "*",
        type: "leave",
      })
      .catch(() => {})

    this.localSpeakingCleanup?.()
    this.localSpeakingCleanup = null

    for (const [playerId, entry] of this.peers.entries()) {
      entry.cleanupSpeaking?.()
      entry.connection.close()
      this.options.onRemoteLeft(playerId)
    }
    this.peers.clear()
    this.voicePeers.clear()

    // Do not stop local tracks here — provider owns mic stream lifecycle.
    this.localStream = null
  }

  setMicEnabled(enabled: boolean): void {
    this.localStream?.getAudioTracks().forEach((track) => {
      track.enabled = enabled
    })
  }

  replaceLocalStream(stream: MediaStream): void {
    this.localStream = stream
    for (const entry of this.peers.values()) {
      const senders = entry.connection.getSenders()
      const audioTrack = stream.getAudioTracks()[0]
      if (!audioTrack) continue
      const audioSender = senders.find((sender) => sender.track?.kind === "audio" || !sender.track)
      if (audioSender) {
        void audioSender.replaceTrack(audioTrack)
      } else {
        entry.connection.addTrack(audioTrack, stream)
      }
    }
  }

  async handleRemoteSignal(signal: VoiceSignalMessage): Promise<void> {
    if (this.stopped || signal.from === this.options.playerId) return

    if (signal.type === "join") {
      this.voicePeers.add(signal.from)
      if (this.shouldInitiate(signal.from) && !this.peers.has(signal.from)) {
        await this.createOffer(signal.from)
      }
      return
    }

    if (signal.type === "leave") {
      this.voicePeers.delete(signal.from)
      this.removePeer(signal.from)
      return
    }

    if (signal.to !== this.options.playerId) return

    if (signal.type === "offer") {
      await this.handleOffer(signal.from, signal.payload as RTCSessionDescriptionInit)
      return
    }

    if (signal.type === "answer") {
      await this.handleAnswer(signal.from, signal.payload as RTCSessionDescriptionInit)
      return
    }

    if (signal.type === "ice-candidate") {
      await this.handleIceCandidate(signal.from, signal.payload as RTCIceCandidateInit)
    }
  }

  private shouldInitiate(remoteId: string): boolean {
    return this.options.playerId < remoteId
  }

  private async createOffer(remoteId: string): Promise<void> {
    const entry = this.ensurePeer(remoteId)
    if (entry.makingOffer) return
    entry.makingOffer = true
    try {
      const offer = await entry.connection.createOffer()
      await entry.connection.setLocalDescription(offer)
      await this.options.sendSignal({
        from: this.options.playerId,
        to: remoteId,
        type: "offer",
        payload: offer,
      })
    } finally {
      entry.makingOffer = false
    }
  }

  private async handleOffer(remoteId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    const entry = this.ensurePeer(remoteId)
    const polite = !this.shouldInitiate(remoteId)

    if (entry.makingOffer) {
      if (!polite) return
      // Glare: polite peer rolls back and accepts remote offer.
      await entry.connection.setLocalDescription({ type: "rollback" }).catch(() => {})
    }

    await entry.connection.setRemoteDescription(offer)
    await this.flushPendingIce(remoteId)
    const answer = await entry.connection.createAnswer()
    await entry.connection.setLocalDescription(answer)
    await this.options.sendSignal({
      from: this.options.playerId,
      to: remoteId,
      type: "answer",
      payload: answer,
    })
  }

  private async handleAnswer(remoteId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const entry = this.peers.get(remoteId)
    if (!entry) return
    if (entry.connection.signalingState !== "have-local-offer") return
    await entry.connection.setRemoteDescription(answer)
    await this.flushPendingIce(remoteId)
  }

  private async handleIceCandidate(remoteId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const entry = this.peers.get(remoteId)
    if (!entry || !candidate) return

    if (!entry.connection.remoteDescription) {
      entry.pendingIce.push(candidate)
      return
    }

    try {
      await entry.connection.addIceCandidate(candidate)
    } catch {
      // Ignore stale candidates.
    }
  }

  private async flushPendingIce(remoteId: string): Promise<void> {
    const entry = this.peers.get(remoteId)
    if (!entry || !entry.connection.remoteDescription) return
    const queued = entry.pendingIce.splice(0, entry.pendingIce.length)
    for (const candidate of queued) {
      try {
        await entry.connection.addIceCandidate(candidate)
      } catch {
        // Ignore.
      }
    }
  }

  private ensurePeer(remoteId: string): PeerEntry {
    const existing = this.peers.get(remoteId)
    if (existing) return existing

    const connection = new RTCPeerConnection(PEER_CONNECTION_CONFIG)
    const entry: PeerEntry = {
      connection,
      pendingIce: [],
      makingOffer: false,
    }
    this.peers.set(remoteId, entry)

    this.localStream?.getTracks().forEach((track) => {
      connection.addTrack(track, this.localStream!)
    })

    connection.onicecandidate = (event) => {
      if (!event.candidate || this.stopped) return
      void this.options.sendSignal({
        from: this.options.playerId,
        to: remoteId,
        type: "ice-candidate",
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
      this.options.onPeerStateChange?.(remoteId, connection.connectionState)
      if (connection.connectionState === "failed") {
        // Try ICE restart once.
        if (this.shouldInitiate(remoteId)) {
          void this.restartIce(remoteId)
        }
      }
      if (connection.connectionState === "closed") {
        this.removePeer(remoteId)
      }
    }

    return entry
  }

  private async restartIce(remoteId: string): Promise<void> {
    const entry = this.peers.get(remoteId)
    if (!entry || this.stopped) return
    try {
      const offer = await entry.connection.createOffer({ iceRestart: true })
      await entry.connection.setLocalDescription(offer)
      await this.options.sendSignal({
        from: this.options.playerId,
        to: remoteId,
        type: "offer",
        payload: offer,
      })
    } catch {
      this.removePeer(remoteId)
    }
  }

  private removePeer(remoteId: string): void {
    const entry = this.peers.get(remoteId)
    if (!entry) return
    entry.cleanupSpeaking?.()
    entry.connection.onicecandidate = null
    entry.connection.ontrack = null
    entry.connection.onconnectionstatechange = null
    entry.connection.close()
    this.peers.delete(remoteId)
    this.options.onRemoteLeft(remoteId)
    this.options.onSpeakingChange(remoteId, false)
  }
}

function trackSpeaking(stream: MediaStream, onChange: (speaking: boolean) => void): () => void {
  const shared = getSharedAudioContext()
  const audioContext = shared ?? new AudioContext()
  const ownsContext = !shared
  if (audioContext.state === "suspended") {
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
    if (ownsContext) {
      void audioContext.close()
    }
  }
}
