"use client"

import { GlassPanel } from "@/components/ui/glass-panel"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

type SeatProps = {
  label: string
  name: string
  bid?: number | string
  books?: number
  isTurn?: boolean
  isPartner?: boolean
  isSelf?: boolean
  isSpeaking?: boolean
  className?: string
}

export function Seat({
  label,
  name,
  bid,
  books = 0,
  isTurn,
  isPartner,
  isSelf,
  isSpeaking,
  className,
}: SeatProps) {
  return (
    <GlassPanel
      glow={isTurn ? "turn" : isPartner ? "us" : "none"}
      className={cn(
        "px-3 py-2 text-center min-w-[100px]",
        isSelf && "border-team-us/40",
        !isPartner && !isSelf && "border-team-them/30",
        className
      )}
    >
      {isTurn && (
        <div className="mb-1 h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-2/3 animate-pulse rounded-full bg-turn-active" />
        </div>
      )}
      <p className="text-[10px] font-semibold uppercase tracking-wide text-white/50">{label}</p>
      <Avatar className={cn("mx-auto my-1 h-10 w-10", isSpeaking && "ring-2 ring-team-us ring-offset-2 ring-offset-felt")}>
        <AvatarFallback className="bg-felt-mid text-xs">{name.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <p className="truncate text-sm font-semibold text-white">{name}</p>
      <p className="text-[11px] text-white/60">
        Bid: {bid ?? "?"} · Books: {books}
      </p>
    </GlassPanel>
  )
}
