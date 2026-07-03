import type { EngineGame, EngineRound } from './types'

export interface TeamScoreInput {
  teamId: string
  playerIds: string[]
  bid: number
  tricksWon: number
}

export function computeTeamRoundScore(bid: number, tricksWon: number): number {
  if (tricksWon >= bid) {
    const overtricks = tricksWon - bid
    return bid * 10 + overtricks
  }
  return bid * -10
}

export function aggregateTeamBid(playerIds: string[], bids: Record<string, number>): number {
  return playerIds.reduce((sum, id) => sum + (bids[id] ?? 0), 0)
}

export function aggregateTeamTricks(playerIds: string[], tricks: Record<string, number>): number {
  return playerIds.reduce((sum, id) => sum + (tricks[id] ?? 0), 0)
}

export function applyRoundScoresToGame(
  game: EngineGame,
  roundIndex: number,
  teamScores: Record<string, number>
): EngineGame {
  const round = game.rounds[roundIndex]
  if (!round) return game

  const updatedRound: EngineRound = {
    ...round,
    scores: { ...round.scores, ...teamScores },
    status: 'completed',
  }

  const rounds = [...game.rounds]
  rounds[roundIndex] = updatedRound

  return { ...game, rounds }
}

export function getTeamsFromPlayers(game: EngineGame): Record<string, string[]> {
  const teams: Record<string, string[]> = {}
  for (const player of Object.values(game.players)) {
    const team = player.team ?? 'solo'
    if (!teams[team]) teams[team] = []
    teams[team].push(player.id)
  }
  return teams
}
