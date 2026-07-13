"use client"

import { Users } from "lucide-react"
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
        "w-full text-left rounded-xl border px-3.5 py-3 transition-all active:scale-[0.99]",
        isLive && "border-[#3155e7]/60 bg-[#17285f]",
        isLobby && "border-[#ff7a45]/50 bg-[#ff7a45]/10",
        !isLive && !isLobby && "border-[#252c39] bg-[#121722]"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-[14px] text-white truncate">{title}</p>
        {isLive && <span className="lobby-live-badge shrink-0">Live</span>}
        {isLobby && (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-orange-300/90 shrink-0">
            Lobby
          </span>
        )}
      </div>
      <div className="mt-1.5 flex items-center gap-3 text-[11px] text-white/50">
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          {playerCount}/4
        </span>
        {currentRound > 0 && (
          <span>
            R{currentRound}/{totalRounds}
          </span>
        )}
      </div>
    </button>
  )
}
