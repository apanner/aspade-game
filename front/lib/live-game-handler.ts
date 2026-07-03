import type { Game } from './game-utils'
import type { EngineGame, EngineResult, LiveState, CardCode } from '@aspade/engine/types'
import { SpadesEngine, getLegalPlays } from './spades-engine'

export function toEngineGame(game: Game): EngineGame {
  return {
    id: game.id,
    playMode: game.playMode ?? 'manual',
    status: game.status,
    currentRound: game.currentRound,
    totalRounds: game.totalRounds,
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
  return game
}

export function applyLiveEngineAction(
  game: Game,
  action: Parameters<typeof SpadesEngine.apply>[1],
  seed?: number
): EngineResult {
  const engineGame = toEngineGame(game)
  return SpadesEngine.apply(engineGame, action, seed)
}

export function getLegalCardsForPlayer(game: Game, playerId: string): CardCode[] {
  const live = game.liveState as LiveState | undefined
  if (!live || live.phase !== 'playing') return []
  const hand = live.hands?.[playerId] ?? (game.liveState as { myHand?: string[] })?.myHand ?? []
  return getLegalPlays(hand as CardCode[], live.currentTrick, live.spadesBroken)
}

export function sanitizeLiveGameForPlayer(game: Game, playerId: string): Game {
  if (game.playMode !== 'live' || !game.liveState) {
    return game
  }

  const live = { ...game.liveState } as Record<string, unknown>
  const hands = live.hands as Record<string, string[]> | undefined
  const myHand = hands?.[playerId] ?? (live.myHand as string[] | undefined) ?? []

  delete live.hands
  live.myHand = myHand
  live.legalCards = getLegalCardsForPlayer({ ...game, liveState: game.liveState }, playerId)

  return {
    ...game,
    liveState: live as Game['liveState'],
  }
}
