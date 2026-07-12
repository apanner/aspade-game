"use client"

import { Mic, MicOff, Headphones, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useGameVoice } from "@/components/voice/game-voice-provider"
import { cn } from "@/lib/utils"

type VoiceChatBarProps = {
  className?: string
}

export function VoiceChatBar({ className }: VoiceChatBarProps) {
  const {
    isSupported,
    isJoined,
    isConnecting,
    isMicOn,
    participantCount,
    error,
    toggleMic,
    joinVoice,
    isRequestingMicPermission,
    micPermission,
    needsMicPermission,
  } = useGameVoice()

  if (!isSupported) {
    return (
      <div
        className={cn(
          "flex items-center justify-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-2 text-xs text-muted-foreground",
          className
        )}
      >
        Voice chat not supported in this browser
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-2 py-1.5 backdrop-blur-md shadow-lg",
        className
      )}
    >
      <div className="flex items-center gap-1.5 px-2 text-xs text-white/70">
        <Headphones className="h-3.5 w-3.5" />
        <span>{participantCount || (isJoined ? 1 : 0)} live</span>
      </div>

      {isConnecting ? (
        <Button type="button" size="sm" variant="ghost" disabled className="h-9 rounded-full px-3">
          <Loader2 className="h-4 w-4 animate-spin" />
          Connecting…
        </Button>
      ) : !isJoined ? (
        <Button
          type="button"
          size="sm"
          className="h-9 rounded-full bg-team-us/20 border border-team-us/40 px-3 text-team-us hover:bg-team-us/30"
          disabled={isRequestingMicPermission}
          onClick={() => void joinVoice()}
        >
          <Headphones className="h-4 w-4 mr-1.5" />
          {isRequestingMicPermission
            ? "Allowing…"
            : micPermission !== "granted" && needsMicPermission
              ? "Allow & join"
              : "Join voice"}
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          variant={isMicOn ? "default" : "outline"}
          className={cn(
            "h-9 rounded-full px-3",
            isMicOn ? "bg-team-us text-black hover:bg-team-us/90" : "border-white/15"
          )}
          onClick={() => void toggleMic()}
          aria-pressed={isMicOn}
          aria-label={isMicOn ? "Mute microphone" : "Unmute microphone"}
        >
          {isMicOn ? <Mic className="h-4 w-4 mr-1.5" /> : <MicOff className="h-4 w-4 mr-1.5" />}
          {isMicOn ? "Mic on" : "Mic off"}
        </Button>
      )}

      {error ? (
        <span className="max-w-[140px] truncate px-1 text-[10px] text-destructive" title={error}>
          {error}
        </span>
      ) : null}
    </div>
  )
}
