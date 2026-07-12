"use client"

import Link from "next/link"
import { Trophy, ArrowRight, Home, TrendingUp, TrendingDown } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import type { Game } from "@/lib/api"
import { cn } from "@/lib/utils"
import { EndGameControl } from "@/components/shell/end-game-control"

type ScoreScreenProps = {
  game: Game
  myPlayerId?: string | null
  isHost: boolean
  onNextRound?: () => void
}

function isIndividualGame(game: Game): boolean {
  return game.teamConfig?.gameMode === "individual" || game.gameMode === "individual"
}

function getPlayerTotals(game: Game): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const playerId of Object.keys(game.players)) {
    totals[playerId] = 0
  }

  if (game.roundScores && Object.keys(game.roundScores).length > 0) {
    for (const roundScores of Object.values(game.roundScores)) {
      for (const [playerId, score] of Object.entries(roundScores)) {
        if (totals[playerId] !== undefined) {
          totals[playerId] += Number(score)
        }
      }
    }
    return totals
  }

  for (const round of game.rounds ?? []) {
    if (round.status === "completed" && round.scores) {
      for (const [key, score] of Object.entries(round.scores)) {
        if (totals[key] !== undefined) {
          totals[key] += Number(score)
        }
      }
    }
  }

  return totals
}

function getIndividualStandings(game: Game, myPlayerId?: string | null) {
  const totals = getPlayerTotals(game)
  const standings = Object.entries(game.players)
    .map(([id, player]) => ({
      id,
      name: player.name,
      score: totals[id] ?? 0,
      isMe: id === myPlayerId,
    }))
    .sort((a, b) => b.score - a.score)

  const myIndex = standings.findIndex((s) => s.isMe)
  const myScore = myIndex >= 0 ? standings[myIndex].score : 0
  const rank = myIndex >= 0 ? myIndex + 1 : standings.length
  const won = rank === 1 && standings.length > 1

  return { standings, myScore, rank, won, totalPlayers: standings.length }
}

function getTeamScores(
  game: Game,
  myPlayerId?: string | null
): { us: number; them: number; roundUs: number; roundThem: number } {
  const myTeam = myPlayerId ? game.players[myPlayerId]?.team : "team1"
  let us = 0
  let them = 0
  let roundUs = 0
  let roundThem = 0

  const currentRound = game.rounds?.[game.currentRound - 1]
  const roundPlayerScores = currentRound?.scores ?? {}

  if (game.roundScores) {
    for (const round of Object.values(game.roundScores)) {
      for (const [pid, score] of Object.entries(round)) {
        const t = game.players[pid]?.team
        if (t === myTeam) us += score
        else them += score
      }
    }
  } else if (game.scores) {
    us = game.scores.team1 ?? 0
    them = game.scores.team2 ?? 0
  }

  for (const [pid, score] of Object.entries(roundPlayerScores)) {
    const t = game.players[pid]?.team
    const n = typeof score === "number" ? score : 0
    if (t === myTeam) roundUs += n
    else roundThem += n
  }

  return { us, them, roundUs, roundThem }
}

export function ScoreScreen({ game, myPlayerId, isHost, onNextRound }: ScoreScreenProps) {
  const isComplete = game.status === "completed"
  const individualMode = isIndividualGame(game)
  const individual = individualMode ? getIndividualStandings(game, myPlayerId) : null
  const { us, them, roundUs, roundThem } = getTeamScores(game, myPlayerId)
  const weWonRound = roundUs > roundThem
  const weWonGame = individualMode ? !!individual?.won : us > them

  return (
    <div className="felt-page flex min-h-[100dvh] flex-col items-center justify-center p-6 gap-6 relative overflow-hidden">
      {myPlayerId && !isComplete && (
        <div className="absolute top-4 right-4 z-20">
          <EndGameControl
            gameId={game.id}
            playerId={myPlayerId}
            isHost={isHost}
            variant="ghost"
          />
        </div>
      )}
      {isComplete && weWonGame && (
        <div className="celebration-particles pointer-events-none absolute inset-0" aria-hidden />
      )}

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center space-y-2 relative z-10"
      >
        {isComplete ? (
          <>
            <Trophy className="h-14 w-14 text-win-gold mx-auto drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]" />
            <h1 className="text-3xl font-bold text-win-gold font-display">
              {weWonGame ? "VICTORY!" : "GAME OVER"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {weWonGame ? "Your team dominated the table" : "Better luck next round"}
            </p>
          </>
        ) : (
          <>
            <p className="phase-label">Round complete</p>
            <h1 className="text-2xl font-bold font-display">
              Round {game.currentRound} of {game.totalRounds}
            </h1>
            <p
              className={cn(
                "text-sm font-semibold flex items-center justify-center gap-1",
                weWonRound ? "text-turn-active" : "text-team-them"
              )}
            >
              {weWonRound ? (
                <>
                  <TrendingUp className="w-4 h-4" /> Round won!
                </>
              ) : roundUs === roundThem ? (
                "Round tied"
              ) : (
                <>
                  <TrendingDown className="w-4 h-4" /> They took the round
                </>
              )}
            </p>
          </>
        )}
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="glass-panel w-full max-w-sm p-6 relative z-10"
      >
        {individualMode && individual ? (
          <div className="space-y-3">
            <div className="text-center rounded-xl p-4 glow-us bg-team-us/10">
              <p className="text-xs uppercase tracking-widest text-team-us mb-1">Your score</p>
              <p className="text-5xl font-bold text-team-us font-display">{individual.myScore}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Rank {individual.rank} of {individual.totalPlayers}
              </p>
            </div>
            {isComplete && (
              <ul className="space-y-2">
                {individual.standings.map((entry, index) => (
                  <li
                    key={entry.id}
                    className={cn(
                      "flex items-center justify-between rounded-lg px-3 py-2",
                      entry.isMe ? "bg-team-us/10 border border-team-us/30" : "bg-white/5"
                    )}
                  >
                    <span className="text-sm font-medium">
                      {index + 1}. {entry.name}
                      {entry.isMe && <span className="text-team-us ml-1">(you)</span>}
                    </span>
                    <span className="font-bold tabular-nums text-team-us">{entry.score}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className={cn("rounded-xl p-4 transition-all", us >= them && "glow-us bg-team-us/10")}>
              <p className="text-xs uppercase tracking-widest text-team-us mb-1">US</p>
              <p className="text-5xl font-bold text-team-us font-display">{us}</p>
              {!isComplete && roundUs !== 0 && (
                <p className="text-xs text-team-us/80 mt-1">+{roundUs} this round</p>
              )}
            </div>
            <div className={cn("rounded-xl p-4 transition-all", them > us && "glow-them bg-team-them/10")}>
              <p className="text-xs uppercase tracking-widest text-team-them mb-1">THEM</p>
              <p className="text-5xl font-bold text-team-them font-display">{them}</p>
              {!isComplete && roundThem !== 0 && (
                <p className="text-xs text-team-them/80 mt-1">+{roundThem} this round</p>
              )}
            </div>
          </div>
        )}
      </motion.div>

      <div className="flex flex-col gap-3 w-full max-w-sm relative z-10">
        {!isComplete && isHost && onNextRound && (
          <Button className="btn-pill-primary h-14 text-base" onClick={onNextRound}>
            Deal next round
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        )}
        {isComplete && (
          <Button asChild className="btn-pill-primary h-14">
            <Link href="/dashboard">
              <Home className="w-5 h-5 mr-2" />
              Back to dashboard
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}
