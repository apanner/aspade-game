"use client"

import { Settings } from "lucide-react"
import { ConnectionBadge, type ConnectionStatus } from "./connection-badge"
import { RoundProgress } from "./round-progress"
import { EndGameControl } from "@/components/shell/end-game-control"
import { TableHudComms } from "@/components/table/table-hud-comms"

type TableHUDProps = {
  round: number
  totalRounds: number
  usScore: number
  themScore: number
  isIndividualMode?: boolean
  myRank?: number
  totalPlayers?: number
  spadesBroken?: boolean
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
      <div className="flex items-center justify-between gap-1.5">
        <ConnectionBadge status={connectionStatus} />
        <div className="flex-1 min-w-0 rounded-lg border border-white/[0.07] bg-black/30 px-2 py-1 text-[10px] font-medium tabular-nums">
          <span className="text-white/45">R{round}/{totalRounds}</span>
          {phase === "playing" && (
            <span className="text-white/35 ml-1">· T{tricksInRound}/{cardsPerRound}</span>
          )}
          <span className="mx-1.5 text-white/20">|</span>
          {isIndividualMode ? (
            <>
              <span className={usLeading ? "text-[#8fa7ff]" : "text-[#8fa7ff]/80"}>{usScore}</span>
              {myRank != null && totalPlayers != null && (
                <span className="text-white/40 ml-1">#{myRank}</span>
              )}
            </>
          ) : (
            <>
              <span className={usLeading ? "text-[#8fa7ff]" : "text-[#8fa7ff]/75"}>{usScore}</span>
              <span className="text-white/25 mx-1">–</span>
              <span className={themLeading ? "text-[#ff7a45]" : "text-[#ff7a45]/75"}>{themScore}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {spadesBroken && (
            <span className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white/90 border border-white/20 bg-white/10">
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
