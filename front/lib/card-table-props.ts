import type { Game } from './api-service'
import type { CardTableProps } from '@/components/card-table/card-table'
import type { CardCode } from '@aspade/engine/types'

function getTeamCumulativeScores(game: Game, myPlayerId: string): { usScore: number; themScore: number } {
  const myTeam = game.players[myPlayerId]?.team
  let usScore = 0
  let themScore = 0

  if (game.roundScores) {
    for (const roundScores of Object.values(game.roundScores)) {
      for (const [playerId, score] of Object.entries(roundScores)) {
        const team = game.players[playerId]?.team
        if (team && team === myTeam) {
          usScore += score
        } else {
          themScore += score
        }
      }
    }
  }

  return { usScore, themScore }
}

export function buildCardTableProps(game: Game, myPlayerId: string): CardTableProps | null {
  if (game.playMode !== 'live' || !game.liveState) {
    return null
  }

  const live = game.liveState
  if (live.phase !== 'playing') {
    return null
  }

  const mySeat = live.seats?.[myPlayerId]
  if (mySeat === undefined) {
    return null
  }

  const myHand = (live.myHand ?? []) as CardCode[]
  const legalCards = (live as { legalCards?: CardCode[] }).legalCards
  const { usScore, themScore } = getTeamCumulativeScores(game, myPlayerId)
  const myTeam = game.players[myPlayerId]?.team

  const players = Object.entries(game.players).map(([id, player]) => ({
    id,
    name: player.name,
    seat: live.seats?.[id] ?? 0,
    team: player.team,
    bid: live.roundBids?.[id],
    books: live.tricksWon?.[id] ?? 0,
    isPartner: id !== myPlayerId && player.team != null && player.team === myTeam,
  }))

  const trickPlays = live.currentTrick?.plays?.map((play) => ({
    playerId: play.playerId,
    card: play.card as CardCode,
    seat: play.seat,
  }))

  const lastCompleted = live.completedTricks?.[live.completedTricks.length - 1]
  const winningCard =
    lastCompleted?.winnerId && (!live.currentTrick?.plays?.length || live.currentTrick.plays.length === 0)
      ? lastCompleted.plays.find((p) => p.playerId === lastCompleted.winnerId)?.card ?? null
      : null

  return {
    round: game.currentRound,
    totalRounds: game.totalRounds,
    usScore,
    themScore,
    myPlayerId,
    mySeat,
    myHand,
    legalCards,
    players,
    currentTurnId: live.currentTurn ?? null,
    trickPlays,
    winningCard,
    spadesBroken: live.spadesBroken,
    turnExpiresAt: live.turnExpiresAt ?? null,
    onPlayCard: async () => {},
  }
}
