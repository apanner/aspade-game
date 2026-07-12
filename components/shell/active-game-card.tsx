"use client"

import { Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type ActiveGameCardProps = {
  title: string
  status: string
  playerCount?: number
  currentRound?: number
  totalRounds?: number
  onClick: () => void
}

export function ActiveGameCard({
  title,
  status,
  playerCount = 0,
  currentRound = 0,
  totalRounds = 13,
  onClick,
}: ActiveGameCardProps) {
  const isLive = status === "playing" || status === "bidding"
  const isLobby = status === "lobby"

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-xl border p-4 transition-all active:scale-[0.98]",
        isLive && "border-team-us/40 bg-team-us/5 glow-us",
        isLobby && "border-team-them/30 bg-team-them/5",
        !isLive && !isLobby && "border-white/10 bg-black/20"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="font-semibold truncate">{title}</p>
        {isLive && (
          <Badge className="bg-team-us/20 text-team-us border-team-us/40 text-[10px] shrink-0">
            <span className="live-dot mr-1" />
            LIVE
          </Badge>
        )}
        {isLobby && (
          <Badge variant="outline" className="border-team-them/40 text-team-them text-[10px] shrink-0">
            LOBBY
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          {playerCount}/4
        </span>
        {currentRound > 0 && (
          <span>
            R{currentRound}/{totalRounds}
          </span>
        )}
        <span className="capitalize">{status}</span>
      </div>
    </button>
  )
}
