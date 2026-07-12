import type { Game } from './game-utils'
import { syncLiveGameScores } from './game-utils'
import type { EngineGame, EngineResult, LiveState } from '@aspade/engine/types'
import { SpadesEngine } from './spades-engine'
import { getLegalCardsForPlayer, sanitizeLiveGameForPlayer } from './live-game-client'

export { getLegalCardsForPlayer, sanitizeLiveGameForPlayer }

export function toEngineGame(game: Game): EngineGame {
  return {
    id: game.id,
    hostId: game.hostId,
    playMode: game.playMode ?? 'manual',
    status: game.status,
    currentRound: game.currentRound,
    totalRounds: game.totalRounds,
    deckCount: game.deckCount,
    players: Object.fromEntries(
      Object.entries(game.players).map(([id, p]) => [
        id,
        {
          id: p.id,
          name: p.name,
          team: p.team,
          isTeamLeader: p.isTeamLeader,
        },
      ])
    ),
    rounds: game.rounds.map((r) => ({
      round: r.round,
      bids: { ...r.bids },
      tricks: { ...r.tricks },
      scores: { ...r.scores },
      status: r.status,
    })),
    liveState: game.liveState as LiveState | undefined,
    teamConfig: game.teamConfig
      ? {
          gameMode: game.teamConfig.gameMode,
          numberOfTeams: game.teamConfig.numberOfTeams,
          playersPerTeam: game.teamConfig.playersPerTeam,
        }
      : undefined,
  }
}

export function mergeEngineIntoGame(game: Game, result: EngineResult): Game {
  const eng = result.game
  game.playMode = eng.playMode
  game.status = eng.status as Game['status']
  game.state = eng.status
  game.currentRound = eng.currentRound
  if (eng.deckCount != null) {
    game.deckCount = eng.deckCount
  }
  game.liveState = eng.liveState as Game['liveState']

  if (eng.rounds.length > 0) {
    game.rounds = eng.rounds.map((r, i) => ({
      round: r.round ?? i + 1,
      bids: { ...r.bids },
      tricks: { ...r.tricks },
      scores: { ...r.scores },
      status: r.status as Game['rounds'][0]['status'],
    }))
  }

  const live = eng.liveState
  if (live && game.currentRound > 0) {
    const idx = game.currentRound - 1
    if (game.rounds[idx]) {
      game.rounds[idx].bids = { ...live.roundBids }
      game.rounds[idx].tricks = { ...live.tricksWon }
      if (live.phase === 'playing') {
        game.rounds[idx].status = 'playing'
      }
      if (live.phase === 'round_end') {
        game.rounds[idx].status = 'completed'
        if (game.rounds[idx].scores && Object.keys(game.rounds[idx].scores).length > 0) {
          if (!game.roundScores) game.roundScores = {}
          game.roundScores[game.currentRound] = { ...game.rounds[idx].scores }
        }
      }
    }
  }

  game.lastActivity = Date.now()
  if (game.playMode === 'live') {
    syncLiveGameScores(game)
  }
  return game
}

/** Bootstrap the 4-seat card engine for games stuck in manual/scoring UI without liveState. */
export function healFourSeatCardTable(game: Game): boolean {
  const maxPlayers = game.maxPlayers ?? 4
  if (maxPlayers !== 4) return false

  const count = Object.keys(game.players).length
  if (count !== 4) return false
  if (game.liveState) return false

  const status = game.status || game.state
  if (!status || status === 'lobby' || status === 'completed' || status === 'cancelled') {
    return false
  }

  game.playMode = 'live'
  if (game.currentRound < 1) {
    game.currentRound = 1
  }
  if (!game.rounds?.length) {
    game.rounds = [{ round: 1, bids: {}, tricks: {}, scores: {}, status: 'bidding' }]
  }

  try {
    const result = applyLiveEngineAction(game, { type: 'START_LIVE_GAME' })
    mergeEngineIntoGame(game, result)
    return true
  } catch {
    return false
  }
}

export function healStuckLiveTrick(game: Game): boolean {
  const live = game.liveState as LiveState | undefined
  if (!live || live.phase !== 'playing') return false
  if (!live.currentTrick || live.currentTrick.plays.length !== 4) return false

  try {
    const result = applyLiveEngineAction(game, { type: 'RESOLVE_TRICK' })
    mergeEngineIntoGame(game, result)
    return true
  } catch {
    return false
  }
}

export function applyLiveEngineAction(
  game: Game,
  action: Parameters<typeof SpadesEngine.apply>[1],
  seed?: number
): EngineResult {
  const engineGame = toEngineGame(game)
  return SpadesEngine.apply(engineGame, action, seed)
}
