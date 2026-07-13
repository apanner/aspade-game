"use client"

import { Settings } from "lucide-react"
import { ConnectionBadge, type ConnectionStatus } from "./connection-badge"
import { RoundProgress } from "./round-progress"
import { EndGameControl } from "@/components/shell/end-game-control"
import { TableHudComms } from "@/components/table/table-hud-comms"
import { cn } from "@/lib/utils"

type TableHUDProps = {
  round: number
  totalRounds: number
  usScore: number
  themScore: number
  isIndividualMode?: boolean
  myRank?: number
  totalPlayers?: number
  spadesBroken?: boolean
  spadesJustBroken?: boolean
  connectionStatus?: ConnectionStatus
  phase?: "bidding" | "playing"
  tricksInRound?: number
  cardsPerRound?: number
  gameId?: string
  playerId?: string
  isHost?: boolean
  onOpenSettings?: () => void
  commsPlayers?: { id: string; name: string }[]
}

export function TableHUD({
  round,
  totalRounds,
  usScore,
  themScore,
  isIndividualMode = false,
  myRank,
  totalPlayers,
  spadesBroken,
  spadesJustBroken = false,
  connectionStatus = "connected",
  phase = "playing",
  tricksInRound = 0,
  cardsPerRound = 13,
  gameId,
  playerId,
  isHost = false,
  onOpenSettings,
  commsPlayers,
}: TableHUDProps) {
  const usLeading = isIndividualMode ? myRank === 1 : usScore > themScore
  const themLeading = !isIndividualMode && themScore > usScore

  return (
    <div className="shrink-0">
      <div className="table-hud-bar flex items-center justify-between gap-1.5">
        <ConnectionBadge status={connectionStatus} />
        <div className="table-hud-score flex-1 min-w-0 px-2.5 py-1 text-[10px] font-semibold tabular-nums">
          <span className="text-[#7e899d]">R{round}/{totalRounds}</span>
          {phase === "playing" && (
            <span className="text-[#5c6678] ml-1">· T{tricksInRound}/{cardsPerRound}</span>
          )}
          <span className="mx-1.5 text-[#3d4657]">|</span>
          {isIndividualMode ? (
            <>
              <span className={usLeading ? "text-[#8fa7ff]" : "text-[#8fa7ff]/75"}>{usScore}</span>
              {myRank != null && totalPlayers != null && (
                <span className="text-[#5c6678] ml-1">#{myRank}</span>
              )}
            </>
          ) : (
            <>
              <span className={usLeading ? "text-[#8fa7ff]" : "text-[#8fa7ff]/70"}>{usScore}</span>
              <span className="text-[#3d4657] mx-1">–</span>
              <span className={themLeading ? "text-[#ff7a45]" : "text-[#ff7a45]/70"}>{themScore}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {spadesBroken && (
            <span
              className={cn(
                "table-spades-badge",
                spadesJustBroken && "table-spades-badge--flash"
              )}
              title="Spades are broken"
            >
              ♠
            </span>
          )}
          {commsPlayers && playerId && (
            <TableHudComms myPlayerId={playerId} players={commsPlayers} />
          )}
          {gameId && playerId ? (
            <EndGameControl gameId={gameId} playerId={playerId} isHost={isHost} variant="icon" />
          ) : (
            <button
              type="button"
              aria-label="Settings"
              onClick={onOpenSettings}
              className="table-hud-icon-btn"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      <RoundProgress round={round} totalRounds={totalRounds} cardsPerRound={cardsPerRound} />
    </div>
  )
}
