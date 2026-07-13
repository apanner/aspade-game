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
  const displayName = name.length > 8 ? `${name.slice(0, 7)}…` : name

  return (
    <GlassPanel
      glow={isSpeaking ? "us" : isTurn ? "turn" : isPartner ? "us" : "none"}
      className={cn(
        "seat-card relative w-[68px] px-1 py-1 text-center transition-all duration-200",
        isSpeaking && "seat-card--speaking",
        isRecentWinner && "ring-1 ring-[#ff7a45]/50",
        isSelf && "border-[#8fa7ff]/25",
        !isIndividualMode && isPartner && !isSelf && "border-[#8fa7ff]/15",
        !isIndividualMode && !isPartner && !isSelf && "border-[#ff7a45]/15",
        isIndividualMode && !isSelf && "border-white/[0.08]",
        isTurn && "border-[#ff7a45]/35",
        className
      )}
    >
      <p className="text-[7px] font-bold uppercase tracking-[0.14em] text-[#5c6678]">{label}</p>

      <Avatar
        className={cn(
          "mx-auto my-0.5 h-6 w-6 border border-[#252c39]",
          isTurn && "ring-2 ring-[#ff7a45]/60 ring-offset-1 ring-offset-[#080b12]",
          isSpeaking && "ring-2 ring-[#8fa7ff]/50 ring-offset-1 ring-offset-[#080b12]"
        )}
      >
        <AvatarFallback
          className={cn(
            "text-[9px] font-semibold",
            isSelf || (!isIndividualMode && isPartner)
              ? "bg-[#3155e7]/20 text-[#8fa7ff]"
              : "bg-white/[0.06] text-white/70"
          )}
        >
          {isComputer ? <Bot className="h-3 w-3" /> : displayName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex items-center justify-center gap-0.5 min-h-[12px]">
        <p className="truncate text-[9px] font-semibold text-[#f6f1e8]" title={name}>
          {displayName}
        </p>
        {isSpeaking && <VoiceWaveform active barCount={3} />}
      </div>

      {isThinking ? (
        <ThinkingDots label="" className="mt-0.5 justify-center scale-90" />
      ) : (
        <p className="mt-0.5 text-[8px] text-white/50 tabular-nums leading-tight">
          {bid ?? "?"}·{books}
          {score !== undefined && <span className="text-[#8fa7ff]/80"> {score}</span>}
        </p>
      )}
    </GlassPanel>
  )
}
