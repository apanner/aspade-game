"use client"

import { useEffect, useState } from "react"
import {
  Headphones,
  Loader2,
  MessageSquare,
  Mic,
  MicOff,
  WifiOff,
} from "lucide-react"
import { useGameVoice } from "@/components/voice/game-voice-provider"
import { useGameChat } from "@/components/chat/game-chat-provider"
import { TableChatDrawer } from "@/components/chat/table-chat-drawer"
import { unlockVoiceAudio } from "@/lib/voice/mobile-audio"
import { cn } from "@/lib/utils"

type TableHudCommsProps = {
  myPlayerId: string
  players: { id: string; name: string }[]
}

export function TableHudComms({ myPlayerId, players }: TableHudCommsProps) {
  const {
    isSupported,
    isJoined,
    isConnecting,
    isMicOn,
    participantCount,
    signalingStatus,
    joinVoice,
    toggleMic,
    isRequestingMicPermission,
  } = useGameVoice()

  const { unreadCount, openDmWith, setOpenDmWith } = useGameChat()
  const [chatOpen, setChatOpen] = useState(false)

  useEffect(() => {
    if (openDmWith) setChatOpen(true)
  }, [openDmWith])

  if (!isSupported) {
    return (
      <button
        type="button"
        className="table-hud-icon-btn opacity-40"
        disabled
        aria-label="Voice not supported"
        title="Voice not supported on this browser"
      >
        <Headphones className="h-4 w-4" />
      </button>
    )
  }

  const signalingBlocked =
    signalingStatus === "unavailable" || signalingStatus === "error"
  const signalingBusy = signalingStatus === "connecting" || signalingStatus === "idle"

  const handleVoiceClick = () => {
    if (isConnecting || isRequestingMicPermission || signalingBlocked) return
    void unlockVoiceAudio()
    if (!isJoined) {
      if (signalingBusy) return
      void joinVoice()
      return
    }
    void toggleMic()
  }

  const title = signalingBlocked
    ? "Voice signaling offline (Supabase)"
    : signalingBusy && !isJoined
      ? "Connecting voice…"
      : !isJoined
        ? "Join voice chat"
        : isMicOn
          ? "Mute microphone"
          : "Unmute microphone"

  return (
    <>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={handleVoiceClick}
          disabled={
            isConnecting ||
            isRequestingMicPermission ||
            signalingBlocked ||
            (signalingBusy && !isJoined)
          }
          className={cn(
            "table-hud-icon-btn relative",
            isJoined && isMicOn && "table-hud-icon-btn--active",
            isJoined && !isMicOn && "table-hud-icon-btn--live",
            signalingBlocked && "opacity-50"
          )}
          aria-label={title}
          title={title}
        >
          {isConnecting || isRequestingMicPermission || (signalingBusy && !isJoined) ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : signalingBlocked ? (
            <WifiOff className="h-4 w-4" />
          ) : !isJoined ? (
            <Headphones className="h-4 w-4" />
          ) : isMicOn ? (
            <Mic className="h-4 w-4" />
          ) : (
            <MicOff className="h-4 w-4" />
          )}
          {isJoined && participantCount > 0 && (
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#8fa7ff] px-0.5 text-[8px] font-bold text-black">
              {participantCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setChatOpen(true)}
          className="table-hud-icon-btn relative"
          aria-label="Open chat"
          title="Chat"
        >
          <MessageSquare className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#ff7a45] px-0.5 text-[8px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </div>

      <TableChatDrawer
        open={chatOpen}
        onOpenChange={(nextOpen) => {
          setChatOpen(nextOpen)
          if (!nextOpen) setOpenDmWith(null)
        }}
        myPlayerId={myPlayerId}
        players={players}
      />
    </>
  )
}
