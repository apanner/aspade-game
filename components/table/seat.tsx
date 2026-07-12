"use client"

import { GlassPanel } from "@/components/ui/glass-panel"
import { ThinkingDots } from "@/components/shell/thinking-dots"
import { VoiceWaveform } from "@/components/voice/voice-waveform"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Bot } from "lucide-react"

type SeatProps = {
  label: string
  name: string
  bid?: number | string
  books?: number
  score?: number
  isTurn?: boolean
  isPartner?: boolean
  isSelf?: boolean
  isComputer?: boolean
  isThinking?: boolean
  isIndividualMode?: boolean
  isRecentWinner?: boolean
  isSpeaking?: boolean
  className?: string
}

export function Seat({
  label,
  name,
  bid,
  books = 0,
  score,
  isTurn,
  isPartner,
  isSelf,
  isComputer,
  isThinking,
  isIndividualMode = false,
  isRecentWinner = false,
  isSpeaking = false,
  className,
}: SeatProps) {
  const displayName = name.length > 9 ? `${name.slice(0, 8)}…` : name

  return (
    <GlassPanel
      glow={
        isSpeaking ? "us" : isRecentWinner ? "turn" : isTurn ? "turn" : isPartner ? "us" : "none"
      }
      className={cn(
        "seat-card relative min-w-[80px] max-w-[84px] px-1.5 py-1.5 text-center transition-all duration-300",
        isSpeaking && "seat-card--speaking",
        isRecentWinner && "scale-[1.04] border-turn-active/60",
        isSelf && "border-team-us/45",
        !isIndividualMode && isPartner && !isSelf && "border-team-us/25",
        !isIndividualMode && !isPartner && !isSelf && "border-team-them/20",
        isIndividualMode && !isSelf && "border-white/10",
        isTurn && "scale-[1.03]",
        className
      )}
    >
      {isTurn && (
        <div className="mb-1 h-0.5 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-2/3 animate-pulse rounded-full bg-turn-active" />
        </div>
      )}

      <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-white/45">{label}</p>

      <Avatar
        className={cn(
          "mx-auto my-0.5 h-7 w-7 border border-white/10",
          isTurn && "ring-2 ring-turn-active ring-offset-1 ring-offset-[#062a20]",
          isSpeaking && "ring-2 ring-team-us/80 ring-offset-1 ring-offset-[#062a20]",
          isComputer && "ring-1 ring-purple-400/40"
        )}
      >
        <AvatarFallback
          className={cn(
            "text-[10px] font-bold",
            isSelf || (!isIndividualMode && isPartner)
              ? "bg-team-us/20 text-team-us"
              : "bg-white/10 text-white/75"
          )}
        >
          {isComputer ? <Bot className="h-4 w-4" /> : displayName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex items-center justify-center gap-0.5 min-h-[14px]">
        <p className="truncate text-[10px] font-semibold text-white" title={name}>
          {displayName}
        </p>
        {isSpeaking && <VoiceWaveform active barCount={4} />}
      </div>

      {isThinking ? (
        <ThinkingDots label="" className="mt-0.5 justify-center" />
      ) : (
        <p className="mt-0.5 text-[9px] text-white/55 tabular-nums">
          {bid ?? "?"} · {books}bk
          {score !== undefined && (
            <span className="block text-[9px] font-bold text-team-us">{score}pt</span>
          )}
        </p>
      )}
    </GlassPanel>
  )
}
