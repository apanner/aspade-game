import { describe, expect, it } from 'vitest'
import { SpadesEngine } from '../index'
import type { CardCode, EngineGame } from '../types'
import { getLegalPlays } from '../legal-plays'

function makeGame(round: number): EngineGame {
  return {
    id: 'test',
    playMode: 'live',
    status: 'lobby',
    currentRound: round,
    totalRounds: 13,
    teamConfig: { gameMode: 'teams', numberOfTeams: 2, playersPerTeam: 2 },
    players: {
      p0: { id: 'p0', name: 'P0', team: 'A', isTeamLeader: true },
      p1: { id: 'p1', name: 'P1', team: 'B', isTeamLeader: true },
      p2: { id: 'p2', name: 'P2', team: 'A', isTeamLeader: false },
      p3: { id: 'p3', name: 'P3', team: 'B', isTeamLeader: false },
    },
    rounds: [{ round, bids: {}, tricks: {}, scores: {}, status: 'bidding' }],
  }
}

describe('progressive rounds', () => {
  it('round 1 deals 1 card per player and plays 1 trick', () => {
    let game = makeGame(1)
    let result = SpadesEngine.apply(game, { type: 'START_LIVE_GAME' }, 7)
    game = result.game

    expect(game.liveState?.cardsPerRound).toBe(1)
    for (const id of Object.keys(game.players)) {
      expect(game.liveState?.hands[id]?.length).toBe(1)
    }

    while (game.liveState?.phase === 'bidding' && game.liveState.currentTurn) {
      const turn = game.liveState.currentTurn
      result = SpadesEngine.apply(game, { type: 'SUBMIT_BID', playerId: turn, bid: 0 })
      game = result.game
    }

    while (game.liveState?.phase === 'playing') {
      const turn = game.liveState.currentTurn
      if (!turn) break
      const hand = game.liveState.hands[turn] ?? []
      const legal = getLegalPlays(hand, game.liveState.currentTrick, game.liveState.spadesBroken)
      if (legal.length === 0) break
      result = SpadesEngine.apply(game, {
        type: 'PLAY_CARD',
        playerId: turn,
        card: legal[0] as CardCode,
      })
      game = result.game
    }

    expect(game.liveState?.completedTricks.length).toBe(1)
    expect(game.status).toBe('scoring')
  })

  it('round 3 deals 3 cards per player', () => {
    const game = SpadesEngine.apply(makeGame(3), { type: 'START_LIVE_GAME' }, 9).game
    for (const id of Object.keys(game.players)) {
      expect(game.liveState?.hands[id]?.length).toBe(3)
    }
    expect(game.liveState?.cardsPerRound).toBe(3)
  })
})
