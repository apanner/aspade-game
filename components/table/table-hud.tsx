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
      <div className="flex items-center justify-between gap-2 px-2 py-2.5">
      <ConnectionBadge status={connectionStatus} />
      <div className="rounded-2xl border border-white/10 bg-black/45 px-3.5 py-1.5 text-xs font-semibold backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.35)]">
        <span className="text-[9px] text-white/50 mr-1.5">
          R{round}/{totalRounds}
          {phase === "bidding" && <span className="text-team-us ml-1">· BID</span>}
          {phase === "playing" && (
            <span className="text-white/40 ml-1">
              · T{tricksInRound}/{cardsPerRound}
            </span>
          )}
        </span>
        {isIndividualMode ? (
          <>
            <span className={usLeading ? "text-team-us drop-shadow-[0_0_6px_rgba(0,229,255,0.5)]" : "text-team-us"}>
              YOU {usScore}
            </span>
            {myRank != null && totalPlayers != null && (
              <>
                <span className="mx-2 text-white/25">|</span>
                <span className="text-white/55">#{myRank}/{totalPlayers}</span>
              </>
            )}
          </>
        ) : (
          <>
            <span className={usLeading ? "text-team-us drop-shadow-[0_0_6px_rgba(0,229,255,0.5)]" : "text-team-us"}>
              US {usScore}
            </span>
            <span className="mx-2 text-white/25">|</span>
            <span className={themLeading ? "text-team-them drop-shadow-[0_0_6px_rgba(255,107,53,0.5)]" : "text-team-them"}>
              THEM {themScore}
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        {spadesBroken && (
          <span className="rounded-full bg-purple-500/25 px-2 py-0.5 text-[10px] font-bold text-purple-200 border border-purple-400/30 animate-pulse">
            ♠
          </span>
        )}
        {commsPlayers && playerId && (
          <TableHudComms myPlayerId={playerId} players={commsPlayers} />
        )}
        {gameId && playerId ? (
          <EndGameControl
            gameId={gameId}
            playerId={playerId}
            isHost={isHost}
            variant="icon"
          />
        ) : (
          <button
            type="button"
            aria-label="Settings"
            onClick={onOpenSettings}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
      </div>
      </div>
      <RoundProgress round={round} totalRounds={totalRounds} cardsPerRound={cardsPerRound} />
    </div>
  )
}
